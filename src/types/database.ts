// Database type definitions for Admission Desk Supabase schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'agent' | 'admin' | 'editor' | 'admission_manager' | 'program_manager'
export type KycStatus = 'pending' | 'under_review' | 'approved' | 'rejected'
export type TeamMemberStatus = 'pending' | 'active' | 'disabled'
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'offer' | 'accepted' | 'rejected' | 'enrolled'
export type EventBookingStatus = 'confirmed' | 'cancelled' | 'waitlisted'

export type ProfileRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  phone: string | null
  avatar_url: string | null
  cover_image_url: string | null
  country: string | null
  city: string | null
  bio: string | null
  agency_name: string | null
  trading_name: string | null
  company_email: string | null
  office_address: string | null
  office_country: string | null
  office_city: string | null
  postal_code: string | null
  website: string | null
  account_type: string | null
  gender: string | null
  date_of_birth: string | null
  department: string | null
  designation: string | null
  state_province: string | null
  timezone: string | null
  preferred_language: string | null
  is_super_agent: boolean
  is_super_admin: boolean
  is_two_factor_enabled: boolean
  kyc_status: KycStatus
  kyc_submitted_at: string | null
  is_active: boolean
  approved_by: string | null
  approved_at: string | null
  facebook_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  whatsapp_number: string | null
  telegram_id: string | null
  skype_id: string | null
  founded_year: number | null
  number_of_employees: string | null
  languages_spoken: string[] | null
  primary_market: string | null
  created_at: string
  updated_at: string
}

