import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, integer, numeric, date, timestamp, jsonb, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import { applications } from './admissions.js'
import { universities } from './catalog.js'
import { agentCategory, permissionScope, teamPermissionType, admissionTeamStatus } from './enums.js'

export const admissionTeamMembers = pgTable(
  'admission_team_members',
  {
    id: pk(),
    admissionManagerId: uuid('admission_manager_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: text('role').notNull().default('admission_staff'),
    status: admissionTeamStatus('status').notNull().default('active'),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('admission_team_manager_user_key').on(t.admissionManagerId, t.userId),
    uniqueIndex('admission_team_manager_email_key').on(t.admissionManagerId, sql`lower(${t.email})`),
    index('admission_team_user_idx').on(t.userId),
  ],
)

export const admissionTeamPermissions = pgTable(
  'admission_team_permissions',
  {
    id: pk(),
    teamMemberId: uuid('team_member_id').notNull().references(() => admissionTeamMembers.id, { onDelete: 'cascade' }),
    permissionType: teamPermissionType('permission_type').notNull(),
    scope: permissionScope('scope').notNull().default('read'),
    isGranted: boolean('is_granted').notNull().default(true),
    grantedBy: uuid('granted_by').references(() => profiles.id),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('admission_team_perm_unique').on(t.teamMemberId, t.permissionType)],
)

export const admissionTeamGeographicScope = pgTable(
  'admission_team_geographic_scope',
  {
    id: pk(),
    teamMemberId: uuid('team_member_id').notNull().references(() => admissionTeamMembers.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    canView: boolean('can_view').notNull().default(true),
    canReview: boolean('can_review').notNull().default(false),
    canManage: boolean('can_manage').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('admission_team_geo_unique').on(t.teamMemberId, t.scopeType, t.scopeId)],
)

export const admissionTeamCategoryScope = pgTable(
  'admission_team_category_scope',
  {
    id: pk(),
    teamMemberId: uuid('team_member_id').notNull().references(() => admissionTeamMembers.id, { onDelete: 'cascade' }),
    category: agentCategory('category').notNull(),
    canView: boolean('can_view').notNull().default(true),
    canReview: boolean('can_review').notNull().default(false),
    canManage: boolean('can_manage').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('admission_team_category_unique').on(t.teamMemberId, t.category)],
)

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: pk(),
    eventType: text('event_type').notNull(),
    eventCategory: text('event_category'),
    applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
    agentId: uuid('agent_id').references(() => profiles.id, { onDelete: 'set null' }),
    universityId: uuid('university_id').references(() => universities.id, { onDelete: 'set null' }),
    programId: uuid('program_id'),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    countryCode: text('country_code'),
    regionCode: text('region_code'),
    agentCategory: agentCategory('agent_category'),
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
  },
  (t) => [index('analytics_events_type_idx').on(t.eventType), index('analytics_events_created_idx').on(t.createdAt), index('analytics_events_agent_idx').on(t.agentId)],
)

export const applicationAnalyticsSnapshot = pgTable('application_analytics_snapshot', {
  id: pk(),
  snapshotDate: date('snapshot_date').notNull(),
  totalApplications: integer('total_applications').notNull().default(0),
  applicationsByStatus: jsonb('applications_by_status'),
  applicationsByCountry: jsonb('applications_by_country'),
  applicationsByRegion: jsonb('applications_by_region'),
  applicationsByUniversity: jsonb('applications_by_university'),
  applicationsByAgentCategory: jsonb('applications_by_agent_category'),
  applicationsByAgent: jsonb('applications_by_agent'),
  averageProcessingDays: numeric('average_processing_days', { precision: 5, scale: 2 }),
  conversionRate: numeric('conversion_rate', { precision: 5, scale: 2 }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('app_analytics_snapshot_date_key').on(t.snapshotDate)])

export const agentPerformanceAnalytics = pgTable(
  'agent_performance_analytics',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    totalApplications: integer('total_applications').notNull().default(0),
    submittedApplications: integer('submitted_applications').notNull().default(0),
    underReviewApplications: integer('under_review_applications').notNull().default(0),
    offersGiven: integer('offers_given').notNull().default(0),
    acceptances: integer('acceptances').notNull().default(0),
    rejections: integer('rejections').notNull().default(0),
    enrollments: integer('enrollments').notNull().default(0),
    averageProcessingDays: numeric('average_processing_days', { precision: 5, scale: 2 }),
    successRate: numeric('success_rate', { precision: 5, scale: 2 }),
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('agent_performance_period_key').on(t.agentId, t.periodStart, t.periodEnd)],
)

export const universityAnalytics = pgTable(
  'university_analytics',
  {
    id: pk(),
    universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
    snapshotDate: date('snapshot_date').notNull(),
    totalApplications: integer('total_applications').notNull().default(0),
    pendingApplications: integer('pending_applications').notNull().default(0),
    underReviewApplications: integer('under_review_applications').notNull().default(0),
    offersGiven: integer('offers_given').notNull().default(0),
    acceptances: integer('acceptances').notNull().default(0),
    rejections: integer('rejections').notNull().default(0),
    enrollments: integer('enrollments').notNull().default(0),
    averageProcessingDays: numeric('average_processing_days', { precision: 5, scale: 2 }),
    conversionRate: numeric('conversion_rate', { precision: 5, scale: 2 }),
    topCountries: jsonb('top_countries'),
    topAgents: jsonb('top_agents'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('university_analytics_date_key').on(t.universityId, t.snapshotDate)],
)