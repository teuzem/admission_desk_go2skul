import { pgTable, uuid, text, boolean, doublePrecision, bigint, timestamp, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './common.js'
import { profiles } from './auth.js'
import { messageType } from './enums.js'

export const messages = pgTable(
  'messages',
  {
    id: pk(),
    conversationId: uuid('conversation_id'),
    senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    senderRole: text('sender_role').notNull(),
    recipientId: uuid('recipient_id').references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull().default(''),
    messageType: messageType('message_type').notNull().default('text'),
    caption: text('caption'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('messages_sender_idx').on(t.senderId),
    index('messages_recipient_idx').on(t.recipientId),
    index('messages_conversation_idx').on(t.conversationId),
    index('messages_created_idx').on(t.createdAt),
  ],
)

export const messageAttachments = pgTable(
  'message_attachments',
  {
    id: pk(),
    messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileType: text('file_type'),
    fileSize: bigint('file_size', { mode: 'number' }),
    createdAt: createdAt(),
  },
  (t) => [index('message_attachments_message_idx').on(t.messageId)],
)