export type AdminUserInviteRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  invited_by: string
  status: 'pending' | 'approved' | 'rejected' | 'registered'
  admin_notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type AgentKycRow = {
  id: string
  agent_id: string
  business_licence_url: string | null
  company_registration_number: string | null
  incorporation_date: string | null
  expiry_date: string | null
  does_not_expire: boolean
  registered_address: string | null
  registered_city: string | null
  registered_country: string | null
  registered_postal_code: string | null
  is_same_address: boolean
  job_roles: string[]
  recruitment_regions: string[]
  represents_hq: boolean
  status: KycStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export type UniversityRow = {
  id: string
  name: string
  country: string
  region: string | null
  city: string | null
  about: string | null
  features: Json | null
  global_ranking: number | null
  logo_url: string | null
  image_url: string | null
  website_url: string | null
  description: string | null
  established: number | null
  ranking: string | null
  accreditation: string | null
  student_count: number | null
  acceptance_rate: number | null
  is_active: boolean
  is_multisite: boolean
  slug: string | null
  created_at: string
}

export type ProgramRow = {
  id: string
  university_id: string
  name: string
  level: string
  category: string | null
  duration_months: number | null
  duration: string | null
  tuition_fee: number | null
  currency: string | null
  language: string[]
  description: string | null
  requirements: string | null
  requirements_list: string[] | null
  application_deadline: string | null
  start_dates: string[]
  intake: string | null
  english_requirements: string | null
  prerequisites: string | null
  curriculum_summary: string | null
  application_fee: number | null
  img_url: string | null
  is_active: boolean
  is_all_campuses: boolean
  slug: string | null
  created_at: string
  scholarship_available: boolean
  campus_type: string | null
  delivery_mode: string
  accommodation_available: boolean
  visa_support: boolean
}

export type TeamMemberRow = {
  id: string
  agency_id: string
  invited_email: string
  name: string | null
  role: 'editor' | 'viewer'
  status: TeamMemberStatus
  created_at: string
}

export type AgentPartnerSelectionRow = {
  id: string
  agent_id: string
  university_id: string
  created_at: string
}

export type ApplicationRow = {
  id: string
  agent_id: string
  student_id: string | null
  university_id: string | null
  program_id: string | null
  status: ApplicationStatus
  notes: string | null
  intake_year: number | null
  intake_month: string | null
  transcript_url: string | null
  passport_url: string | null
  sop_url: string | null
  cv_url: string | null
  additional_docs: any[] | null
  english_test_url: string | null
  english_test_type: string | null
  english_test_score: string | null
  financial_proof_url: string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Extended workflow fields
  current_step: number | null
  progress_percent: number | null
  representative_name: string | null
  representative_email: string | null
  representative_phone: string | null
  representative_address: string | null
  representative_city: string | null
  representative_state: string | null
  representative_zip: string | null
  representative_country: string | null
  english_proficiency_method: string | null
  english_test_name: string | null
  english_trf_number: string | null
  english_test_date: string | null
  english_overall_score: string | null
  funding_source: string | null
  scholarship_release_auth: string | null
  applicant_signature: string | null
  signature_date: string | null
  terms_accepted: boolean
  submission_reference: string | null
  submitted_at: string | null
  submission_snapshot: any | null
  no_work_experience: boolean
  no_work_experience_explanation: string | null
}

export type StudentRow = {
  id: string
  agent_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  nationality: string | null
  date_of_birth: string | null
  passport_number: string | null
  gender: string | null
  address: string | null
  country_of_residence: string | null
  highest_education: string | null
  current_institution: string | null
  created_at: string
  // Extended personal background fields
  prefix: string | null
  middle_name: string | null
  no_last_name_on_doc: boolean
  legal_name_confirmed: boolean
  preferred_name: string | null
  pronouns: string | null
  marital_status: string | null
  how_did_you_hear: string | null
  country_of_birth: string | null
  state_of_birth: string | null
  city_of_birth: string | null
  races: string[] | null
  is_hispanic_latino: boolean
  primary_phone: string | null
  secondary_phone: string | null
  home_country: string | null
  home_state: string | null
  home_city: string | null
  home_address_1: string | null
  home_address_2: string | null
  home_zip_code: string | null
  mailing_same_as_permanent: boolean
  mailing_country: string | null
  mailing_state: string | null
  mailing_city: string | null
  mailing_address_1: string | null
  mailing_address_2: string | null
  mailing_zip_code: string | null
  emergency_full_name: string | null
  emergency_relationship: string | null
  emergency_email: string | null
  emergency_phone: string | null
  emergency_country: string | null
  emergency_state: string | null
  emergency_city: string | null
  emergency_address_1: string | null
  emergency_address_2: string | null
  emergency_zip: string | null
  emergency_speaks_english: boolean
  primary_citizenship: string | null
  secondary_citizenship: string | null
  passport_expiry_date: string | null
  country_applying_from: string | null
}

// ─── New Admissions Workflow Tables ──────────────────────────────────────────

export type ApplicationStepStateRow = {
  id: string
  application_id: string
  step_number: number
  step_name: string
  is_completed: boolean
  form_data: any
  updated_at: string
}

export type EducationEntryRow = {
  id: string
  application_id: string
  level_of_study: string
  school_type: string | null
  country: string
  school_name: string
  ceeb_code: string | null
  status: 'graduated' | 'in_progress' | 'withdrawn' | 'deferred'
  graduation_date: string | null
  degree_obtained: string | null
  gpa_score: string | null
  start_date: string | null
  end_date: string | null
  transcript_url: string | null
  certificate_url: string | null
  sort_order: number
  created_at: string
}

export type WorkExperienceEntryRow = {
  id: string
  application_id: string
  employer_name: string
  job_title: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | 'volunteer'
  industry: string
  country: string
  city_state: string
  start_date: string
  end_date: string | null
  currently_working: boolean
  responsibilities: string
  reason_for_leaving: string | null
  recommendation_letter_url: string | null
  work_attestation_url: string | null
  additional_doc_url: string | null
  sort_order: number
  created_at: string
}

export type ApplicationDocumentRow = {
  id: string
  application_id: string
  document_type: string
  file_url: string
  file_name: string
  file_size: number | null
  document_number: string | null
  issue_date: string | null
  expiry_date: string | null
  notes: string | null
  is_mandatory: boolean
  sort_order: number
  created_at: string
}

export type AnnouncementRow = {
  id: string
  title: string
  content: string
  is_important: boolean
  featured_image_url: string | null
  social_link: string | null
  published_at: string
  created_at: string
  created_by: string | null
}

export type EventRow = {
  id: string
  title: string
  description: string | null
  event_type: string
  event_date: string
  end_date: string | null
  location: string | null
  is_online: boolean
  meeting_link: string | null
  max_attendees: number | null
  image_url: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export type EventBookingRow = {
  id: string
  event_id: string
  agent_id: string
  status: EventBookingStatus
  booked_at: string
}

export type UniversityCampusRow = {
  id: string
  university_id: string
  country: string
  city: string | null
  campus_name: string | null
  region: string | null
  address: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  student_count: number | null
  is_main: boolean
  is_active: boolean
  created_at: string
}

export type ProgramCampusAssignmentRow = {
  id: string
  program_id: string
  campus_id: string
  created_at: string
}

export type NewsPostRow = {
  id: string
  title: string
  content: string | null
  image_url: string | null
  category: string | null
  is_published: boolean
  published_at: string
  created_by: string | null
  created_at: string
}

export type BlogPostRow = {
  id: string
  title: string
  slug: string | null
  content: string | null
  excerpt: string | null
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  is_published: boolean
  published_at: string
  created_by: string | null
  created_at: string
}

export type BlogCommentRow = {
  id: string
  blog_post_id: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
}

export type BlogReactionRow = {
  id: string
  blog_post_id: string
  user_id: string
  reaction_type: 'like' | 'love' | 'insightful' | 'clap'
  created_at: string
}

export type EventProposalRow = {
  id: string
  agent_id: string
  title: string
  description: string | null
  proposed_type: string
  proposed_date: string | null
  proposed_location: string | null
  is_online: boolean
  expected_audience: number | null
  topics: string[] | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export type PartnerActivationRequestRow = {
  id: string
  agent_id: string
  university_id: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  company_name: string
  reason: string | null
  agreed_to_terms: boolean
  signature: string | null
  signed_at: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type ApplicationCommentRow = {
  id: string
  application_id: string
  author_id: string
  author_role: string
  content: string
  comment_type: 'comment' | 'document_request' | 'status_update' | 'system'
  attachments: any[]
  is_read: boolean
  created_at: string
  updated_at: string
}

export type PendingSubmissionRow = {
  id: string
  submitted_by: string
  submission_type: 'program' | 'university'
  payload: any
  status: 'pending' | 'approved' | 'rejected'
  reviewer_id: string | null
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type DocumentRequestRow = {
  id: string
  application_id: string
  requested_by: string
  document_type: string
  description: string | null
  is_fulfilled: boolean
  fulfilled_at: string | null
  fulfilled_doc_id: string | null
  is_auto_generated: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}

export type EventTeamBookingRow = {
  id: string
  event_booking_id: string
  team_member_name: string
  team_member_email: string | null
  created_at: string
}

// ─── Security & Device Management Tables ─────────────────────────────────────

export type UserDeviceRow = {
  id: string
  user_id: string
  device_name: string | null
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  ip_address: string | null
  city: string | null
  country: string | null
  region: string | null
  isp: string | null
  timezone: string | null
  latitude: number | null
  longitude: number | null
  postal_code: string | null
  is_current: boolean
  is_trusted: boolean
  last_active_at: string
  created_at: string
  user_agent: string | null
  metadata: any | null
}

export type SecurityAuditLogRow = {
  id: string
  user_id: string
  action: string
  ip_address: string | null
  device_info: string | null
  metadata: Record<string, any>
  created_at: string
}

export type UserSecuritySettingsRow = {
  id: string
  user_id: string
  login_notifications: boolean
  new_device_alerts: boolean
  session_timeout_minutes: number
  require_2fa_for_sensitive: boolean
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id?: string; email?: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      agent_kyc: {
        Row: AgentKycRow
        Insert: Partial<AgentKycRow> & { agent_id: string }
        Update: Partial<AgentKycRow>
        Relationships: []
      }
      universities: {
        Row: UniversityRow
        Insert: Partial<UniversityRow> & { name: string; country: string }
        Update: Partial<UniversityRow>
        Relationships: []
      }
      programs: {
        Row: ProgramRow
        Insert: Partial<ProgramRow> & { university_id: string; name: string; level: string }
        Update: Partial<ProgramRow>
        Relationships: []
      }
      team_members: {
        Row: TeamMemberRow
        Insert: Partial<TeamMemberRow> & { agency_id: string; invited_email: string }
        Update: Partial<TeamMemberRow>
        Relationships: []
      }
      agent_partner_selections: {
        Row: AgentPartnerSelectionRow
        Insert: { agent_id: string; university_id: string }
        Update: { agent_id?: string; university_id?: string }
        Relationships: []
      }
      applications: {
        Row: ApplicationRow
        Insert: Partial<ApplicationRow> & { agent_id: string }
        Update: Partial<ApplicationRow>
        Relationships: []
      }
      students: {
        Row: StudentRow
        Insert: Partial<StudentRow> & { agent_id: string; first_name: string; last_name: string; email: string }
        Update: Partial<StudentRow>
        Relationships: []
      }
      announcements: {
        Row: AnnouncementRow
        Insert: Partial<AnnouncementRow> & { title: string; content: string }
        Update: Partial<AnnouncementRow>
        Relationships: []
      }
      events: {
        Row: EventRow
        Insert: Partial<EventRow> & { title: string; event_date: string }
        Update: Partial<EventRow>
        Relationships: []
      }
      event_bookings: {
        Row: EventBookingRow
        Insert: Partial<EventBookingRow> & { event_id: string; agent_id: string }
        Update: Partial<EventBookingRow>
        Relationships: []
      }
      university_campuses: {
        Row: UniversityCampusRow
        Insert: Partial<UniversityCampusRow> & { university_id: string; country: string }
        Update: Partial<UniversityCampusRow>
        Relationships: []
      }
      program_campus_assignments: {
        Row: ProgramCampusAssignmentRow
        Insert: Partial<ProgramCampusAssignmentRow> & { program_id: string; campus_id: string }
        Update: Partial<ProgramCampusAssignmentRow>
        Relationships: []
      }
      news_posts: {
        Row: NewsPostRow
        Insert: Partial<NewsPostRow> & { title: string }
        Update: Partial<NewsPostRow>
        Relationships: []
      }
      blog_posts: {
        Row: BlogPostRow
        Insert: Partial<BlogPostRow> & { title: string }
        Update: Partial<BlogPostRow>
        Relationships: []
      }
      blog_comments: {
        Row: BlogCommentRow
        Insert: Partial<BlogCommentRow> & { blog_post_id: string; user_id: string; content: string }
        Update: Partial<BlogCommentRow>
        Relationships: []
      }
      blog_reactions: {
        Row: BlogReactionRow
        Insert: Partial<BlogReactionRow> & { blog_post_id: string; user_id: string; reaction_type: string }
        Update: Partial<BlogReactionRow>
        Relationships: []
      }
      event_proposals: {
        Row: EventProposalRow
        Insert: Partial<EventProposalRow> & { agent_id: string; title: string }
        Update: Partial<EventProposalRow>
        Relationships: []
      }
      event_team_bookings: {
        Row: EventTeamBookingRow
        Insert: Partial<EventTeamBookingRow> & { event_booking_id: string; team_member_name: string }
        Update: Partial<EventTeamBookingRow>
        Relationships: []
      }
      partner_activation_requests: {
        Row: PartnerActivationRequestRow
        Insert: Partial<PartnerActivationRequestRow> & { agent_id: string; university_id: string; contact_name: string; contact_email: string; company_name: string }
        Update: Partial<PartnerActivationRequestRow>
        Relationships: []
      }
      application_step_states: {
        Row: ApplicationStepStateRow
        Insert: Partial<ApplicationStepStateRow> & { application_id: string; step_number: number; step_name: string }
        Update: Partial<ApplicationStepStateRow>
        Relationships: []
      }
      education_entries: {
        Row: EducationEntryRow
        Insert: Partial<EducationEntryRow> & { application_id: string; level_of_study: string; country: string; school_name: string; status: string }
        Update: Partial<EducationEntryRow>
        Relationships: []
      }
      work_experience_entries: {
        Row: WorkExperienceEntryRow
        Insert: Partial<WorkExperienceEntryRow> & { application_id: string; employer_name: string; job_title: string; employment_type: string; industry: string; country: string; city_state: string; start_date: string; responsibilities: string }
        Update: Partial<WorkExperienceEntryRow>
        Relationships: []
      }
      application_documents: {
        Row: ApplicationDocumentRow
        Insert: Partial<ApplicationDocumentRow> & { application_id: string; document_type: string; file_url: string; file_name: string }
        Update: Partial<ApplicationDocumentRow>
        Relationships: []
      }
      application_comments: {
        Row: ApplicationCommentRow
        Insert: Partial<ApplicationCommentRow> & { application_id: string; author_id: string; author_role: string; content: string }
        Update: Partial<ApplicationCommentRow>
        Relationships: []
      }
      pending_submissions: {
        Row: PendingSubmissionRow
        Insert: Partial<PendingSubmissionRow> & { submitted_by: string; submission_type: string; payload: any }
        Update: Partial<PendingSubmissionRow>
        Relationships: []
      }
      document_requests: {
        Row: DocumentRequestRow
        Insert: Partial<DocumentRequestRow> & { application_id: string; requested_by: string; document_type: string }
        Update: Partial<ApplicationDocumentRow>
        Relationships: []
      }
      admin_user_invites: {
        Row: AdminUserInviteRow
        Insert: Partial<AdminUserInviteRow> & { email: string; invited_by: string }
        Update: Partial<AdminUserInviteRow>
        Relationships: []
      }
      messages: {
        Row: any
        Insert: any
        Update: any
        Relationships: []
      }
      message_attachments: {
        Row: any
        Insert: any
        Update: any
        Relationships: []
      }
      agent_notifications: {
        Row: any
        Insert: any
        Update: any
        Relationships: []
      }
      user_devices: {
        Row: UserDeviceRow
        Insert: Partial<UserDeviceRow> & { user_id: string }
        Update: Partial<UserDeviceRow>
        Relationships: []
      }
      security_audit_log: {
        Row: SecurityAuditLogRow
        Insert: Partial<SecurityAuditLogRow> & { user_id: string; action: string }
        Update: Partial<SecurityAuditLogRow>
        Relationships: []
      }
      user_security_settings: {
        Row: UserSecuritySettingsRow
        Insert: Partial<UserSecuritySettingsRow> & { user_id: string }
        Update: Partial<UserSecuritySettingsRow>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

