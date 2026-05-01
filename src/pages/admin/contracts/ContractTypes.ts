// Contract Management — Shared Types
import { UserRole } from '../../../types/database'

export type ContractStatus =
  | 'pending_review'
  | 'under_verification'
  | 'information_requested'
  | 'approved'
  | 'suspended'
  | 'revoked'
  | 'blocked'
  | 'rejected'

export type ContractCategory =
  | 'student_recruitment_agency'
  | 'travel_agency'
  | 'university_institute'
  | 'secondary_high_school'
  | 'vocational_training_center'
  | 'language_center'
  | 'pending_classification'

export type ComplianceStatus = 'pending' | 'compliant' | 'non_compliant' | 'under_investigation'

export interface AgentContract {
  id: string
  agent_id: string
  status: ContractStatus
  category: ContractCategory | null
  verification_notes: string | null
  compliance_status: ComplianceStatus
  compliance_notes: string | null
  has_policy_violation: boolean
  violation_type: string | null
  violation_description: string | null
  action_reason: string | null
  action_taken_at: string | null
  reviewed_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentWithContract {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  agency_name: string | null
  trading_name: string | null
  designation: string | null
  avatar_url: string | null
  phone: string | null
  country: string | null
  city: string | null
  office_address: string | null
  office_city: string | null
  office_country: string | null
  website: string | null
  bio: string | null
  account_type: string | null
  kyc_status: string
  founded_year: number | string | null
  number_of_employees: string | null
  primary_market: string | null
  languages_spoken: string[] | string | null
  facebook_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  whatsapp_number: string | null
  telegram_id: string | null
  skype_id: string | null
  role: UserRole
  cover_image_url: string | null
  created_at: string
  updated_at: string
  contract: AgentContract | null
}

export interface ContractActivity {
  id: string
  contract_id: string
  agent_id: string
  action: string
  previous_status: string | null
  new_status: string | null
  reason: string | null
  notes: string | null
  performed_by: string
  created_at: string
  performer?: { first_name: string | null; last_name: string | null; email: string }
}

export interface ContractDocRequest {
  id: string
  contract_id: string
  agent_id: string
  document_type: string
  description?: string
  is_mandatory: boolean
  is_fulfilled: boolean
  fulfilled_at?: string
  fulfilled_doc_url?: string
  agent_note?: string
  requested_by: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date?: string
  created_at: string
  updated_at: string
}

export interface AgentGlobalActivity {
  id: string
  agent_id: string
  activity_type: string
  description: string
  metadata?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface ContractNote {
  id: string
  contract_id: string | null
  agent_id: string | null
  author_id: string
  note_type: string
  content: string
  is_pinned: boolean
  created_at: string
  author?: { first_name: string | null; last_name: string | null; email: string }
}

// ─── Config Maps ───

export const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bg: string; border: string }> = {
  pending_review:        { label: 'Pending Review',       color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  under_verification:    { label: 'Under Verification',   color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  information_requested: { label: 'Info Requested',       color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  approved:              { label: 'Approved',              color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0' },
  suspended:             { label: 'Suspended',             color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  revoked:               { label: 'Revoked',               color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  blocked:               { label: 'Blocked',               color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  rejected:              { label: 'Rejected',              color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
}

export const CATEGORY_CONFIG: Record<ContractCategory, { label: string; color: string; short: string }> = {
  student_recruitment_agency: { label: 'Student Recruitment Agency', color: '#3b82f6', short: 'SRA' },
  travel_agency:              { label: 'Travel Agency',               color: '#06b6d4', short: 'TRA' },
  university_institute:       { label: 'University / Institute',      color: '#10b981', short: 'UNI' },
  secondary_high_school:      { label: 'Secondary / High School',     color: '#8b5cf6', short: 'SCH' },
  vocational_training_center: { label: 'Vocational Training Center',  color: '#f97316', short: 'VTC' },
  language_center:            { label: 'Language Center',             color: '#f59e0b', short: 'LAN' },
  pending_classification:     { label: 'Pending Classification',      color: '#94a3b8', short: 'PND' },
}

export const COMPLIANCE_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string }> = {
  pending:             { label: 'Pending',              color: '#94a3b8', bg: '#f8fafc' },
  compliant:           { label: 'Compliant',            color: '#10b981', bg: '#f0fdf4' },
  non_compliant:       { label: 'Non-Compliant',        color: '#ef4444', bg: '#fef2f2' },
  under_investigation: { label: 'Under Investigation',  color: '#f59e0b', bg: '#fffbeb' },
}
