import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, profiles, refreshTokens, emailTokens, userSecuritySettings, teamMembers, adminUserInvites, securityAuditLog } from '../db/schema/index.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { randomToken, sha256 } from '../lib/crypto.js'
import { createAuthChallenge, getMfaMethods } from '../lib/mfa.js'
import { signAccessToken } from '../lib/tokens.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js'
import { config } from '../config.js'
import { requireAuth } from '../plugins/auth.js'

const emailSchema = z.string().email().max(254).transform((v) => v.toLowerCase())
const passwordSchema = z.string().min(8).max(128)

export function authError(reply: FastifyReply, status: number, message: string, code = 'auth_error') {
  return reply.code(status).send({ error: code, message, error_description: message, msg: message, code })
}

async function buildUserPayload(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  if (!user) return null
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: user.emailVerifiedAt?.toISOString() ?? null,
    phone: '',
    confirmed_at: user.emailVerifiedAt?.toISOString() ?? null,
    last_sign_in_at: user.lastLoginAt?.toISOString() ?? null,
    app_metadata: { provider: 'email', providers: ['email'], role: profile?.role ?? 'agent' },
    user_metadata: {
      first_name: profile?.firstName ?? null,
      last_name: profile?.lastName ?? null,
      parent_agency_id: profile?.parentAgencyId ?? null,
    },
    identities: [],
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
    is_anonymous: false,
  }
}

export async function issueSession(userId: string, req: FastifyRequest, mfaVerified = false) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  const accessToken = await signAccessToken({
    sub: userId,
    role: profile?.role ?? 'agent',
    email: profile?.email ?? '',
    mfaVerified,
  })
  const refreshToken = randomToken()
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000)
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: sha256(refreshToken),
    familyId: crypto.randomUUID(),
    mfaVerified,
    expiresAt,
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
    ipAddress: req.ip,
  })
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId))
  const user = await buildUserPayload(userId)
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: config.ACCESS_TOKEN_TTL_SECONDS,
    expires_at: Math.floor(Date.now() / 1000) + config.ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    mfa_verified: mfaVerified,
    user,
  }
}

async function loginWithMfa(userId: string, req: FastifyRequest) {
  const methods = await getMfaMethods(userId)
  if (methods.totp.length === 0 && !methods.passkey) return issueSession(userId, req)
  const challenge = await createAuthChallenge(userId, 'mfa_login')
  return {
    user: null,
    session: null,
    mfa_required: true,
    mfa_factor_id: methods.totp[0]?.id ?? null,
    mfa_ticket: challenge.ticket,
    mfa_expires_at: Math.floor(challenge.expiresAt.getTime() / 1000),
    mfa_methods: methods,
  }
}

export async function audit(userId: string, action: string, req: FastifyRequest, metadata: Record<string, unknown> = {}) {
  await db.insert(securityAuditLog).values({
    userId,
    action,
    ipAddress: req.ip,
    deviceInfo: String(req.headers['user-agent'] ?? '').slice(0, 500),
    metadata,
  }).catch(() => {})
}

async function createEmailToken(userId: string, purpose: 'verify_email' | 'reset_password', ttlMs: number): Promise<string> {
  const token = randomToken(32)
  await db.insert(emailTokens).values({ userId, tokenHash: sha256(token), purpose, expiresAt: new Date(Date.now() + ttlMs) })
  return token
}

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  data: z.record(z.unknown()).optional(),
  options: z.object({ data: z.record(z.unknown()).optional(), emailRedirectTo: z.string().optional() }).optional(),
})

