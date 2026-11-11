import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, integer, numeric, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import { approvalStatus, submissionType } from './enums.js'

export const regions = pgTable('regions', {
  id: pk(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  country: text('country').notNull(),
  continent: text('continent'),
  timezone: text('timezone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('regions_code_key').on(t.code)])

export const countries = pgTable('countries', {
  id: pk(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  regionId: uuid('region_id').references(() => regions.id),
  continent: text('continent'),
  timezone: text('timezone'),
  population: integer('population'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('countries_code_key').on(t.code)])

export const universities = pgTable(
  'universities',
  {
    id: pk(),
    name: text('name').notNull(),
    country: text('country').notNull(),
    region: text('region'),
    city: text('city'),
    about: text('about'),
    features: jsonb('features'),
    globalRanking: integer('global_ranking'),
    logoUrl: text('logo_url'),
    imageUrl: text('image_url'),
    websiteUrl: text('website_url'),
    description: text('description'),
    established: integer('established'),
    ranking: text('ranking'),
    accreditation: text('accreditation'),
    studentCount: integer('student_count'),
    acceptanceRate: numeric('acceptance_rate'),
    isActive: boolean('is_active').notNull().default(true),
    isMultisite: boolean('is_multisite').notNull().default(false),
    slug: text('slug'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('universities_slug_key').on(t.slug), index('universities_country_idx').on(t.country)],
)

export const universityCampuses = pgTable(
  'university_campuses',
  {
    id: pk(),
    universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
    campusName: text('campus_name'),
    country: text('country').notNull(),
    city: text('city'),
    region: text('region'),
    address: text('address'),
    postalCode: text('postal_code'),
    phone: text('phone'),
    email: text('email'),
    websiteUrl: text('website_url'),
    studentCount: integer('student_count'),
    isMain: boolean('is_main').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('campuses_university_idx').on(t.universityId)],
)

export const programs = pgTable(
  'programs',
  {
    id: pk(),
    universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    level: text('level').notNull(),
    category: text('category'),
    durationMonths: integer('duration_months'),
    duration: text('duration'),
    tuitionFee: numeric('tuition_fee'),
    currency: text('currency'),
    language: text('language').array().notNull().default(sql`'{}'::text[]`),
    description: text('description'),
    requirements: text('requirements'),
    requirementsList: text('requirements_list').array(),
    applicationDeadline: text('application_deadline'),
    startDates: text('start_dates').array().notNull().default(sql`'{}'::text[]`),
    intake: text('intake'),
    englishRequirements: text('english_requirements'),
    prerequisites: text('prerequisites'),
    curriculumSummary: text('curriculum_summary'),
    applicationFee: numeric('application_fee'),
    imgUrl: text('img_url'),
    isActive: boolean('is_active').notNull().default(true),
    isAllCampuses: boolean('is_all_campuses').notNull().default(true),
    slug: text('slug'),
    createdAt: createdAt(),
    scholarshipAvailable: boolean('scholarship_available').notNull().default(false),
    campusType: text('campus_type'),
    deliveryMode: text('delivery_mode').notNull().default('on_campus'),
    accommodationAvailable: boolean('accommodation_available').notNull().default(false),
    visaSupport: boolean('visa_support').notNull().default(false),
  },
  (t) => [uniqueIndex('programs_slug_key').on(t.slug), index('programs_university_idx').on(t.universityId), index('programs_level_idx').on(t.level)],
)

export const programCampusAssignments = pgTable(
  'program_campus_assignments',
  {
    id: pk(),
    programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
    campusId: uuid('campus_id').notNull().references(() => universityCampuses.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('program_campus_unique').on(t.programId, t.campusId)],
)

export const pendingSubmissions = pgTable(
  'pending_submissions',
  {
    id: pk(),
    submittedBy: uuid('submitted_by').notNull().references(() => profiles.id),
    submissionType: submissionType('submission_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: approvalStatus('status').notNull().default('pending'),
    reviewerId: uuid('reviewer_id').references(() => profiles.id),
    reviewerNotes: text('reviewer_notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('pending_submissions_status_idx').on(t.status), index('pending_submissions_submitter_idx').on(t.submittedBy)],
)