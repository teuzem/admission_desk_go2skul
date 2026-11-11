import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import { universities } from './catalog.js'
import { eventBookingStatus, approvalStatus, blogReactionType } from './enums.js'

export const announcements = pgTable('announcements', {
  id: pk(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isImportant: boolean('is_important').notNull().default(false),
  featuredImageUrl: text('featured_image_url'),
  socialLink: text('social_link'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
}, (t) => [index('announcements_published_idx').on(t.publishedAt)])

export const events = pgTable('events', {
  id: pk(),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  location: text('location'),
  isOnline: boolean('is_online').notNull().default(false),
  meetingLink: text('meeting_link'),
  maxAttendees: integer('max_attendees'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('events_date_idx').on(t.eventDate)])

export const eventBookings = pgTable(
  'event_bookings',
  {
    id: pk(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    status: eventBookingStatus('status').notNull().default('confirmed'),
    bookedAt: timestamp('booked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('event_bookings_unique').on(t.eventId, t.agentId)],
)

export const eventTeamBookings = pgTable('event_team_bookings', {
  id: pk(),
  eventBookingId: uuid('event_booking_id').notNull().references(() => eventBookings.id, { onDelete: 'cascade' }),
  teamMemberName: text('team_member_name').notNull(),
  teamMemberEmail: text('team_member_email'),
  createdAt: createdAt(),
})

export const eventProposals = pgTable(
  'event_proposals',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    proposedType: text('proposed_type').notNull(),
    proposedDate: timestamp('proposed_date', { withTimezone: true }),
    proposedLocation: text('proposed_location'),
    isOnline: boolean('is_online').notNull().default(false),
    expectedAudience: integer('expected_audience'),
    topics: text('topics').array(),
    status: approvalStatus('status').notNull().default('pending'),
    adminNotes: text('admin_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('event_proposals_agent_idx').on(t.agentId)],
)

export const newsPosts = pgTable('news_posts', {
  id: pk(),
  title: text('title').notNull(),
  content: text('content'),
  imageUrl: text('image_url'),
  category: text('category'),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('news_posts_published_idx').on(t.isPublished, t.publishedAt)])

export const blogPosts = pgTable('blog_posts', {
  id: pk(),
  title: text('title').notNull(),
  slug: text('slug'),
  content: text('content'),
  excerpt: text('excerpt'),
  featuredImageUrl: text('featured_image_url'),
  category: text('category'),
  tags: text('tags').array(),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('blog_posts_slug_key').on(t.slug), index('blog_posts_published_idx').on(t.isPublished, t.publishedAt)])

export const blogComments = pgTable(
  'blog_comments',
  {
    id: pk(),
    blogPostId: uuid('blog_post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    content: text('content').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('blog_comments_post_idx').on(t.blogPostId)],
)

export const blogReactions = pgTable(
  'blog_reactions',
  {
    id: pk(),
    blogPostId: uuid('blog_post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    reactionType: blogReactionType('reaction_type').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('blog_reactions_unique').on(t.blogPostId, t.userId, t.reactionType)],
)