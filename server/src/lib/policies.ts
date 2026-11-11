import { sql, type SQL } from 'drizzle-orm'
import type { AuthContext } from '../plugins/auth.js'
import { isAdmin, isTechTeam, isContractRole, isAdmissionRole, isManagerRole, isAgentSide } from '../plugins/auth.js'

export type Filter = SQL | true | false

export interface Access {
  filter: Filter
  columns?: string[]
  force?: Record<string, unknown>
  check?: (row: Record<string, unknown>, ctx: AuthContext) => string | null
  mask?: (row: Record<string, unknown>, ctx: AuthContext) => Record<string, unknown>
}

const deny: Access = { filter: false }
const allow: Access = { filter: true }

function ownAgent(ctx: AuthContext, col = 'agent_id'): SQL {
  return sql.raw(`"${col}" = '${ctx.effectiveAgencyId}'`)
}

function appOwned(ctx: AuthContext, draftOnly = false): SQL {
  const status = draftOnly ? ` AND status = 'draft'` : ''
  return sql.raw(`application_id IN (SELECT id FROM applications WHERE agent_id = '${ctx.effectiveAgencyId}'${status})`)
}

function appVisible(ctx: AuthContext): SQL {
  return sql.raw(`application_id IN (SELECT id FROM applications WHERE agent_id = '${ctx.effectiveAgencyId}')`)
}

const PROFILE_PUBLIC_COLUMNS = [
  'id', 'first_name', 'last_name', 'avatar_url', 'cover_image_url', 'role', 'agency_name',
  'trading_name', 'country', 'city', 'office_country', 'office_city', 'bio', 'website',
  'is_super_agent', 'is_active', 'created_at', 'designation', 'department',
]

const PROFILE_PROTECTED = ['role', 'is_super_admin', 'is_active', 'is_technical_team', 'approved_by', 'approved_at', 'email', 'id', 'created_at']

type Policy = {
  select: (ctx: AuthContext | null) => Access
  insert: (ctx: AuthContext) => Access
  update: (ctx: AuthContext) => Access
  delete: (ctx: AuthContext) => Access
}

const staffRead = (ctx: AuthContext | null): boolean => !!ctx && isManagerRole(ctx)

