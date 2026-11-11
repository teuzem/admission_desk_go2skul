import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, uniqueIndex, index, check } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import {
  supportTicketStatus,
  supportTicketPriority,
  kbArticleStatus,
  feedbackType,
  technicalEventType,
  technicalEventSeverity,
  technicalEventStatus,
} from './enums.js'

export const kbCategories = pgTable('kb_categories', {
  id: pk(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  icon: text('icon').default('Book'),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  articleCount: integer('article_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex('kb_categories_slug_key').on(t.slug)])

export const kbArticles = pgTable(
  'kb_articles',
  {
    id: pk(),
    categoryId: uuid('category_id').references(() => kbCategories.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    content: text('content').notNull(),
    excerpt: text('excerpt'),
    featuredImageUrl: text('featured_image_url'),
    authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
    status: kbArticleStatus('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
    viewCount: integer('view_count').notNull().default(0),
    helpfulCount: integer('helpful_count').notNull().default(0),
    notHelpfulCount: integer('not_helpful_count').notNull().default(0),
    language: text('language').notNull().default('en'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('kb_articles_slug_key').on(t.slug), index('kb_articles_status_idx').on(t.status), index('kb_articles_category_idx').on(t.categoryId)],
)

export const kbMedia = pgTable('kb_media', {
  id: pk(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
})

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: pk(),
    ticketNumber: text('ticket_number').notNull().default(sql`'AD-' || LPAD(nextval('support_ticket_number_seq')::text, 6, '0')`),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    category: text('category').notNull(),
    subcategory: text('subcategory'),
    priority: supportTicketPriority('priority').notNull().default('medium'),
    status: supportTicketStatus('status').notNull().default('open'),
    description: text('description').notNull(),
    stepsToReproduce: text('steps_to_reproduce'),
    expectedBehavior: text('expected_behavior'),
    actualBehavior: text('actual_behavior'),
    errorMessage: text('error_message'),
    pageUrl: text('page_url'),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
    sessionInfo: jsonb('session_info').notNull().default(sql`'{}'::jsonb`),
    agentInfo: jsonb('agent_info').notNull().default(sql`'{}'::jsonb`),
    deviceInfo: jsonb('device_info').notNull().default(sql`'{}'::jsonb`),
    assignedTo: uuid('assigned_to').references(() => profiles.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),
    satisfactionRating: integer('satisfaction_rating'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('support_tickets_number_key').on(t.ticketNumber),
    index('support_tickets_user_idx').on(t.userId),
    index('support_tickets_status_idx').on(t.status),
    index('support_tickets_created_idx').on(t.createdAt),
    check('support_tickets_rating_check', sql`${t.satisfactionRating} BETWEEN 1 AND 5`),
  ],
)

export const supportTicketMessages = pgTable(
  'support_ticket_messages',
  {
    id: pk(),
    ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').references(() => profiles.id, { onDelete: 'set null' }),
    message: text('message').notNull(),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
    isInternal: boolean('is_internal').notNull().default(false),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('ticket_messages_ticket_idx').on(t.ticketId)],
)

export const portalFeedback = pgTable(
  'portal_feedback',
  {
    id: pk(),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    type: feedbackType('type').notNull().default('suggestion'),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    rating: integer('rating'),
    pageUrl: text('page_url'),
    isRead: boolean('is_read').notNull().default(false),
    isImplemented: boolean('is_implemented').notNull().default(false),
    adminNotes: text('admin_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('portal_feedback_user_idx').on(t.userId), check('portal_feedback_rating_check', sql`${t.rating} BETWEEN 1 AND 5`)],
)

export const technicalEvents = pgTable(
  'technical_events',
  {
    id: pk(),
    createdAt: createdAt(),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    type: technicalEventType('type').notNull().default('incident'),
    severity: technicalEventSeverity('severity').notNull().default('medium'),
    status: technicalEventStatus('status').notNull().default('active'),
    title: text('title').notNull(),
    content: text('content').notNull(),
    affectedServices: text('affected_services').array().notNull().default(sql`'{}'::text[]`),
    startAt: timestamp('start_at', { withTimezone: true }).notNull().defaultNow(),
    endAt: timestamp('end_at', { withTimezone: true }),
    mediaUrls: text('media_urls').array().notNull().default(sql`'{}'::text[]`),
    isGlobal: boolean('is_global').notNull().default(true),
  },
  (t) => [index('technical_events_status_idx').on(t.status), index('technical_events_created_idx').on(t.createdAt)],
)

export const technicalEventResponses = pgTable(
  'technical_event_responses',
  {
    id: pk(),
    eventId: uuid('event_id').notNull().references(() => technicalEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    message: text('message'),
    mediaUrls: text('media_urls').array().notNull().default(sql`'{}'::text[]`),
    isConfirmed: boolean('is_confirmed').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('technical_event_responses_unique').on(t.eventId, t.userId)],
)