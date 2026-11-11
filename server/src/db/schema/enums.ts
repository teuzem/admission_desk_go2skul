import { pgEnum } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', [
  'agent',
  'admin',
  'editor',
  'admission_manager',
  'program_manager',
  'technical_team',
  'contract_manager',
])

export const kycStatus = pgEnum('kyc_status', ['pending', 'under_review', 'approved', 'rejected'])

export const applicationStatus = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'offer',
  'accepted',
  'rejected',
  'enrolled',
])

export const agentCategory = pgEnum('agent_category', [
  'student_recruitment_agency',
  'travel_agency',
  'university_institute',
  'secondary_high_school',
  'vocational_training_center',
  'language_center',
  'pending_classification',
])

export const teamMemberStatus = pgEnum('team_member_status', ['pending', 'active', 'disabled'])
export const admissionTeamStatus = pgEnum('admission_team_status', ['active', 'inactive', 'pending', 'suspended'])
export const eventBookingStatus = pgEnum('event_booking_status', ['confirmed', 'cancelled', 'waitlisted'])
export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected'])
export const inviteStatus = pgEnum('invite_status', ['pending', 'approved', 'rejected', 'registered'])

export const contractStatus = pgEnum('contract_status', [
  'pending_review',
  'under_verification',
  'information_requested',
  'approved',
  'suspended',
  'revoked',
  'blocked',
  'rejected',
])

export const complianceStatus = pgEnum('compliance_status', [
  'pending',
  'compliant',
  'non_compliant',
  'under_investigation',
])

export const requestPriority = pgEnum('request_priority', ['low', 'normal', 'high', 'urgent'])

export const supportTicketStatus = pgEnum('support_ticket_status', [
  'open',
  'in_progress',
  'awaiting_response',
  'resolved',
  'closed',
])

export const supportTicketPriority = pgEnum('support_ticket_priority', ['low', 'medium', 'high', 'urgent', 'critical'])
export const kbArticleStatus = pgEnum('kb_article_status', ['draft', 'published', 'archived'])
export const feedbackType = pgEnum('feedback_type', ['suggestion', 'complaint', 'compliment', 'bug_report', 'other'])
export const technicalEventType = pgEnum('technical_event_type', ['incident', 'maintenance', 'update', 'alert'])
export const technicalEventSeverity = pgEnum('technical_event_severity', ['low', 'medium', 'high', 'critical'])
export const technicalEventStatus = pgEnum('technical_event_status', ['active', 'resolved', 'scheduled', 'archived'])

export const permissionScope = pgEnum('permission_scope', ['read', 'write', 'manage'])
export const teamPermissionType = pgEnum('team_permission_type', [
  'applications_view',
  'applications_review',
  'applications_manage',
  'documents_view',
  'documents_manage',
  'messages_view',
  'messages_send',
  'analytics_view',
  'team_manage',
])

export const educationStatus = pgEnum('education_status', ['graduated', 'in_progress', 'withdrawn', 'deferred'])
export const employmentType = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
  'volunteer',
])

export const commentType = pgEnum('comment_type', ['comment', 'document_request', 'status_update', 'system'])
export const deviceType = pgEnum('device_type', ['desktop', 'mobile', 'tablet', 'unknown'])
export const blogReactionType = pgEnum('blog_reaction_type', ['like', 'love', 'insightful', 'clap'])

export const assignmentType = pgEnum('assignment_type', ['review', 'processing', 'escalation', 'consultation'])
export const assignmentStatus = pgEnum('assignment_status', ['assigned', 'in_progress', 'completed', 'reassigned', 'cancelled'])
export const categoryReviewStatus = pgEnum('category_review_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'needs_more_info',
])
export const verificationStatus = pgEnum('verification_status', ['pending', 'verified', 'rejected'])
export const submissionType = pgEnum('submission_type', ['program', 'university'])
export const emailTokenPurpose = pgEnum('email_token_purpose', ['verify_email', 'reset_password'])
export const mfaFactorType = pgEnum('mfa_factor_type', ['totp'])
export const messageType = pgEnum('message_type', ['text', 'document', 'location'])