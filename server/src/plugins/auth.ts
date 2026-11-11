import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { profiles, teamMembers } from '../db/schema/index.js'
import { verifyAccessToken } from '../lib/tokens.js'

export interface AuthContext {
  id: string
  email: string
  role: string
  isSuperAdmin: boolean
  isTechnicalTeam: boolean
  mfaVerified: boolean
  effectiveAgencyId: string
  profile: typeof profiles.$inferSelect
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
  }
}

export async function loadAuth(req: FastifyRequest): Promise<void> {
  req.auth = null
  const header = req.headers.authorization
  let token: string | undefined
  if (header?.startsWith('Bearer ')) token = header.slice(7)
  else if (req.cookies?.['admission-desk-access']) token = req.cookies['admission-desk-access']
  if (!token) return
  const payload = await verifyAccessToken(token)
  if (!payload?.sub) return
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile || !profile.isActive) return
  if (profile.isTwoFactorEnabled && payload.mfaVerified !== true) return

  let effectiveAgencyId = profile.id
  if (profile.role === 'editor') {
    if (profile.parentAgencyId) effectiveAgencyId = profile.parentAgencyId
    else {
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(sql`lower(${teamMembers.invitedEmail}) = lower(${profile.email}) and ${teamMembers.status} = 'active'`)
        .limit(1)
      if (membership) effectiveAgencyId = membership.agencyId
    }
  }

  req.auth = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    isSuperAdmin: profile.isSuperAdmin,
    isTechnicalTeam: profile.role === 'technical_team' || profile.isTechnicalTeam || profile.role === 'admin',
    mfaVerified: payload.mfaVerified === true,
    effectiveAgencyId,
    profile,
  }
}

export const requireAuth: preHandlerHookHandler = async (req, reply) => {
  if (!req.auth) {
    reply.code(401).send({ message: 'JWT expired or invalid', code: 'PGRST301', details: null, hint: null })
  }
}

export function requireRoles(...roles: string[]): preHandlerHookHandler {
  return async (req, reply) => {
    if (!req.auth) {
      reply.code(401).send({ message: 'Authentication required', code: 'PGRST301' })
      return
    }
    if (!roles.includes(req.auth.role) && !(req.auth.isSuperAdmin && roles.includes('admin'))) {
      reply.code(403).send({ message: 'Insufficient role privileges', code: '42501' })
    }
  }
}

export function isAdmin(ctx: AuthContext): boolean {
  return ctx.role === 'admin' || ctx.isSuperAdmin
}
export function isTechTeam(ctx: AuthContext): boolean {
  return ctx.isTechnicalTeam
}
export function isContractRole(ctx: AuthContext): boolean {
  return isAdmin(ctx) || ctx.role === 'contract_manager'
}
export function isAdmissionRole(ctx: AuthContext): boolean {
  return isAdmin(ctx) || ctx.role === 'admission_manager'
}
export function isManagerRole(ctx: AuthContext): boolean {
  return isAdmissionRole(ctx) || ctx.role === 'program_manager' || isContractRole(ctx)
}
export function isAgentSide(ctx: AuthContext): boolean {
  return ctx.role === 'agent' || ctx.role === 'editor'
}