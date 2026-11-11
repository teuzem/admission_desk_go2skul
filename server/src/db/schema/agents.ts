import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import { universities } from './catalog.js'
import { kycStatus, teamMemberStatus, approvalStatus, agentCategory, categoryReviewStatus, verificationStatus } from './enums.js'

export const agentKyc = pgTable(
  'agent_kyc',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    businessLicenceUrl: text('business_licence_url'),
    companyRegistrationNumber: text('company_registration_number'),
    incorporationDate: text('incorporation_date'),
    expiryDate: text('expiry_date'),
    doesNotExpire: boolean('does_not_expire').notNull().default(false),
    registeredAddress: text('registered_address'),
    registeredCity: text('registered_city'),
    registeredCountry: text('registered_country'),
    registeredPostalCode: text('registered_postal_code'),
    isSameAddress: boolean('is_same_address').notNull().default(false),
    jobRoles: text('job_roles').array().notNull().default(sql`'{}'::text[]`),
    recruitmentRegions: text('recruitment_regions').array().notNull().default(sql`'{}'::text[]`),
    representsHq: boolean('represents_hq').notNull().default(false),
    status: kycStatus('status').notNull().default('pending'),
    adminNotes: text('admin_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('agent_kyc_agent_key').on(t.agentId)],
)

export const teamMembers = pgTable(
  'team_members',
  {
    id: pk(),
    agencyId: uuid('agency_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email').notNull(),
    name: text('name'),
    role: text('role').notNull().default('editor'),
    status: teamMemberStatus('status').notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('team_members_agency_email_key').on(t.agencyId, sql`lower(${t.invitedEmail})`),
    index('team_members_email_idx').on(sql`lower(${t.invitedEmail})`),
  ],
)

export const agentPartnerSelections = pgTable(
  'agent_partner_selections',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('agent_partner_unique').on(t.agentId, t.universityId)],
)

export const partnerActivationRequests = pgTable(
  'partner_activation_requests',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone'),
    companyName: text('company_name').notNull(),
    reason: text('reason'),
    agreedToTerms: boolean('agreed_to_terms').notNull().default(false),
    signature: text('signature'),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    status: approvalStatus('status').notNull().default('pending'),
    adminNotes: text('admin_notes'),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('partner_activation_agent_idx').on(t.agentId), index('partner_activation_status_idx').on(t.status)],
)

export const agentCategories = pgTable(
  'agent_categories',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    category: agentCategory('category').notNull().default('pending_classification'),
    subCategory: text('sub_category'),
    classificationNotes: text('classification_notes'),
    classifiedBy: uuid('classified_by').references(() => profiles.id),
    classifiedAt: timestamp('classified_at', { withTimezone: true }).defaultNow(),
    verificationStatus: verificationStatus('verification_status').notNull().default('verified'),
    verifiedBy: uuid('verified_by').references(() => profiles.id),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('agent_categories_agent_key').on(t.agentId), index('agent_categories_category_idx').on(t.category)],
)

export const agentCategoryReviewQueue = pgTable(
  'agent_category_review_queue',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    requestedCategory: agentCategory('requested_category'),
    submittedDocuments: jsonb('submitted_documents'),
    reviewStatus: categoryReviewStatus('review_status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewNotes: text('review_notes'),
    investigatorNotes: text('investigator_notes'),
    externalVerificationStatus: text('external_verification_status'),
    externalVerificationUrl: text('external_verification_url'),
    decisionMadeAt: timestamp('decision_made_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('category_review_agent_idx').on(t.agentId), index('category_review_status_idx').on(t.reviewStatus)],
)

export const agentGlobalActivities = pgTable(
  'agent_global_activities',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    activityType: text('activity_type').notNull(),
    description: text('description').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('agent_activities_agent_idx').on(t.agentId), index('agent_activities_created_idx').on(t.createdAt)],
)