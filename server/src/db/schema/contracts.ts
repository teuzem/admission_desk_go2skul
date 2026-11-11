import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './common.js'
import { profiles } from './auth.js'
import { contractStatus, complianceStatus, agentCategory, requestPriority } from './enums.js'

export const agentContracts = pgTable(
  'agent_contracts',
  {
    id: pk(),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    status: contractStatus('status').notNull().default('pending_review'),
    category: agentCategory('category').notNull().default('pending_classification'),
    verificationNotes: text('verification_notes'),
    complianceStatus: complianceStatus('compliance_status').notNull().default('pending'),
    complianceNotes: text('compliance_notes'),
    hasPolicyViolation: boolean('has_policy_violation').notNull().default(false),
    violationType: text('violation_type'),
    violationDescription: text('violation_description'),
    violationReportedAt: timestamp('violation_reported_at', { withTimezone: true }),
    violationReportedBy: uuid('violation_reported_by').references(() => profiles.id),
    actionReason: text('action_reason'),
    actionTakenBy: uuid('action_taken_by').references(() => profiles.id),
    actionTakenAt: timestamp('action_taken_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => profiles.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    documentsRequested: jsonb('documents_requested').notNull().default(sql`'[]'::jsonb`),
    documentsReceived: jsonb('documents_received').notNull().default(sql`'[]'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('agent_contracts_agent_key').on(t.agentId), index('agent_contracts_status_idx').on(t.status)],
)

export const agentContractActivity = pgTable(
  'agent_contract_activity',
  {
    id: pk(),
    contractId: uuid('contract_id').notNull().references(() => agentContracts.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    previousStatus: text('previous_status'),
    newStatus: text('new_status'),
    reason: text('reason'),
    notes: text('notes'),
    performedBy: uuid('performed_by').notNull().references(() => profiles.id),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('contract_activity_contract_idx').on(t.contractId), index('contract_activity_agent_idx').on(t.agentId)],
)

export const contractDocumentRequests = pgTable(
  'contract_document_requests',
  {
    id: pk(),
    contractId: uuid('contract_id').notNull().references(() => agentContracts.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    documentType: text('document_type').notNull(),
    description: text('description'),
    isMandatory: boolean('is_mandatory').notNull().default(true),
    isFulfilled: boolean('is_fulfilled').notNull().default(false),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    fulfilledDocUrl: text('fulfilled_doc_url'),
    requestedBy: uuid('requested_by').notNull().references(() => profiles.id),
    priority: requestPriority('priority').notNull().default('normal'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    agentNote: text('agent_note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('contract_doc_requests_contract_idx').on(t.contractId), index('contract_doc_requests_agent_idx').on(t.agentId)],
)

export const contractTeamNotes = pgTable(
  'contract_team_notes',
  {
    id: pk(),
    contractId: uuid('contract_id').references(() => agentContracts.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => profiles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull().references(() => profiles.id),
    noteType: text('note_type').notNull().default('general'),
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('contract_notes_contract_idx').on(t.contractId)],
)