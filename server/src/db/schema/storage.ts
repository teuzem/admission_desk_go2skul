import { pgTable, uuid, text, boolean, bigint, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './common.js'
import { users } from './auth.js'

export const files = pgTable(
  'files',
  {
    id: pk(),
    bucket: text('bucket').notNull(),
    path: text('path').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('files_bucket_path_key').on(t.bucket, t.path), index('files_uploader_idx').on(t.uploadedBy)],
)