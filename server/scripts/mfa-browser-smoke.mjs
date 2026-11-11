import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { chromium } from 'playwright'
import pg from 'pg'
import argon2 from 'argon2'
import * as OTPAuth from 'otpauth'

const origin = 'http://localhost:5173'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Only run against a local test database')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let passed = 0
const users = []
const errors = []
function check(name, value) {
  assert(value, name)
  console.log(`PASS ${name}`)
  passed++
}
async function result(page, path, action, method = 'POST') {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === method)
  await action()
  const r = await response
  const body = await r.json()
  assert(r.ok(), `${method} ${path}: ${r.status()} ${body.code || body.message || ''}`)
  return body
}
async function session(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('admission-desk-auth') || 'null'))
}
async function logout(page, loginPath) {
  await page.evaluate(async () => { const { supabase } = await import('/src/lib/supabase.ts'); await supabase.auth.signOut() })
  await page.goto(origin + loginPath)
}
async function login(page, account, loginPath) {
  await page.goto(origin + loginPath)
  await page.locator('input[name="email"]').fill(account.email)
  await page.locator('input[name="password"]').fill(account.password)
  return result(page, '/auth/v1/token', () => page.locator('button[type="submit"]').click())
}
async function profile(page, admin) {
  await page.goto(origin + (admin ? '/admin/profile' : '/dashboard/profile'))
  await page.getByRole('button', { name: admin ? 'Security & Privacy' : 'Account Security', exact: true }).click()
}

