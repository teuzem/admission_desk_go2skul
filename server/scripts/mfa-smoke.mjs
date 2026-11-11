import 'dotenv/config'
import pg from 'pg'
import * as OTPAuth from 'otpauth'

const base = 'http://127.0.0.1:4000'
const email = `mfa-${Date.now()}@example.com`
let password = 'Mfa-Smoke-2026!-Strong'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) { passed++; console.log(`PASS ${name}`) }
  else { failed++; console.log(`FAIL ${name}`, detail) }
}

async function request(path, { method = 'POST', body, token } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

async function passwordLogin() {
  return request('/auth/v1/token?grant_type=password', { body: { email, password } })
}

try {
  const signup = await request('/auth/v1/signup', { body: { email, password } })
  const userId = signup.body?.user?.id
  check('create isolated MFA user', Boolean(userId))
  if (!userId) throw new Error('Cannot continue without test user')
  await pool.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [userId])

  const initial = await passwordLogin()
  check('password-only account receives session', initial.status === 200 && Boolean(initial.body?.access_token))

  const enrollment = await request('/auth/v1/factors', { token: initial.body.access_token, body: { factor_type: 'totp', friendly_name: 'Smoke authenticator' } })
  const secret = enrollment.body?.totp?.secret
  check('TOTP enrollment returns otpauth secret and QR', enrollment.status === 200 && Boolean(secret) && enrollment.body.totp.qr_code.startsWith('data:image/png'))
  const totp = new OTPAuth.TOTP({ issuer: 'Admission Desk', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) })
  const factorId = enrollment.body.id
  await request(`/auth/v1/factors/${factorId}/challenge`, { token: initial.body.access_token, body: {} })
  const enrolled = await request(`/auth/v1/factors/${factorId}/verify`, { token: initial.body.access_token, body: { code: totp.generate() } })
  check('TOTP enrollment verified', enrolled.status === 200 && enrolled.body?.mfa_verified === true)
  const validUser = await request('/auth/v1/user', { method: 'GET', token: enrolled.body.access_token })
  check('MFA-verified access token accepted', validUser.status === 200)

  const recovery = await request('/auth/v1/mfa/recovery-codes', { token: enrolled.body.access_token, body: {} })
  const recoveryCode = recovery.body?.codes?.[0]
  check('recovery codes generated server-side', recovery.status === 200 && recovery.body.codes.length === 10 && /^\w{4}-\w{4}-\w{4}$/.test(recoveryCode))
  const storedCodes = await pool.query('SELECT code_hash FROM user_backup_codes WHERE user_id = $1', [userId])
  check('recovery codes stored only as hashes', storedCodes.rows.length === 10 && storedCodes.rows.every((row) => /^[0-9a-f]{64}$/.test(row.code_hash) && !row.code_hash.includes(recoveryCode)))

  const challenged = await passwordLogin()
  check('password alone cannot create MFA session', challenged.status === 200 && challenged.body?.mfa_required === true && !challenged.body.access_token && !challenged.body.refresh_token)
  const nextCode = totp.generate({ timestamp: Date.now() + 30000 })
  const verified = await request('/auth/v1/mfa/verify', { body: { mfa_ticket: challenged.body.mfa_ticket, factor_id: factorId, method: 'totp', code: nextCode } })
  check('TOTP login challenge creates AAL2 session', verified.status === 200 && verified.body?.mfa_verified === true)
  const replayTicket = await request('/auth/v1/mfa/verify', { body: { mfa_ticket: challenged.body.mfa_ticket, factor_id: factorId, method: 'totp', code: nextCode } })
  check('MFA ticket cannot be replayed', replayTicket.status >= 400)

  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: verified.body.refresh_token } })
  check('refresh preserves MFA verification', refreshed.status === 200 && refreshed.body?.mfa_verified === true)
  const refreshedUser = await request('/auth/v1/user', { method: 'GET', token: refreshed.body.access_token })
  check('refreshed MFA token remains authorized', refreshedUser.status === 200)

  const wrongCurrentPassword = await request('/auth/v1/user', {
    method: 'PUT',
    token: refreshed.body.access_token,
    body: { password: 'Mfa-Smoke-2026!-Renewed', current_password: 'incorrect-current-password' },
  })
  check('password change rejects an incorrect current password', wrongCurrentPassword.status === 400)

  const renewedPassword = 'Mfa-Smoke-2026!-Renewed'
  const passwordChange = await request('/auth/v1/user', {
    method: 'PUT',
    token: refreshed.body.access_token,
    body: { password: renewedPassword, current_password: password },
  })
  check('password change renews an MFA-verified session', passwordChange.status === 200 && passwordChange.body?.session?.mfa_verified === true && Boolean(passwordChange.body?.session?.access_token))
  const renewedUser = await request('/auth/v1/user', { method: 'GET', token: passwordChange.body?.session?.access_token })
  check('renewed password session remains authorized', renewedUser.status === 200)
  const revokedRefresh = await request('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: refreshed.body.refresh_token } })
  check('password change revokes previous refresh tokens', revokedRefresh.status >= 400)
  const oldPasswordLogin = await request('/auth/v1/token?grant_type=password', { body: { email, password } })
  check('previous password no longer works', oldPasswordLogin.status === 400)
  password = renewedPassword

  const recoveryChallenge = await passwordLogin()
  const recoveryLogin = await request('/auth/v1/mfa/verify', { body: { mfa_ticket: recoveryChallenge.body.mfa_ticket, method: 'recovery', code: recoveryCode } })
  check('recovery code completes login', recoveryLogin.status === 200 && recoveryLogin.body?.mfa_verified === true)
  const recoveryChallenge2 = await passwordLogin()
  const recoveryReplay = await request('/auth/v1/mfa/verify', { body: { mfa_ticket: recoveryChallenge2.body.mfa_ticket, method: 'recovery', code: recoveryCode } })
  check('recovery code is single-use', recoveryReplay.status >= 400)

  console.log(`\nMFA smoke: ${passed} passed, ${failed} failed`)
  if (failed) process.exitCode = 1
} finally {
  await pool.query('DELETE FROM users WHERE email = $1', [email])
  await pool.end()
}
