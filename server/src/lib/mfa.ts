import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { authChallenges, mfaFactors, profiles, userBackupCodes, userSecurityKeys, userSecuritySettings } from '../db/schema/index.js'
import { randomToken, sha256 } from './crypto.js'

export type AuthChallengePurpose = 'mfa_login' | 'passkey_login' | 'webauthn_register'
export type AuthChallenge = typeof authChallenges.$inferSelect

export async function getMfaMethods(userId: string) {
  const [factors, passkeys, recoveryCodes] = await Promise.all([
    db.select().from(mfaFactors).where(sql`${mfaFactors.userId} = ${userId} AND ${mfaFactors.verifiedAt} IS NOT NULL`),
    db.select().from(userSecurityKeys).where(eq(userSecurityKeys.userId, userId)),
    db.select({ id: userBackupCodes.id }).from(userBackupCodes)
      .where(sql`${userBackupCodes.userId} = ${userId} AND ${userBackupCodes.isUsed} = false`).limit(1),
  ])
  return {
    totp: factors.map((factor) => ({ id: factor.id, friendly_name: factor.friendlyName ?? 'Authenticator app' })),
    passkey: passkeys.length > 0,
    recovery: recoveryCodes.length > 0,
  }
}

export async function syncMfaState(userId: string) {
  const methods = await getMfaMethods(userId)
  const enabled = methods.totp.length > 0 || methods.passkey
  await db.update(profiles).set({ isTwoFactorEnabled: enabled }).where(eq(profiles.id, userId))
  await db.insert(userSecuritySettings).values({ userId, securityKeysEnabled: methods.passkey })
    .onConflictDoUpdate({ target: userSecuritySettings.userId, set: { securityKeysEnabled: methods.passkey } })
  return methods
}

export async function createAuthChallenge(userId: string | null, purpose: AuthChallengePurpose, challenge?: string) {
  const ticket = randomToken(32)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  await db.insert(authChallenges).values({
    userId,
    tokenHash: sha256(ticket),
    purpose,
    challenge: challenge ?? null,
    expiresAt,
  })
  return { ticket, expiresAt }
}

export async function loadAuthChallenge(ticket: string, purposes: AuthChallengePurpose[]): Promise<AuthChallenge | null> {
  if (!ticket || purposes.length === 0) return null
  const [challenge] = await db.select().from(authChallenges).where(sql`
    ${authChallenges.tokenHash} = ${sha256(ticket)}
    AND ${authChallenges.purpose} IN (${sql.join(purposes.map((purpose) => sql`${purpose}`), sql`, `)})
  `).limit(1)
  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5) return null
  return challenge
}

export async function failAuthChallenge(challenge: AuthChallenge) {
  const attempts = challenge.attempts + 1
  await db.update(authChallenges).set({
    attempts,
    usedAt: attempts >= 5 ? new Date() : null,
  }).where(eq(authChallenges.id, challenge.id))
}

export async function consumeAuthChallenge(challenge: AuthChallenge): Promise<boolean> {
  const consumed = await db.update(authChallenges).set({ usedAt: new Date() })
    .where(sql`${authChallenges.id} = ${challenge.id} AND ${authChallenges.usedAt} IS NULL AND ${authChallenges.expiresAt} > now()`)
    .returning({ id: authChallenges.id })
  return consumed.length === 1
}