try {
  for (const role of ['admin', 'agent'].filter(role => !process.argv[2] || process.argv[2] === role)) {
    const admin = role === 'admin'
    const account = { id: randomUUID(), email: `browser-${role}-${randomUUID()}@example.com`, password: 'Browser-Mfa-2026!-Strong' }
    users.push(account.id)
    await pool.query('INSERT INTO users (id, email, password_hash, email_verified_at) VALUES ($1, $2, $3, now())', [account.id, account.email, await argon2.hash(account.password, { type: argon2.argon2id })])
    await pool.query("INSERT INTO profiles (id, email, first_name, last_name, role, kyc_status) VALUES ($1, $2, 'Browser', 'Smoke', $3, 'approved')", [account.id, account.email, role])
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    page.on('pageerror', error => errors.push(`${role}: ${error.message}`))
    const cdp = await context.newCDPSession(page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } })
    const loginPath = admin ? '/admin/login' : '/login'
    const signedIn = await login(page, account, loginPath)
    check(`${role}: password login without enrolled MFA`, Boolean(signedIn.access_token))
    await page.waitForURL(admin ? '**/admin' : '**/dashboard')
    await profile(page, admin)

    if (admin) await page.getByRole('button', { name: 'Add Key', exact: true }).click()
    await page.locator(admin ? '#security-key-name' : '#agent-passkey-name').fill('Browser passkey')
    const registered = await result(page, '/auth/v1/passkeys/register/verify', () => page.getByRole('button', { name: admin ? 'Register New Passkey' : 'Add a passkey', exact: true }).click())
    check(`${role}: real WebAuthn registration yields verified session`, registered.session?.mfa_verified === true)
    const key = await pool.query('SELECT public_key, credential_id FROM user_security_keys WHERE user_id = $1', [account.id])
    check(`${role}: cryptographic credential stored`, key.rows.length === 1 && key.rows[0].public_key.length > 40 && !key.rows[0].credential_id.startsWith('simulated_'))
    if (admin) await page.getByRole('heading', { name: 'Security Keys', exact: true }).locator('..').locator('..').getByRole('button').click()

    const enrollment = await result(page, '/auth/v1/factors', () => page.getByRole('button', { name: admin ? 'Setup' : 'Enable 2FA', exact: true }).click())
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(enrollment.totp.secret), digits: 6, period: 30, algorithm: 'SHA1' })
    await page.getByRole('button', { name: admin ? 'Next Step' : /^Next/ }).click()
    const code = totp.generate()
    for (let i = 0; i < 6; i++) await page.locator(admin ? '.otp-field' : '.fb-otp-input').nth(i).fill(code[i])
    const verified = await result(page, `/auth/v1/factors/${enrollment.id}/verify`, () => page.getByRole('button', { name: admin ? 'Complete Setup' : 'Verify & Enable', exact: true }).click())
    check(`${role}: TOTP enrollment from profile`, verified.mfa_verified === true)
    if (!admin) await page.getByRole('button', { name: 'Done', exact: true }).click()
    const recovery = await result(page, '/auth/v1/mfa/recovery-codes', () => page.getByRole('button', { name: admin ? 'Generate' : 'Generate recovery codes', exact: true }).click())
    check(`${role}: recovery generation from profile`, recovery.codes.length === 10)
    await profile(page, admin)
    await page.getByRole('button', { name: admin ? 'Disable' : 'Disable 2FA', exact: true }).waitFor()
    check(`${role}: TOTP enabled state survives navigation`, true)
    const passwords = page.locator('input[type="password"]')
    const nextPassword = 'Browser-Mfa-2026!-Changed'
    await passwords.nth(0).fill(account.password)
    await passwords.nth(1).fill(nextPassword)
    if (!admin) await passwords.nth(2).fill(nextPassword)
    const changed = await result(page, '/auth/v1/user', () => page.getByRole('button', { name: 'Update Password', exact: true }).click(), 'PUT')
    check(`${role}: password change preserves MFA session`, changed.session?.mfa_verified === true)
    account.password = nextPassword
    await page.screenshot({ path: `scripts/${role}-security-smoke.png`, fullPage: true })

    await logout(page, loginPath)
    const challenge = await login(page, account, loginPath)
    await page.locator('#mfa-code').waitFor()
    check(`${role}: MFA checkpoint does not create session`, challenge.mfa_required === true && !await session(page))
    await page.setViewportSize({ width: 390, height: 844 })
    check(`${role}: MFA checkpoint fits mobile viewport`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `scripts/${role}-mfa-mobile-smoke.png`, fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('#mfa-code').fill('000000')
    const invalidResponse = page.waitForResponse(r => r.url().endsWith('/auth/v1/mfa/verify'))
    await page.getByRole('button', { name: 'Verify and continue' }).click()
    check(`${role}: invalid TOTP stays at checkpoint`, (await invalidResponse).status() === 400 && !await session(page))
    await page.locator('.mfa-error').waitFor()
    await page.locator('#mfa-code').fill(totp.generate({ timestamp: Date.now() + 30000 }))
    const authenticated = await result(page, '/auth/v1/mfa/verify', () => page.getByRole('button', { name: 'Verify and continue' }).click())
    check(`${role}: TOTP login completes in browser`, authenticated.mfa_verified === true)
    await page.waitForURL(admin ? '**/admin' : '**/dashboard')

    await logout(page, loginPath)
    await login(page, account, loginPath)
    await page.getByRole('tab', { name: 'Recovery code', exact: true }).click()
    await page.locator('#recovery-code').fill(recovery.codes[0])
    const recovered = await result(page, '/auth/v1/mfa/verify', () => page.getByRole('button', { name: 'Use recovery code', exact: true }).click())
    check(`${role}: recovery code login in browser`, recovered.mfa_verified === true)
    await page.waitForURL(admin ? '**/admin' : '**/dashboard')

    await logout(page, loginPath)
    await login(page, account, loginPath)
    await page.getByRole('tab', { name: 'Passkey', exact: true }).click()
    const passkeyMfa = await result(page, '/auth/v1/passkeys/authenticate/verify', () => page.getByRole('button', { name: 'Authenticate with passkey' }).click())
    check(`${role}: passkey as second factor`, passkeyMfa.mfa_verified === true)
    await page.waitForURL(admin ? '**/admin' : '**/dashboard')
    await logout(page, loginPath)
    const passwordless = await result(page, '/auth/v1/passkeys/authenticate/verify', () => page.getByRole('button', { name: /Continue with a passkey/ }).click())
    check(`${role}: passwordless passkey login`, passwordless.mfa_verified === true)
    await page.waitForURL(admin ? '**/admin' : '**/dashboard')

    await logout(page, loginPath)
    const token = randomUUID()
    await pool.query("INSERT INTO email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1, $2, 'reset_password', now() + interval '5 minutes')", [account.id, createHash('sha256').update(token).digest('hex')])
    await page.goto(`${origin}/auth/reset-password?token_hash=${token}&type=recovery`)
    await page.locator('#mfa-code').waitFor()
    check(`${role}: email recovery requires MFA before password form`, !await session(page) && await page.locator('input[name="password"]').count() === 0)
    await page.getByRole('tab', { name: 'Recovery code', exact: true }).click()
    await page.locator('#recovery-code').fill(recovery.codes[1])
    await result(page, '/auth/v1/mfa/verify', () => page.getByRole('button', { name: 'Use recovery code', exact: true }).click())
    await page.locator('input[name="password"]').waitFor()
    check(`${role}: MFA opens recovery password form`, true)
    await profile(page, admin)
    if (admin) await page.getByRole('button', { name: 'Manage', exact: true }).click()
    await result(page, `/auth/v1/passkeys/${registered.key.id}`, () => page.getByRole('button', { name: 'Remove Browser passkey', exact: true }).click(), 'DELETE')
    if (admin) await page.getByRole('heading', { name: 'Security Keys', exact: true }).locator('..').locator('..').getByRole('button').click()
    await result(page, `/auth/v1/factors/${enrollment.id}`, () => page.getByRole('button', { name: admin ? 'Disable' : 'Disable 2FA', exact: true }).click(), 'DELETE')
    const finalState = await pool.query('SELECT is_two_factor_enabled FROM profiles WHERE id = $1', [account.id])
    check(`${role}: removing factors synchronizes MFA state`, finalState.rows[0].is_two_factor_enabled === false)
    await context.close()
  }
  check('no uncaught browser exceptions', errors.length === 0)
  console.log(`Browser MFA: ${passed} passed`)
} catch (error) {
  console.error(error.message)
  if (errors.length) console.error(errors)
  process.exitCode = 1
} finally {
  await browser.close()
  for (const id of users) await pool.query('DELETE FROM users WHERE id = $1', [id])
  await pool.end()
}
