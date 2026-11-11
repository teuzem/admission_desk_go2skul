import type { FastifyInstance, FastifyRequest } from 'fastify'
import { randomInt } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { db } from '../db/index.js'
import {
  authChallenges,
  mfaFactors,
  profiles,
  refreshTokens,
  userBackupCodes,
  users,
  userSecurityKeys,
  userSecuritySettings,
} from '../db/schema/index.js'
import { decryptSecret, encryptSecret, sha256 } from '../lib/crypto.js'
import {
  consumeAuthChallenge,
  createAuthChallenge,
  failAuthChallenge,
  getMfaMethods,
  loadAuthChallenge,
  syncMfaState,
} from '../lib/mfa.js'
import { config } from '../config.js'
import { requireAuth } from '../plugins/auth.js'
import { audit, authError, issueSession } from './auth.js'

const origins = (config.WEBAUTHN_ORIGIN || config.APP_URL).split(',').map((value) => new URL(value.trim()).origin)
const rpID = config.WEBAUTHN_RP_ID || new URL(origins[0]).hostname
const strictLimit = { max: 5, timeWindow: '1 minute' }

function createTotp(email: string, secret: string) {
  return new OTPAuth.TOTP({
    issuer: config.WEBAUTHN_RP_NAME,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
}

function validateTotp(factor: typeof mfaFactors.$inferSelect, email: string, code: string) {
  try {
    const timestamp = Date.now()
    const delta = createTotp(email, decryptSecret(factor.secretEncrypted)).validate({
      token: code.replace(/\s/g, ''),
      timestamp,
      window: 1,
      afterCounter: factor.lastCounter,
    })
    if (delta === null) return null
    return { counter: Math.floor(timestamp / 30000) + delta }
  } catch {
    return null
  }
}

function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function generateRecoveryCodes(): string[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => {
    const raw = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('')
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
  })
}

async function revokeSessions(userId: string) {
  await db.update(refreshTokens).set({ revokedAt: new Date() })
    .where(sql`${refreshTokens.userId} = ${userId} AND ${refreshTokens.revokedAt} IS NULL`)
}

async function completeFactorUpdate(userId: string, req: FastifyRequest, wasEnabled: boolean) {
  await syncMfaState(userId)
  if (!wasEnabled) await revokeSessions(userId)
  return issueSession(userId, req, true)
}

export async function mfaRoutes(app: FastifyInstance) {
  app.get('/auth/v1/factors', { preHandler: requireAuth }, async (req) => {
    const factors = await db.select().from(mfaFactors).where(eq(mfaFactors.userId, req.auth!.id))
    return {
      factors: factors.map((factor) => ({
        id: factor.id,
        friendly_name: factor.friendlyName,
        factor_type: 'totp',
        status: factor.verifiedAt ? 'verified' : 'unverified',
        created_at: factor.createdAt.toISOString(),
        last_challenged_at: factor.lastUsedAt?.toISOString() ?? null,
      })),
      totp: factors.filter((factor) => factor.verifiedAt).map((factor) => ({ id: factor.id })),
    }
  })

  app.post('/auth/v1/factors', { preHandler: requireAuth, config: { rateLimit: strictLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { friendly_name?: string; factor_type?: string }
    if (body.factor_type && body.factor_type !== 'totp') return authError(reply, 400, 'Unsupported factor type', 'validation_failed')
    const secret = new OTPAuth.Secret({ size: 20 })
    const totp = new OTPAuth.TOTP({
      issuer: config.WEBAUTHN_RP_NAME,
      label: req.auth!.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })
    const [factor] = await db.insert(mfaFactors).values({
      userId: req.auth!.id,
      friendlyName: body.friendly_name?.slice(0, 80) || 'Authenticator app',
      secretEncrypted: encryptSecret(secret.base32),
    }).returning()
    const uri = totp.toString()
    return { id: factor.id, type: 'totp', totp: { qr_code: await QRCode.toDataURL(uri), secret: secret.base32, uri } }
  })

  app.post('/auth/v1/factors/:id/challenge', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [factor] = await db.select().from(mfaFactors)
      .where(sql`${mfaFactors.id} = ${id}::uuid AND ${mfaFactors.userId} = ${req.auth!.id}`).limit(1)
    if (!factor) return authError(reply, 404, 'Factor not found', 'mfa_factor_not_found')
    return { id: factor.id, challenge_id: factor.id, expires_at: Math.floor(Date.now() / 1000) + 300 }
  })

  app.post('/auth/v1/factors/:id/verify', { preHandler: requireAuth, config: { rateLimit: strictLimit } }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { code?: string }
    const [factor] = await db.select().from(mfaFactors)
      .where(sql`${mfaFactors.id} = ${id}::uuid AND ${mfaFactors.userId} = ${req.auth!.id}`).limit(1)
    if (!factor) return authError(reply, 404, 'Factor not found', 'mfa_factor_not_found')
    const result = validateTotp(factor, req.auth!.email, String(body.code ?? ''))
    if (!result) return authError(reply, 400, 'Invalid or already used verification code', 'mfa_verification_failed')
    const updated = await db.update(mfaFactors).set({
      verifiedAt: factor.verifiedAt ?? new Date(),
      lastUsedAt: new Date(),
      lastCounter: result.counter,
    }).where(sql`${mfaFactors.id} = ${factor.id} AND (${mfaFactors.lastCounter} IS NULL OR ${mfaFactors.lastCounter} < ${result.counter})`).returning({ id: mfaFactors.id })
    if (updated.length === 0) return authError(reply, 400, 'Verification code was already used', 'mfa_verification_failed')
    const session = await completeFactorUpdate(req.auth!.id, req, req.auth!.profile.isTwoFactorEnabled)
    await audit(req.auth!.id, factor.verifiedAt ? 'mfa_verified' : 'mfa_enrolled', req)
    return { ...session, factor_id: factor.id }
  })

  app.delete('/auth/v1/factors/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const deleted = await db.delete(mfaFactors)
      .where(sql`${mfaFactors.id} = ${id}::uuid AND ${mfaFactors.userId} = ${req.auth!.id}`).returning({ id: mfaFactors.id })
    if (deleted.length === 0) return authError(reply, 404, 'Factor not found', 'mfa_factor_not_found')
    await syncMfaState(req.auth!.id)
    await audit(req.auth!.id, 'mfa_unenrolled', req)
    return { id }
  })

  app.post('/auth/v1/mfa/verify', { config: { rateLimit: strictLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { mfa_ticket?: string; code?: string; factor_id?: string; method?: string }
    const challenge = await loadAuthChallenge(String(body.mfa_ticket ?? ''), ['mfa_login'])
    if (!challenge?.userId) return authError(reply, 400, 'Verification session is invalid or expired', 'mfa_challenge_expired')
    const method = body.method ?? 'totp'

    if (method === 'recovery') {
      const codeHash = sha256(normalizeRecoveryCode(String(body.code ?? '')))
      const [code] = await db.select().from(userBackupCodes).where(sql`
        ${userBackupCodes.userId} = ${challenge.userId}::uuid
        AND ${userBackupCodes.codeHash} = ${codeHash}
        AND ${userBackupCodes.isUsed} = false
      `).limit(1)
      if (!code) {
        await failAuthChallenge(challenge)
        return authError(reply, 400, 'Invalid or already used recovery code', 'mfa_verification_failed')
      }
      if (!(await consumeAuthChallenge(challenge))) return authError(reply, 400, 'Verification session is invalid or expired', 'mfa_challenge_expired')
      const consumed = await db.update(userBackupCodes).set({ isUsed: true, usedAt: new Date() })
        .where(sql`${userBackupCodes.id} = ${code.id} AND ${userBackupCodes.isUsed} = false`).returning({ id: userBackupCodes.id })
      if (consumed.length === 0) return authError(reply, 400, 'Recovery code was already used', 'mfa_verification_failed')
      await audit(challenge.userId, 'login_recovery_code', req)
      return { ...(await issueSession(challenge.userId, req, true)), method: 'recovery' }
    }

    if (method !== 'totp') return authError(reply, 400, 'Unsupported verification method', 'validation_failed')
    const factorId = body.factor_id ?? (await getMfaMethods(challenge.userId)).totp[0]?.id
    if (!factorId) return authError(reply, 400, 'No authenticator app is registered', 'mfa_factor_not_found')
    const [factor] = await db.select().from(mfaFactors).where(sql`
      ${mfaFactors.id} = ${factorId}::uuid AND ${mfaFactors.userId} = ${challenge.userId} AND ${mfaFactors.verifiedAt} IS NOT NULL
    `).limit(1)
    const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1)
    const result = factor && user ? validateTotp(factor, user.email, String(body.code ?? '')) : null
    if (!result) {
      await failAuthChallenge(challenge)
      return authError(reply, 400, 'Invalid or already used verification code', 'mfa_verification_failed')
    }
    if (!(await consumeAuthChallenge(challenge))) return authError(reply, 400, 'Verification session is invalid or expired', 'mfa_challenge_expired')
    const updated = await db.update(mfaFactors).set({ lastUsedAt: new Date(), lastCounter: result.counter })
      .where(sql`${mfaFactors.id} = ${factor.id} AND (${mfaFactors.lastCounter} IS NULL OR ${mfaFactors.lastCounter} < ${result.counter})`)
      .returning({ id: mfaFactors.id })
    if (updated.length === 0) return authError(reply, 400, 'Verification code was already used', 'mfa_verification_failed')
    await audit(challenge.userId, 'login_totp', req)
    return { ...(await issueSession(challenge.userId, req, true)), method: 'totp' }
  })

  app.get('/auth/v1/mfa/recovery-codes', { preHandler: requireAuth }, async (req) => {
    const [settings] = await db.select().from(userSecuritySettings).where(eq(userSecuritySettings.userId, req.auth!.id)).limit(1)
    const remaining = await db.select({ id: userBackupCodes.id }).from(userBackupCodes)
      .where(sql`${userBackupCodes.userId} = ${req.auth!.id} AND ${userBackupCodes.isUsed} = false`)
    return { generated_at: settings?.backupCodesGeneratedAt?.toISOString() ?? null, remaining: remaining.length }
  })

  app.post('/auth/v1/mfa/recovery-codes', { preHandler: requireAuth, config: { rateLimit: strictLimit } }, async (req) => {
    const codes = generateRecoveryCodes()
    const generatedAt = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, req.auth!.id))
      await tx.insert(userBackupCodes).values(codes.map((code) => ({ userId: req.auth!.id, codeHash: sha256(normalizeRecoveryCode(code)) })))
      await tx.insert(userSecuritySettings).values({ userId: req.auth!.id, backupCodesGeneratedAt: generatedAt })
        .onConflictDoUpdate({ target: userSecuritySettings.userId, set: { backupCodesGeneratedAt: generatedAt } })
    })
    await audit(req.auth!.id, 'backup_codes_generated', req)
    return { codes, generated_at: generatedAt.toISOString(), remaining: codes.length }
  })

  app.get('/auth/v1/passkeys', { preHandler: requireAuth }, async (req) => {
    const keys = await db.select().from(userSecurityKeys).where(eq(userSecurityKeys.userId, req.auth!.id))
    return keys.map((key) => ({
      id: key.id,
      key_name: key.keyName,
      device_type: key.deviceType,
      backed_up: key.backedUp,
      created_at: key.createdAt.toISOString(),
      last_used_at: key.lastUsedAt?.toISOString() ?? null,
    }))
  })

  app.post('/auth/v1/passkeys/register/options', { preHandler: requireAuth, config: { rateLimit: strictLimit } }, async (req) => {
    const keys = await db.select().from(userSecurityKeys).where(eq(userSecurityKeys.userId, req.auth!.id))
    const name = [req.auth!.profile.firstName, req.auth!.profile.lastName].filter(Boolean).join(' ') || req.auth!.email
    const options = await generateRegistrationOptions({
      rpName: config.WEBAUTHN_RP_NAME,
      rpID,
      userName: req.auth!.email,
      userDisplayName: name,
      userID: new TextEncoder().encode(req.auth!.id),
      attestationType: 'none',
      excludeCredentials: keys.map((key) => ({ id: key.credentialId, transports: key.transports })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: 60000,
    })
    const challenge = await createAuthChallenge(req.auth!.id, 'webauthn_register', options.challenge)
    return { ...options, challenge_ticket: challenge.ticket }
  })

  app.post('/auth/v1/passkeys/register/verify', { preHandler: requireAuth, config: { rateLimit: strictLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { challenge_ticket?: string; response?: RegistrationResponseJSON; key_name?: string }
    const challenge = await loadAuthChallenge(String(body.challenge_ticket ?? ''), ['webauthn_register'])
    if (!challenge?.challenge || challenge.userId !== req.auth!.id || !body.response) {
      return authError(reply, 400, 'Passkey registration is invalid or expired', 'webauthn_challenge_expired')
    }
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        requireUserVerification: true,
      })
    } catch {
      await failAuthChallenge(challenge)
      return authError(reply, 400, 'Passkey registration could not be verified', 'webauthn_verification_failed')
    }
    if (!verification.verified || !verification.registrationInfo) return authError(reply, 400, 'Passkey registration could not be verified', 'webauthn_verification_failed')
    const info = verification.registrationInfo
    if (!(await consumeAuthChallenge(challenge))) return authError(reply, 400, 'Passkey registration is invalid or expired', 'webauthn_challenge_expired')
    const [key] = await db.insert(userSecurityKeys).values({
      userId: req.auth!.id,
      keyName: body.key_name?.trim().slice(0, 80) || 'My passkey',
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
      counter: info.credential.counter,
      transports: info.credential.transports ?? [],
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
    }).returning()
    const session = await completeFactorUpdate(req.auth!.id, req, req.auth!.profile.isTwoFactorEnabled)
    await audit(req.auth!.id, 'passkey_registered', req, { credential_id: key.credentialId })
    return {
      key: { id: key.id, key_name: key.keyName, created_at: key.createdAt.toISOString() },
      session,
    }
  })

  app.delete('/auth/v1/passkeys/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const deleted = await db.delete(userSecurityKeys)
      .where(sql`${userSecurityKeys.id} = ${id}::uuid AND ${userSecurityKeys.userId} = ${req.auth!.id}`).returning({ id: userSecurityKeys.id })
    if (deleted.length === 0) return authError(reply, 404, 'Passkey not found', 'passkey_not_found')
    await syncMfaState(req.auth!.id)
    await audit(req.auth!.id, 'passkey_removed', req)
    return { id }
  })

  app.post('/auth/v1/passkeys/authenticate/options', { config: { rateLimit: strictLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { mfa_ticket?: string }
    const mfaChallenge = body.mfa_ticket ? await loadAuthChallenge(body.mfa_ticket, ['mfa_login']) : null
    if (body.mfa_ticket && !mfaChallenge?.userId) return authError(reply, 400, 'Verification session is invalid or expired', 'mfa_challenge_expired')
    const keys = mfaChallenge?.userId
      ? await db.select().from(userSecurityKeys).where(eq(userSecurityKeys.userId, mfaChallenge.userId))
      : []
    if (mfaChallenge && keys.length === 0) return authError(reply, 400, 'No passkey is registered for this account', 'passkey_not_found')
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: mfaChallenge ? keys.map((key) => ({ id: key.credentialId, transports: key.transports })) : undefined,
      userVerification: 'required',
      timeout: 60000,
    })
    if (mfaChallenge) {
      await db.update(authChallenges).set({ challenge: options.challenge }).where(eq(authChallenges.id, mfaChallenge.id))
      return { ...options, challenge_ticket: String(body.mfa_ticket) }
    }
    const challenge = await createAuthChallenge(null, 'passkey_login', options.challenge)
    return { ...options, challenge_ticket: challenge.ticket }
  })

  app.post('/auth/v1/passkeys/authenticate/verify', { config: { rateLimit: strictLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { challenge_ticket?: string; response?: AuthenticationResponseJSON }
    const challenge = await loadAuthChallenge(String(body.challenge_ticket ?? ''), ['mfa_login', 'passkey_login'])
    if (!challenge?.challenge || !body.response?.id) return authError(reply, 400, 'Passkey authentication is invalid or expired', 'webauthn_challenge_expired')
    const [key] = await db.select().from(userSecurityKeys).where(eq(userSecurityKeys.credentialId, body.response.id)).limit(1)
    if (!key || (challenge.userId && key.userId !== challenge.userId)) {
      await failAuthChallenge(challenge)
      return authError(reply, 400, 'Passkey authentication failed', 'webauthn_verification_failed')
    }
    const [user] = await db.select().from(users).where(eq(users.id, key.userId)).limit(1)
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, key.userId)).limit(1)
    if (!user?.emailVerifiedAt || !profile?.isActive) return authError(reply, 403, 'Account is not available', 'user_banned')
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        credential: {
          id: key.credentialId,
          publicKey: Buffer.from(key.publicKey, 'base64url'),
          counter: key.counter,
          transports: key.transports,
        },
        requireUserVerification: true,
      })
    } catch {
      await failAuthChallenge(challenge)
      return authError(reply, 400, 'Passkey authentication failed', 'webauthn_verification_failed')
    }
    if (!verification.verified) {
      await failAuthChallenge(challenge)
      return authError(reply, 400, 'Passkey authentication failed', 'webauthn_verification_failed')
    }
    if (!(await consumeAuthChallenge(challenge))) return authError(reply, 400, 'Passkey authentication is invalid or expired', 'webauthn_challenge_expired')
    await db.update(userSecurityKeys).set({
      counter: verification.authenticationInfo.newCounter,
      deviceType: verification.authenticationInfo.credentialDeviceType,
      backedUp: verification.authenticationInfo.credentialBackedUp,
      lastUsedAt: new Date(),
    }).where(eq(userSecurityKeys.id, key.id))
    await audit(key.userId, challenge.purpose === 'mfa_login' ? 'login_passkey_mfa' : 'login_passkey', req)
    return { ...(await issueSession(key.userId, req, true)), method: 'passkey' }
  })
}