export const policies: Record<string, Policy> = {
  profiles: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isManagerRole(ctx)) return allow
      if (ctx.role === 'editor') {
        return { filter: sql.raw(`id IN ('${ctx.id}', '${ctx.effectiveAgencyId}')`) }
      }
      const mask = (row: Record<string, unknown>) => {
        if (row.id === ctx.id || row.id === ctx.effectiveAgencyId) return row
        const out: Record<string, unknown> = {}
        for (const col of PROFILE_PUBLIC_COLUMNS) if (col in row) out[col] = row[col]
        return out
      }
      if (isAgentSide(ctx)) {
        // Agents see own full row; other profiles are masked to public columns (chat embeds)
        return { filter: true, mask }
      }
      return { filter: sql.raw(`id = '${ctx.id}'`) }
    },
    insert: () => deny,
    update: (ctx) => {
      if (isAdmin(ctx)) {
        return {
          filter: true,
          check: (row) => {
            if ('is_super_admin' in row && !ctx.isSuperAdmin) return 'Only super admins can grant super admin'
            return null
          },
        }
      }
      return {
        filter: sql.raw(`id = '${ctx.id}'`),
        columns: undefined,
        check: (row) => {
          for (const key of Object.keys(row)) {
            if (PROFILE_PROTECTED.includes(key)) return `Cannot modify protected field: ${key}`
          }
          if ('kyc_status' in row && row.kyc_status !== 'pending') return 'KYC status can only be set to pending by the account owner'
          return null
        },
      }
    },
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`id = '${ctx.id}'`) }),
  },

  admin_user_invites: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`lower(email) = lower('${ctx.email}')`) }
    },
    insert: (ctx) => (isAdmin(ctx) ? { ...allow, force: { invited_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  agent_kyc: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx) || isContractRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId } } : isAdmin(ctx) ? allow : deny),
    update: (ctx) => {
      if (isAdmin(ctx) || isAdmissionRole(ctx) || isContractRole(ctx)) return allow
      return { filter: ownAgent(ctx), check: (row) => ('status' in row || 'admin_notes' in row ? 'Only staff can change KYC review fields' : null) }
    },
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: ownAgent(ctx) }),
  },

  team_members: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`agency_id IN ('${ctx.id}', '${ctx.effectiveAgencyId}')`) }
    },
    insert: (ctx) => {
      if (isAdmin(ctx)) return allow
      if (ctx.role !== 'agent') return deny
      return {
        filter: true,
        force: { agency_id: ctx.id },
        check: () => null,
      }
    },
    update: (ctx) => (isAdmin(ctx) ? allow : ctx.role === 'agent' ? { filter: sql.raw(`agency_id = '${ctx.id}'`) } : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : ctx.role === 'agent' ? { filter: sql.raw(`agency_id = '${ctx.id}'`) } : deny),
  },

  agent_partner_selections: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isAdmin(ctx) ? allow : isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: ownAgent(ctx) }),
  },

  partner_activation_requests: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) =>
      isAgentSide(ctx)
        ? { filter: true, force: { agent_id: ctx.effectiveAgencyId }, check: (row) => (row.agreed_to_terms === true ? null : 'Terms must be accepted') }
        : deny,
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  universities: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  university_campuses: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
  },
  programs: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  program_campus_assignments: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
  },

  pending_submissions: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`submitted_by = '${ctx.id}'`) }
    },
    insert: (ctx) =>
      isAdmin(ctx) || ctx.role === 'program_manager' || ctx.role === 'admission_manager'
        ? { filter: true, force: { submitted_by: ctx.id } }
        : deny,
    update: (ctx) => {
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`submitted_by = '${ctx.id}' AND status = 'pending'`) }
    },
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`submitted_by = '${ctx.id}' AND status = 'pending'`) }),
  },

  regions: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  countries: {
    select: () => allow,
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  students: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId } } : isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: ownAgent(ctx) }),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: ownAgent(ctx) }),
  },

  applications: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isAdmissionRole(ctx) || ctx.role === 'program_manager') return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) =>
      isAgentSide(ctx)
        ? { filter: true, force: { agent_id: ctx.effectiveAgencyId }, check: (row) => (row.status && row.status !== 'draft' ? 'New applications must start as draft' : null) }
        : deny,
    update: (ctx) => {
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      return {
        filter: sql.raw(`agent_id = '${ctx.effectiveAgencyId}' AND status = 'draft'`),
        check: (row) => {
          if ('status' in row && !['draft', 'submitted'].includes(row.status as string)) return 'Agents can only submit drafts'
          if ('admin_notes' in row || 'reviewed_by' in row || 'reviewed_at' in row) return 'Review fields are staff-only'
          return null
        },
      }
    },
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`agent_id = '${ctx.effectiveAgencyId}' AND status = 'draft'`) }),
  },

  application_step_states: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : ctx ? { filter: appVisible(ctx) } : deny),
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
  },
  education_entries: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : ctx ? { filter: appVisible(ctx) } : deny),
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
  },
  work_experience_entries: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : ctx ? { filter: appVisible(ctx) } : deny),
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
  },
  application_documents: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : ctx ? { filter: appVisible(ctx) } : deny),
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx) }),
    update: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : { filter: appOwned(ctx, true) }),
  },
  application_comments: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      return { filter: appVisible(ctx) }
    },
    insert: (ctx) => ({
      filter: isAdmin(ctx) || isAdmissionRole(ctx) ? true : appVisible(ctx),
      force: { author_id: ctx.id, author_role: ctx.role },
    }),
    update: (ctx) => ({
      filter: isAdmin(ctx) || isAdmissionRole(ctx) ? true : appVisible(ctx),
      columns: ['is_read', 'content', 'attachments', 'updated_at'],
    }),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  document_requests: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : ctx ? { filter: appVisible(ctx) } : deny),
    insert: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? { filter: true, force: { requested_by: ctx.id } } : deny),
    update: (ctx) => {
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      return { filter: appVisible(ctx), columns: ['is_fulfilled', 'fulfilled_at', 'fulfilled_doc_id'] }
    },
    delete: (ctx) => (isAdmin(ctx) || isAdmissionRole(ctx) ? allow : deny),
  },
  application_assignments: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx)) return allow
      return { filter: sql.raw(`assigned_to = '${ctx.id}'`) }
    },
    insert: (ctx) => (isAdmissionRole(ctx) ? { filter: true, force: { assigned_by: ctx.id } } : deny),
    update: (ctx) => (isAdmissionRole(ctx) ? allow : { filter: sql.raw(`assigned_to = '${ctx.id}'`) }),
    delete: (ctx) => (isAdmissionRole(ctx) ? allow : deny),
  },

  messages: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      const a = ctx.effectiveAgencyId
      return { filter: sql.raw(`(sender_id IN ('${ctx.id}', '${a}') OR recipient_id IN ('${ctx.id}', '${a}') OR recipient_id IS NULL)`) }
    },
    insert: (ctx) => ({
      filter: true,
      force: { sender_id: ctx.id, sender_role: ctx.role },
      check: (row) => (isAgentSide(ctx) && row.recipient_id ? 'Agents send broadcast messages to the admissions team' : null),
    }),
    update: (ctx) => {
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return { filter: true, columns: ['is_read'] }
      return { filter: sql.raw(`recipient_id IN ('${ctx.id}', '${ctx.effectiveAgencyId}') OR sender_id IN ('${ctx.id}', '${ctx.effectiveAgencyId}')`), columns: ['is_read'] }
    },
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  message_attachments: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx) || isAdmissionRole(ctx)) return allow
      const a = ctx.effectiveAgencyId
      return {
        filter: sql.raw(`message_id IN (SELECT id FROM messages WHERE sender_id IN ('${ctx.id}', '${a}') OR recipient_id IN ('${ctx.id}', '${a}') OR recipient_id IS NULL)`),
      }
    },
    insert: (ctx) => ({
      filter: sql.raw(`message_id IN (SELECT id FROM messages WHERE sender_id = '${ctx.id}')`),
    }),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  announcements: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? allow : deny),
    insert: (ctx) => (isAdmin(ctx) ? { filter: true, force: { created_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  events: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? { filter: sql.raw(`is_active = true`) } : deny),
    insert: (ctx) => (isAdmin(ctx) ? { filter: true, force: { created_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  event_bookings: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? { filter: ownAgent(ctx) } : deny),
    insert: (ctx) => (isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : { filter: ownAgent(ctx) }),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: ownAgent(ctx) }),
  },
  event_team_bookings: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`event_booking_id IN (SELECT id FROM event_bookings WHERE agent_id = '${ctx.effectiveAgencyId}')`) }
    },
    insert: (ctx) => ({
      filter: sql.raw(`event_booking_id IN (SELECT id FROM event_bookings WHERE agent_id = '${ctx.effectiveAgencyId}')`),
    }),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`event_booking_id IN (SELECT id FROM event_bookings WHERE agent_id = '${ctx.effectiveAgencyId}')`) }),
  },
  event_proposals: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? { filter: ownAgent(ctx) } : deny),
    insert: (ctx) => (isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  news_posts: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? { filter: sql.raw(`is_published = true`) } : deny),
    insert: (ctx) => (isAdmin(ctx) ? { filter: true, force: { created_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  blog_posts: {
    select: (ctx) => (ctx && isAdmin(ctx) ? allow : ctx ? { filter: sql.raw(`is_published = true`) } : deny),
    insert: (ctx) => (isAdmin(ctx) ? { filter: true, force: { created_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  blog_comments: {
    select: (ctx) => (ctx ? allow : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`user_id = '${ctx.id}'`) }),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`user_id = '${ctx.id}'`) }),
  },
  blog_reactions: {
    select: (ctx) => (ctx ? allow : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: () => deny,
    delete: (ctx) => ({ filter: sql.raw(`user_id = '${ctx.id}'`) }),
  },

  agent_contracts: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isContractRole(ctx) || isAdmissionRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
    update: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
    delete: (ctx) => (isContractRole(ctx) ? allow : deny),
  },
  agent_contract_activity: {
    select: (ctx) => (ctx && (isContractRole(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? { filter: true, force: { performed_by: ctx.id } } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  contract_document_requests: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isContractRole(ctx) || isAdmissionRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? { filter: true, force: { requested_by: ctx.id } } : deny),
    update: (ctx) => {
      if (isContractRole(ctx) || isAdmissionRole(ctx)) return allow
      return {
        filter: ownAgent(ctx),
        columns: ['is_fulfilled', 'fulfilled_at', 'fulfilled_doc_url', 'agent_note'],
        check: (row) => ('is_fulfilled' in row && row.is_fulfilled !== true ? 'Agents can only fulfill requests' : null),
      }
    },
    delete: (ctx) => (isContractRole(ctx) ? allow : deny),
  },
  contract_team_notes: {
    select: (ctx) => (ctx && (isContractRole(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? { filter: true, force: { author_id: ctx.id } } : deny),
    update: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
    delete: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
  },

  agent_categories: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx) || isContractRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
    update: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
    delete: (ctx) => (isContractRole(ctx) || isAdmissionRole(ctx) ? allow : deny),
  },
  agent_category_review_queue: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx) || isContractRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => (isAgentSide(ctx) ? { filter: true, force: { agent_id: ctx.effectiveAgencyId }, columns: ['agent_id', 'requested_category', 'submitted_documents'] } : isManagerRole(ctx) ? allow : deny),
    update: (ctx) => (isManagerRole(ctx) || isContractRole(ctx) ? allow : deny),
    delete: (ctx) => (isManagerRole(ctx) || isContractRole(ctx) ? allow : deny),
  },
  agent_global_activities: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isManagerRole(ctx)) return allow
      return { filter: ownAgent(ctx) }
    },
    insert: (ctx) => ({ filter: true, force: { agent_id: ctx.effectiveAgencyId } }),
    update: () => deny,
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  admission_team_members: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isAdmin(ctx)) return allow
      return { filter: sql.raw(`admission_manager_id = '${ctx.id}' OR user_id = '${ctx.id}'`) }
    },
    insert: (ctx) => (isAdmissionRole(ctx) ? { filter: sql.raw(`admission_manager_id = '${ctx.id}'`) } : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`admission_manager_id = '${ctx.id}'`) }),
    delete: (ctx) => (isAdmin(ctx) ? allow : { filter: sql.raw(`admission_manager_id = '${ctx.id}'`) }),
  },
  admission_team_permissions: {
    select: (ctx) => teamScopeAccess(ctx),
    insert: (ctx) => teamScopeAccess(ctx),
    update: (ctx) => teamScopeAccess(ctx),
    delete: (ctx) => teamScopeAccess(ctx),
  },
  admission_team_geographic_scope: {
    select: (ctx) => teamScopeAccess(ctx),
    insert: (ctx) => teamScopeAccess(ctx),
    update: (ctx) => teamScopeAccess(ctx),
    delete: (ctx) => teamScopeAccess(ctx),
  },
  admission_team_category_scope: {
    select: (ctx) => teamScopeAccess(ctx),
    insert: (ctx) => teamScopeAccess(ctx),
    update: (ctx) => teamScopeAccess(ctx),
    delete: (ctx) => teamScopeAccess(ctx),
  },

  analytics_events: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: () => deny,
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  application_analytics_snapshot: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  agent_performance_analytics: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  university_analytics: {
    select: (ctx) => (ctx && (isAdmin(ctx) || isAdmissionRole(ctx)) ? allow : deny),
    insert: (ctx) => (isAdmin(ctx) ? allow : deny),
    update: (ctx) => (isAdmin(ctx) ? allow : deny),
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },

  kb_categories: {
    select: () => allow,
    insert: (ctx) => (isTechTeam(ctx) ? allow : deny),
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  kb_articles: {
    select: (ctx) => (ctx && isTechTeam(ctx) ? allow : { filter: sql.raw(`status = 'published'`) }),
    insert: (ctx) => (isTechTeam(ctx) ? { filter: true, force: { author_id: ctx.id } } : deny),
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  kb_media: {
    select: () => allow,
    insert: (ctx) => (isTechTeam(ctx) ? { filter: true, force: { uploaded_by: ctx.id } } : deny),
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },

  support_tickets: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isTechTeam(ctx)) return allow
      return { filter: sql.raw(`user_id = '${ctx.id}'`) }
    },
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => {
      if (isTechTeam(ctx)) return allow
      return {
        filter: sql.raw(`user_id = '${ctx.id}' AND status NOT IN ('resolved', 'closed')`),
        columns: ['subject', 'description', 'attachments', 'category', 'subcategory', 'steps_to_reproduce', 'expected_behavior', 'actual_behavior', 'error_message', 'page_url'],
      }
    },
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  support_ticket_messages: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isTechTeam(ctx)) return allow
      return { filter: sql.raw(`ticket_id IN (SELECT id FROM support_tickets WHERE user_id = '${ctx.id}') AND is_internal = false`) }
    },
    insert: (ctx) => {
      if (isTechTeam(ctx)) return { filter: true, force: { sender_id: ctx.id } }
      return {
        filter: sql.raw(`ticket_id IN (SELECT id FROM support_tickets WHERE user_id = '${ctx.id}')`),
        force: { sender_id: ctx.id, is_internal: false, is_system: false },
      }
    },
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  portal_feedback: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isTechTeam(ctx)) return allow
      return { filter: sql.raw(`user_id = '${ctx.id}'`) }
    },
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  technical_events: {
    select: (ctx) => (ctx && isTechTeam(ctx) ? allow : { filter: sql.raw(`status <> 'archived'`) }),
    insert: (ctx) => (isTechTeam(ctx) ? { filter: true, force: { created_by: ctx.id } } : deny),
    update: (ctx) => (isTechTeam(ctx) ? allow : deny),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },
  technical_event_responses: {
    select: (ctx) => {
      if (!ctx) return deny
      if (isTechTeam(ctx)) return allow
      return { filter: sql.raw(`user_id = '${ctx.id}'`) }
    },
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => (isTechTeam(ctx) ? allow : { filter: sql.raw(`user_id = '${ctx.id}'`), columns: ['message', 'media_urls', 'is_confirmed'] }),
    delete: (ctx) => (isTechTeam(ctx) ? allow : deny),
  },

  user_devices: {
    select: (ctx) => (ctx ? { filter: sql.raw(`user_id = '${ctx.id}'`) } : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => ({ filter: sql.raw(`user_id = '${ctx.id}'`) }),
    delete: (ctx) => ({ filter: sql.raw(`user_id = '${ctx.id}'`) }),
  },
  security_audit_log: {
    select: (ctx) => (ctx ? { filter: sql.raw(`user_id = '${ctx.id}'`) } : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: () => deny,
    delete: (ctx) => (isAdmin(ctx) ? allow : deny),
  },
  user_security_settings: {
    select: (ctx) => (ctx ? { filter: sql.raw(`user_id = '${ctx.id}'`) } : deny),
    insert: (ctx) => ({ filter: true, force: { user_id: ctx.id } }),
    update: (ctx) => ({ filter: sql.raw(`user_id = '${ctx.id}'`) }),
    delete: (ctx) => ({ filter: sql.raw(`user_id = '${ctx.id}'`) }),
  },
  user_security_keys: {
    select: (ctx) => (ctx ? { filter: sql.raw(`user_id = '${ctx.id}'`) } : deny),
    insert: () => deny,
    update: () => deny,
    delete: () => deny,
  },
  user_backup_codes: {
    select: () => deny,
    insert: () => deny,
    update: () => deny,
    delete: () => deny,
  },
}

function teamScopeAccess(ctx: AuthContext | null): Access {
  if (!ctx) return deny
  if (isAdmin(ctx)) return allow
  if (!isAdmissionRole(ctx) && ctx.role !== 'admission_manager') {
    return { filter: sql.raw(`team_member_id IN (SELECT id FROM admission_team_members WHERE user_id = '${ctx.id}')`) }
  }
  return { filter: sql.raw(`team_member_id IN (SELECT id FROM admission_team_members WHERE admission_manager_id = '${ctx.id}' OR user_id = '${ctx.id}')`) }
}

export function getPolicy(table: string): Policy | undefined {
  return policies[table]
}

export { PROFILE_PUBLIC_COLUMNS }