export async function authRoutes(app: FastifyInstance) {
  const authLimit = { max: 10, timeWindow: '1 minute' }
  const strictLimit = { max: 5, timeWindow: '1 minute' }

  app.post('/auth/v1/signup', { config: { rateLimit: strictLimit } }, async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) return authError(reply, 400, 'Invalid email or password (min 8 characters)', 'validation_failed')
    const { email, password } = parsed.data
    const metadata = { ...(parsed.data.data ?? {}), ...(parsed.data.options?.data ?? {}) }

    const [existing] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
    if (existing) return authError(reply, 422, 'User already registered', 'user_already_exists')

    const passwordHash = await hashPassword(password)
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email, passwordHash }).returning()
      let role: 'agent' | 'editor' = 'agent'
      let parentAgencyId: string | null = null
      if (metadata.role === 'editor') {
        // Editor accounts are only valid with a matching agency invitation
        const [invite] = await tx
          .select()
          .from(teamMembers)
          .where(sql`lower(${teamMembers.invitedEmail}) = ${email} AND ${teamMembers.status} IN ('pending', 'active')`)
          .limit(1)
        if (invite) {
          role = 'editor'
          parentAgencyId = invite.agencyId
        }
      }
      const [profile] = await tx.insert(profiles).values({
        id: user.id,
        email,
        role,
        parentAgencyId,
        firstName: typeof metadata.first_name === 'string' ? metadata.first_name : null,
        lastName: typeof metadata.last_name === 'string' ? metadata.last_name : null,
        kycStatus: 'pending',
      }).returning()
      await tx.insert(userSecuritySettings).values({ userId: user.id })
      return { user, profile }
    })

    const token = await createEmailToken(result.user.id, 'verify_email', 86400000)
    await sendVerificationEmail(email, token).catch((err) => req.log.error(err, 'verification email failed'))
    reply.code(200)
    return { user: await buildUserPayload(result.user.id), session: null }
  })

  app.post('/auth/v1/token', { config: { rateLimit: authLimit } }, async (req, reply) => {
    const query = req.query as { grant_type?: string }
    const body = (req.body ?? {}) as Record<string, unknown>

    if (query.grant_type === 'refresh_token') {
      const presented = String(body.refresh_token ?? '')
      if (!presented) return authError(reply, 400, 'refresh_token required', 'validation_failed')
      const hash = sha256(presented)
      const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1)
      if (!stored || stored.expiresAt < new Date()) return authError(reply, 400, 'Invalid refresh token', 'refresh_token_not_found')
      if (stored.revokedAt) {
        // Reuse detected — revoke the entire token family
        await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.familyId, stored.familyId))
        await audit(stored.userId, 'refresh_token_reuse_detected', req)
        return authError(reply, 400, 'Refresh token reuse detected — all sessions revoked', 'refresh_token_reused')
      }
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, stored.userId)).limit(1)
      if (!profile?.isActive) return authError(reply, 403, 'Account is deactivated', 'user_banned')
      const newRefresh = randomToken()
      await db.transaction(async (tx) => {
        await tx.update(refreshTokens).set({ revokedAt: new Date(), replacedByHash: sha256(newRefresh) }).where(eq(refreshTokens.id, stored.id))
        await tx.insert(refreshTokens).values({
          userId: stored.userId,
          tokenHash: sha256(newRefresh),
          familyId: stored.familyId,
          mfaVerified: stored.mfaVerified,
          expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000),
          userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
          ipAddress: req.ip,
        })
      })
      if (profile.isTwoFactorEnabled && !stored.mfaVerified) {
        await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.familyId, stored.familyId))
        return authError(reply, 403, 'Multi-factor authentication required', 'mfa_required')
      }
      const accessToken = await signAccessToken({ sub: stored.userId, role: profile.role, email: profile.email, mfaVerified: stored.mfaVerified })
      return {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: config.ACCESS_TOKEN_TTL_SECONDS,
        expires_at: Math.floor(Date.now() / 1000) + config.ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: newRefresh,
        mfa_verified: stored.mfaVerified,
        user: await buildUserPayload(stored.userId),
      }
    }

    // password grant
    const email = emailSchema.safeParse(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email.success || !password) return authError(reply, 400, 'Email and password required', 'validation_failed')
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.data}`).limit(1)
    if (!user) return authError(reply, 400, 'Invalid login credentials', 'invalid_credentials')
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return authError(reply, 423, 'Account temporarily locked due to failed attempts. Try again later.', 'account_locked')
    }
    const valid = await verifyPassword(user.passwordHash, password).catch(() => false)
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1
      await db.update(users).set({
        failedLoginAttempts: attempts,
        lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null,
      }).where(eq(users.id, user.id))
      return authError(reply, 400, 'Invalid login credentials', 'invalid_credentials')
    }
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
    if (!profile?.isActive) return authError(reply, 403, 'Account is deactivated', 'user_banned')
    if (!user.emailVerifiedAt) return authError(reply, 400, 'Email not confirmed', 'email_not_confirmed')

    await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id))
    const result = await loginWithMfa(user.id, req)
    await audit(user.id, 'mfa_required' in result ? 'login_password_verified' : 'login', req)
    return result
  })

  app.post('/auth/v1/logout', { preHandler: requireAuth, config: { rateLimit: authLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { refresh_token?: string }
    if (body.refresh_token) {
      await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, sha256(body.refresh_token)))
    } else {
      await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, req.auth!.id))
    }
    await audit(req.auth!.id, 'logout', req)
    reply.code(204)
    return null
  })

  app.get('/auth/v1/user', { preHandler: requireAuth }, async (req, reply) => {
    const user = await buildUserPayload(req.auth!.id)
    if (!user) return authError(reply, 404, 'User not found', 'user_not_found')
    return user
  })

  app.put('/auth/v1/user', { preHandler: requireAuth, config: { rateLimit: authLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { password?: string; current_password?: string; email?: string; data?: Record<string, unknown> }
    const userId = req.auth!.id
    let renewedSession: Awaited<ReturnType<typeof issueSession>> | null = null
    if (body.password !== undefined) {
      const pw = passwordSchema.safeParse(body.password)
      if (!pw.success) return authError(reply, 400, 'Password must be at least 8 characters', 'validation_failed')
      if (body.current_password !== undefined) {
        const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
        const valid = account && await verifyPassword(account.passwordHash, body.current_password).catch(() => false)
        if (!valid) return authError(reply, 400, 'Current password is incorrect', 'invalid_credentials')
      }
      await db.update(users).set({ passwordHash: await hashPassword(pw.data) }).where(eq(users.id, userId))
      await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId))
      renewedSession = await issueSession(userId, req, req.auth!.mfaVerified)
      await audit(userId, 'password_changed', req)
    }
    if (body.email !== undefined) {
      const newEmail = emailSchema.safeParse(body.email)
      if (!newEmail.success) return authError(reply, 400, 'Invalid email', 'validation_failed')
      const [taken] = await db.select().from(users).where(sql`lower(${users.email}) = ${newEmail.data} AND ${users.id} <> ${userId}`).limit(1)
      if (taken) return authError(reply, 422, 'Email already in use', 'email_exists')
      await db.update(users).set({ email: newEmail.data, emailVerifiedAt: null }).where(eq(users.id, userId))
      await db.update(profiles).set({ email: newEmail.data }).where(eq(profiles.id, userId))
      const token = await createEmailToken(userId, 'verify_email', 86400000)
      await sendVerificationEmail(newEmail.data, token).catch(() => {})
      await audit(userId, 'email_change_requested', req)
    }
    if (body.data && typeof body.data === 'object') {
      const patch: Record<string, unknown> = {}
      if (typeof body.data.first_name === 'string') patch.firstName = body.data.first_name
      if (typeof body.data.last_name === 'string') patch.lastName = body.data.last_name
      if (Object.keys(patch).length) await db.update(profiles).set(patch).where(eq(profiles.id, userId))
    }
    const user = await buildUserPayload(userId)
    return { ...user, session: renewedSession }
  })

  app.post('/auth/v1/recover', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string }
    const email = emailSchema.safeParse(body.email)
    if (email.success) {
      const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.data}`).limit(1)
      if (user) {
        const token = await createEmailToken(user.id, 'reset_password', 3600000)
        await sendPasswordResetEmail(email.data, token).catch((err) => req.log.error(err))
      }
    }
    return {}
  })

  app.post('/auth/v1/resend', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string; type?: string }
    const email = emailSchema.safeParse(body.email)
    if (email.success) {
      const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.data}`).limit(1)
      if (user && !user.emailVerifiedAt) {
        const token = await createEmailToken(user.id, 'verify_email', 86400000)
        await sendVerificationEmail(email.data, token).catch(() => {})
      }
    }
    return {}
  })

  app.post('/auth/v1/verify', { config: { rateLimit: authLimit } }, async (req, reply) => {
    const body = (req.body ?? {}) as { type?: string; token_hash?: string }
    const tokenHash = sha256(String(body.token_hash ?? ''))
    const purpose = body.type === 'recovery' ? 'reset_password' : 'verify_email'
    const [token] = await db.select().from(emailTokens).where(sql`${emailTokens.tokenHash} = ${tokenHash} AND ${emailTokens.purpose} = ${purpose}`).limit(1)
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      return authError(reply, 400, 'Verification link is invalid or expired', 'otp_expired')
    }
    await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, token.id))
    if (purpose === 'verify_email') {
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, token.userId))
      await audit(token.userId, 'email_verified', req)
    } else {
      await audit(token.userId, 'password_recovery_verified', req)
    }
    const session = await loginWithMfa(token.userId, req)
    return { ...session, type: body.type ?? 'signup' }
  })

  // Server-side invite acceptance (replaces browser-side role elevation)
  app.post('/auth/v1/accept-invite', { preHandler: requireAuth }, async (req, reply) => {
    const ctx = req.auth!
    const [invite] = await db
      .select()
      .from(adminUserInvites)
      .where(sql`lower(${adminUserInvites.email}) = lower(${ctx.email}) AND ${adminUserInvites.status} = 'approved'`)
      .limit(1)
    if (!invite) return authError(reply, 403, 'No approved staff invite found for this account', 'invite_not_found')
    await db.transaction(async (tx) => {
      await tx.update(profiles).set({
        role: invite.role,
        isActive: true,
        isTechnicalTeam: invite.role === 'technical_team',
        approvedBy: invite.approvedBy ?? invite.invitedBy,
        approvedAt: new Date(),
        ...(invite.role === 'admission_manager' ? { kycStatus: 'approved' as const } : {}),
      }).where(eq(profiles.id, ctx.id))
      await tx.update(adminUserInvites).set({ status: 'registered' }).where(eq(adminUserInvites.id, invite.id))
    })
    await audit(ctx.id, 'staff_invite_accepted', req, { role: invite.role })
    const session = await issueSession(ctx.id, req, ctx.mfaVerified)
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, ctx.id)).limit(1)
    return { session, profile }
  })
}