import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, numeric, uniqueIndex, index, check } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { userRole, kycStatus, inviteStatus, deviceType, emailTokenPurpose, mfaFactorType } from './enums.js'

export const users = pgTable(
  'users',
  {
    id: pk(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_key').on(sql`lower(${t.email})`)],
)

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: userRole('role').notNull().default('agent'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    coverImageUrl: text('cover_image_url'),
    country: text('country'),
    city: text('city'),
    bio: text('bio'),
    agencyName: text('agency_name'),
    tradingName: text('trading_name'),
    companyEmail: text('company_email'),
    officeAddress: text('office_address'),
    officeCountry: text('office_country'),
    officeCity: text('office_city'),
    postalCode: text('postal_code'),
    website: text('website'),
    accountType: text('account_type'),
    gender: text('gender'),
    dateOfBirth: text('date_of_birth'),
    department: text('department'),
    designation: text('designation'),
    stateProvince: text('state_province'),
    timezone: text('timezone'),
    preferredLanguage: text('preferred_language').default('English'),
    isSuperAgent: boolean('is_super_agent').notNull().default(false),
    isSuperAdmin: boolean('is_super_admin').notNull().default(false),
    isTwoFactorEnabled: boolean('is_two_factor_enabled').notNull().default(false),
    kycStatus: kycStatus('kyc_status').notNull().default('pending'),
    kycSubmittedAt: timestamp('kyc_submitted_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    facebookUrl: text('facebook_url'),
    twitterUrl: text('twitter_url'),
    linkedinUrl: text('linkedin_url'),
    instagramUrl: text('instagram_url'),
    youtubeUrl: text('youtube_url'),
    tiktokUrl: text('tiktok_url'),
    whatsappNumber: text('whatsapp_number'),
    telegramId: text('telegram_id'),
    skypeId: text('skype_id'),
    foundedYear: integer('founded_year'),
    numberOfEmployees: text('number_of_employees'),
    languagesSpoken: text('languages_spoken').array(),
    primaryMarket: text('primary_market'),
    isTechnicalTeam: boolean('is_technical_team').notNull().default(false),
    parentAgencyId: uuid('parent_agency_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('profiles_role_idx').on(t.role), index('profiles_kyc_idx').on(t.kycStatus)],
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByHash: text('replaced_by_hash'),
    mfaVerified: boolean('mfa_verified').notNull().default(false),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('refresh_tokens_hash_key').on(t.tokenHash), index('refresh_tokens_user_idx').on(t.userId)],
)

export const emailTokens = pgTable(
  'email_tokens',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    purpose: emailTokenPurpose('purpose').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('email_tokens_hash_key').on(t.tokenHash), index('email_tokens_user_idx').on(t.userId)],
)

export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: pk(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    purpose: text('purpose').notNull(),
    challenge: text('challenge'),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('auth_challenges_hash_key').on(t.tokenHash), index('auth_challenges_user_idx').on(t.userId)],
)

export const mfaFactors = pgTable(
  'mfa_factors',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: mfaFactorType('type').notNull().default('totp'),
    friendlyName: text('friendly_name'),
    secretEncrypted: text('secret_encrypted').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastCounter: integer('last_counter'),
    createdAt: createdAt(),
  },
  (t) => [index('mfa_factors_user_idx').on(t.userId)],
)

export const adminUserInvites = pgTable(
  'admin_user_invites',
  {
    id: pk(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: userRole('role').notNull(),
    invitedBy: uuid('invited_by').notNull().references(() => profiles.id),
    status: inviteStatus('status').notNull().default('pending'),
    adminNotes: text('admin_notes'),
    approvedBy: uuid('approved_by').references(() => profiles.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('admin_invites_email_key').on(sql`lower(${t.email})`)],
)

export const userDevices = pgTable(
  'user_devices',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    deviceName: text('device_name'),
    deviceType: deviceType('device_type').notNull().default('unknown'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    os: text('os'),
    osVersion: text('os_version'),
    ipAddress: text('ip_address'),
    city: text('city'),
    country: text('country'),
    region: text('region'),
    isp: text('isp'),
    timezone: text('timezone'),
    latitude: numeric('latitude'),
    longitude: numeric('longitude'),
    postalCode: text('postal_code'),
    isCurrent: boolean('is_current').notNull().default(false),
    isTrusted: boolean('is_trusted').notNull().default(false),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
  },
  (t) => [index('user_devices_user_idx').on(t.userId)],
)

export const securityAuditLog = pgTable(
  'security_audit_log',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    ipAddress: text('ip_address'),
    deviceInfo: text('device_info'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('security_audit_user_idx').on(t.userId), index('security_audit_created_idx').on(t.createdAt)],
)

export const userSecuritySettings = pgTable(
  'user_security_settings',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    loginNotifications: boolean('login_notifications').notNull().default(true),
    newDeviceAlerts: boolean('new_device_alerts').notNull().default(true),
    sessionTimeoutMinutes: integer('session_timeout_minutes').notNull().default(60),
    require2faForSensitive: boolean('require_2fa_for_sensitive').notNull().default(false),
    recoveryEmail: text('recovery_email'),
    phoneNumber: text('phone_number'),
    isPhoneVerified: boolean('is_phone_verified').notNull().default(false),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    backupCodesGeneratedAt: timestamp('backup_codes_generated_at', { withTimezone: true }),
    securityKeysEnabled: boolean('security_keys_enabled').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('user_security_settings_user_key').on(t.userId)],
)

export const userSecurityKeys = pgTable(
  'user_security_keys',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    keyName: text('key_name').notNull(),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    transports: text('transports').array().notNull().default(sql`'{}'::text[]`),
    deviceType: text('device_type'),
    backedUp: boolean('backed_up').notNull().default(false),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('user_security_keys_credential_key').on(t.credentialId), index('user_security_keys_user_idx').on(t.userId)],
)

export const userBackupCodes = pgTable(
  'user_backup_codes',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: createdAt(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => [index('user_backup_codes_user_idx').on(t.userId)],
)