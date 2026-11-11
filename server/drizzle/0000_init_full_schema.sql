CREATE TYPE "public"."admission_team_status" AS ENUM('active', 'inactive', 'pending', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."agent_category" AS ENUM('student_recruitment_agency', 'travel_agency', 'university_institute', 'secondary_high_school', 'vocational_training_center', 'language_center', 'pending_classification');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'offer', 'accepted', 'rejected', 'enrolled');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'in_progress', 'completed', 'reassigned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assignment_type" AS ENUM('review', 'processing', 'escalation', 'consultation');--> statement-breakpoint
CREATE TYPE "public"."blog_reaction_type" AS ENUM('like', 'love', 'insightful', 'clap');--> statement-breakpoint
CREATE TYPE "public"."category_review_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'needs_more_info');--> statement-breakpoint
CREATE TYPE "public"."comment_type" AS ENUM('comment', 'document_request', 'status_update', 'system');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('pending', 'compliant', 'non_compliant', 'under_investigation');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('pending_review', 'under_verification', 'information_requested', 'approved', 'suspended', 'revoked', 'blocked', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('desktop', 'mobile', 'tablet', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."education_status" AS ENUM('graduated', 'in_progress', 'withdrawn', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."email_token_purpose" AS ENUM('verify_email', 'reset_password');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'freelance', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."event_booking_status" AS ENUM('confirmed', 'cancelled', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('suggestion', 'complaint', 'compliment', 'bug_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'approved', 'rejected', 'registered');--> statement-breakpoint
CREATE TYPE "public"."kb_article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'document', 'location');--> statement-breakpoint
CREATE TYPE "public"."mfa_factor_type" AS ENUM('totp');--> statement-breakpoint
CREATE TYPE "public"."permission_scope" AS ENUM('read', 'write', 'manage');--> statement-breakpoint
CREATE TYPE "public"."request_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('program', 'university');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent', 'critical');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'awaiting_response', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."team_member_status" AS ENUM('pending', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."team_permission_type" AS ENUM('applications_view', 'applications_review', 'applications_manage', 'documents_view', 'documents_manage', 'messages_view', 'messages_send', 'analytics_view', 'team_manage');--> statement-breakpoint
CREATE TYPE "public"."technical_event_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."technical_event_status" AS ENUM('active', 'resolved', 'scheduled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."technical_event_type" AS ENUM('incident', 'maintenance', 'update', 'alert');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('agent', 'admin', 'editor', 'admission_manager', 'program_manager', 'technical_team', 'contract_manager');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "admin_user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "user_role" NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "email_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "mfa_factor_type" DEFAULT 'totp' NOT NULL,
	"friendly_name" text,
	"secret_encrypted" text NOT NULL,
	"verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"phone" text,
	"avatar_url" text,
	"cover_image_url" text,
	"country" text,
	"city" text,
	"bio" text,
	"agency_name" text,
	"trading_name" text,
	"company_email" text,
	"office_address" text,
	"office_country" text,
	"office_city" text,
	"postal_code" text,
	"website" text,
	"account_type" text,
	"gender" text,
	"date_of_birth" text,
	"department" text,
	"designation" text,
	"state_province" text,
	"timezone" text,
	"preferred_language" text DEFAULT 'English',
	"is_super_agent" boolean DEFAULT false NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_two_factor_enabled" boolean DEFAULT false NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"kyc_submitted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"facebook_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"tiktok_url" text,
	"whatsapp_number" text,
	"telegram_id" text,
	"skype_id" text,
	"founded_year" integer,
	"number_of_employees" text,
	"languages_spoken" text[],
	"primary_market" text,
	"is_technical_team" boolean DEFAULT false NOT NULL,
	"parent_agency_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_hash" text,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"ip_address" text,
	"device_info" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_backup_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" text,
	"device_type" "device_type" DEFAULT 'unknown' NOT NULL,
	"browser" text,
	"browser_version" text,
	"os" text,
	"os_version" text,
	"ip_address" text,
	"city" text,
	"country" text,
	"region" text,
	"isp" text,
	"timezone" text,
	"latitude" numeric,
	"longitude" numeric,
	"postal_code" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_security_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_name" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_security_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"login_notifications" boolean DEFAULT true NOT NULL,
	"new_device_alerts" boolean DEFAULT true NOT NULL,
	"session_timeout_minutes" integer DEFAULT 60 NOT NULL,
	"require_2fa_for_sensitive" boolean DEFAULT false NOT NULL,
	"recovery_email" text,
	"phone_number" text,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"backup_codes_generated_at" timestamp with time zone,
	"security_keys_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"category" "agent_category" DEFAULT 'pending_classification' NOT NULL,
	"sub_category" text,
	"classification_notes" text,
	"classified_by" uuid,
	"classified_at" timestamp with time zone DEFAULT now(),
	"verification_status" "verification_status" DEFAULT 'verified' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_category_review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"requested_category" "agent_category",
	"submitted_documents" jsonb,
	"review_status" "category_review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"review_notes" text,
	"investigator_notes" text,
	"external_verification_status" text,
	"external_verification_url" text,
	"decision_made_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_global_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_kyc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"business_licence_url" text,
	"company_registration_number" text,
	"incorporation_date" text,
	"expiry_date" text,
	"does_not_expire" boolean DEFAULT false NOT NULL,
	"registered_address" text,
	"registered_city" text,
	"registered_country" text,
	"registered_postal_code" text,
	"is_same_address" boolean DEFAULT false NOT NULL,
	"job_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"recruitment_regions" text[] DEFAULT '{}'::text[] NOT NULL,
	"represents_hq" boolean DEFAULT false NOT NULL,
	"status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_partner_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_activation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"company_name" text NOT NULL,
	"reason" text,
	"agreed_to_terms" boolean DEFAULT false NOT NULL,
	"signature" text,
	"signed_at" timestamp with time zone,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'editor' NOT NULL,
	"status" "team_member_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"region_id" uuid,
	"continent" text,
	"timezone" text,
	"population" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submission_type" "submission_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"reviewer_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_campus_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"campus_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"category" text,
	"duration_months" integer,
	"duration" text,
	"tuition_fee" numeric,
	"currency" text,
	"language" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"requirements" text,
	"requirements_list" text[],
	"application_deadline" text,
	"start_dates" text[] DEFAULT '{}'::text[] NOT NULL,
	"intake" text,
	"english_requirements" text,
	"prerequisites" text,
	"curriculum_summary" text,
	"application_fee" numeric,
	"img_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_all_campuses" boolean DEFAULT true NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scholarship_available" boolean DEFAULT false NOT NULL,
	"campus_type" text,
	"delivery_mode" text DEFAULT 'on_campus' NOT NULL,
	"accommodation_available" boolean DEFAULT false NOT NULL,
	"visa_support" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"country" text NOT NULL,
	"continent" text,
	"timezone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"city" text,
	"about" text,
	"features" jsonb,
	"global_ranking" integer,
	"logo_url" text,
	"image_url" text,
	"website_url" text,
	"description" text,
	"established" integer,
	"ranking" text,
	"accreditation" text,
	"student_count" integer,
	"acceptance_rate" numeric,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_multisite" boolean DEFAULT false NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"campus_name" text,
	"country" text NOT NULL,
	"city" text,
	"region" text,
	"address" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"website_url" text,
	"student_count" integer,
	"is_main" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"assigned_to" uuid NOT NULL,
	"assigned_by" uuid,
	"assignment_type" "assignment_type" DEFAULT 'review' NOT NULL,
	"status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"priority" "request_priority" DEFAULT 'normal' NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_role" text NOT NULL,
	"content" text NOT NULL,
	"comment_type" "comment_type" DEFAULT 'comment' NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"document_number" text,
	"issue_date" text,
	"expiry_date" text,
	"notes" text,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_step_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"form_data" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"student_id" uuid,
	"university_id" uuid,
	"program_id" uuid,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"intake_year" integer,
	"intake_month" text,
	"transcript_url" text,
	"passport_url" text,
	"sop_url" text,
	"cv_url" text,
	"additional_docs" jsonb DEFAULT '[]'::jsonb,
	"english_test_url" text,
	"english_test_type" text,
	"english_test_score" text,
	"financial_proof_url" text,
	"admin_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_step" integer DEFAULT 1,
	"progress_percent" integer DEFAULT 0,
	"representative_name" text,
	"representative_email" text,
	"representative_phone" text,
	"representative_address" text,
	"representative_city" text,
	"representative_state" text,
	"representative_zip" text,
	"representative_country" text,
	"english_proficiency_method" text,
	"english_test_name" text,
	"english_trf_number" text,
	"english_test_date" text,
	"english_overall_score" text,
	"funding_source" text,
	"scholarship_release_auth" text,
	"applicant_signature" text,
	"signature_date" text,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"submission_reference" text,
	"submitted_at" timestamp with time zone,
	"submission_snapshot" jsonb,
	"no_work_experience" boolean DEFAULT false NOT NULL,
	"no_work_experience_explanation" text
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"document_type" text NOT NULL,
	"description" text,
	"is_fulfilled" boolean DEFAULT false NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"fulfilled_doc_id" uuid,
	"is_auto_generated" boolean DEFAULT false NOT NULL,
	"priority" "request_priority" DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"level_of_study" text NOT NULL,
	"school_type" text,
	"country" text NOT NULL,
	"school_name" text NOT NULL,
	"ceeb_code" text,
	"status" "education_status" NOT NULL,
	"graduation_date" text,
	"degree_obtained" text,
	"gpa_score" text,
	"start_date" text,
	"end_date" text,
	"transcript_url" text,
	"certificate_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"nationality" text,
	"date_of_birth" text,
	"passport_number" text,
	"gender" text,
	"address" text,
	"country_of_residence" text,
	"highest_education" text,
	"current_institution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prefix" text,
	"middle_name" text,
	"no_last_name_on_doc" boolean DEFAULT false NOT NULL,
	"legal_name_confirmed" boolean DEFAULT false NOT NULL,
	"preferred_name" text,
	"pronouns" text,
	"marital_status" text,
	"how_did_you_hear" text,
	"country_of_birth" text,
	"state_of_birth" text,
	"city_of_birth" text,
	"races" text[],
	"is_hispanic_latino" boolean DEFAULT false NOT NULL,
	"primary_phone" text,
	"secondary_phone" text,
	"home_country" text,
	"home_state" text,
	"home_city" text,
	"home_address_1" text,
	"home_address_2" text,
	"home_zip_code" text,
	"mailing_same_as_permanent" boolean DEFAULT true NOT NULL,
	"mailing_country" text,
	"mailing_state" text,
	"mailing_city" text,
	"mailing_address_1" text,
	"mailing_address_2" text,
	"mailing_zip_code" text,
	"emergency_full_name" text,
	"emergency_relationship" text,
	"emergency_email" text,
	"emergency_phone" text,
	"emergency_country" text,
	"emergency_state" text,
	"emergency_city" text,
	"emergency_address_1" text,
	"emergency_address_2" text,
	"emergency_zip" text,
	"emergency_speaks_english" boolean DEFAULT false NOT NULL,
	"primary_citizenship" text,
	"secondary_citizenship" text,
	"passport_expiry_date" text,
	"country_applying_from" text
);
--> statement-breakpoint
CREATE TABLE "work_experience_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"job_title" text NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"industry" text NOT NULL,
	"country" text NOT NULL,
	"city_state" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"currently_working" boolean DEFAULT false NOT NULL,
	"responsibilities" text NOT NULL,
	"reason_for_leaving" text,
	"recommendation_letter_url" text,
	"work_attestation_url" text,
	"additional_doc_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_contract_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"reason" text,
	"notes" text,
	"performed_by" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" "contract_status" DEFAULT 'pending_review' NOT NULL,
	"category" "agent_category" DEFAULT 'pending_classification' NOT NULL,
	"verification_notes" text,
	"compliance_status" "compliance_status" DEFAULT 'pending' NOT NULL,
	"compliance_notes" text,
	"has_policy_violation" boolean DEFAULT false NOT NULL,
	"violation_type" text,
	"violation_description" text,
	"violation_reported_at" timestamp with time zone,
	"violation_reported_by" uuid,
	"action_reason" text,
	"action_taken_by" uuid,
	"action_taken_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"documents_requested" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"documents_received" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"description" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"is_fulfilled" boolean DEFAULT false NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"fulfilled_doc_url" text,
	"requested_by" uuid NOT NULL,
	"priority" "request_priority" DEFAULT 'normal' NOT NULL,
	"due_date" timestamp with time zone,
	"agent_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_team_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"agent_id" uuid,
	"author_id" uuid NOT NULL,
	"note_type" text DEFAULT 'general' NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"featured_image_url" text,
	"author_id" uuid,
	"status" "kb_article_status" DEFAULT 'draft' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"not_helpful_count" integer DEFAULT 0 NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'Book',
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "feedback_type" DEFAULT 'suggestion' NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"rating" integer,
	"page_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_implemented" boolean DEFAULT false NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_feedback_rating_check" CHECK ("portal_feedback"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" uuid,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text DEFAULT 'AD-' || LPAD(nextval('support_ticket_number_seq')::text, 6, '0') NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"priority" "support_ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"description" text NOT NULL,
	"steps_to_reproduce" text,
	"expected_behavior" text,
	"actual_behavior" text,
	"error_message" text,
	"page_url" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"session_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agent_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"device_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assigned_to" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"satisfaction_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_rating_check" CHECK ("support_tickets"."satisfaction_rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "technical_event_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text,
	"media_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"type" "technical_event_type" DEFAULT 'incident' NOT NULL,
	"severity" "technical_event_severity" DEFAULT 'medium' NOT NULL,
	"status" "technical_event_status" DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"affected_services" text[] DEFAULT '{}'::text[] NOT NULL,
	"start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"end_at" timestamp with time zone,
	"media_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_global" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	"featured_image_url" text,
	"social_link" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blog_post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"content" text,
	"excerpt" text,
	"featured_image_url" text,
	"category" text,
	"tags" text[],
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blog_post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction_type" "blog_reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" "event_booking_status" DEFAULT 'confirmed' NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"proposed_type" text NOT NULL,
	"proposed_date" timestamp with time zone,
	"proposed_location" text,
	"is_online" boolean DEFAULT false NOT NULL,
	"expected_audience" integer,
	"topics" text[],
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_team_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_booking_id" uuid NOT NULL,
	"team_member_name" text NOT NULL,
	"team_member_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" text NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"location" text,
	"is_online" boolean DEFAULT false NOT NULL,
	"meeting_link" text,
	"max_attendees" integer,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"image_url" text,
	"category" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"sender_id" uuid NOT NULL,
	"sender_role" text NOT NULL,
	"recipient_id" uuid,
	"content" text DEFAULT '' NOT NULL,
	"message_type" "message_type" DEFAULT 'text' NOT NULL,
	"caption" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_team_category_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"category" "agent_category" NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_review" boolean DEFAULT false NOT NULL,
	"can_manage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_team_geographic_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_review" boolean DEFAULT false NOT NULL,
	"can_manage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admission_manager_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'admission_staff' NOT NULL,
	"status" "admission_team_status" DEFAULT 'active' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_team_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"permission_type" "team_permission_type" NOT NULL,
	"scope" "permission_scope" DEFAULT 'read' NOT NULL,
	"is_granted" boolean DEFAULT true NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_performance_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_applications" integer DEFAULT 0 NOT NULL,
	"submitted_applications" integer DEFAULT 0 NOT NULL,
	"under_review_applications" integer DEFAULT 0 NOT NULL,
	"offers_given" integer DEFAULT 0 NOT NULL,
	"acceptances" integer DEFAULT 0 NOT NULL,
	"rejections" integer DEFAULT 0 NOT NULL,
	"enrollments" integer DEFAULT 0 NOT NULL,
	"average_processing_days" numeric(5, 2),
	"success_rate" numeric(5, 2),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text,
	"application_id" uuid,
	"agent_id" uuid,
	"university_id" uuid,
	"program_id" uuid,
	"user_id" uuid,
	"country_code" text,
	"region_code" text,
	"agent_category" "agent_category",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_analytics_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_applications" integer DEFAULT 0 NOT NULL,
	"applications_by_status" jsonb,
	"applications_by_country" jsonb,
	"applications_by_region" jsonb,
	"applications_by_university" jsonb,
	"applications_by_agent_category" jsonb,
	"applications_by_agent" jsonb,
	"average_processing_days" numeric(5, 2),
	"conversion_rate" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_applications" integer DEFAULT 0 NOT NULL,
	"pending_applications" integer DEFAULT 0 NOT NULL,
	"under_review_applications" integer DEFAULT 0 NOT NULL,
	"offers_given" integer DEFAULT 0 NOT NULL,
	"acceptances" integer DEFAULT 0 NOT NULL,
	"rejections" integer DEFAULT 0 NOT NULL,
	"enrollments" integer DEFAULT 0 NOT NULL,
	"average_processing_days" numeric(5, 2),
	"conversion_rate" numeric(5, 2),
	"top_countries" jsonb,
	"top_agents" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" bigint NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_user_invites" ADD CONSTRAINT "admin_user_invites_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_invites" ADD CONSTRAINT "admin_user_invites_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_log" ADD CONSTRAINT "security_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_backup_codes" ADD CONSTRAINT "user_backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_security_keys" ADD CONSTRAINT "user_security_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_classified_by_profiles_id_fk" FOREIGN KEY ("classified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_category_review_queue" ADD CONSTRAINT "agent_category_review_queue_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_category_review_queue" ADD CONSTRAINT "agent_category_review_queue_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_global_activities" ADD CONSTRAINT "agent_global_activities_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_kyc" ADD CONSTRAINT "agent_kyc_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_partner_selections" ADD CONSTRAINT "agent_partner_selections_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_partner_selections" ADD CONSTRAINT "agent_partner_selections_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_activation_requests" ADD CONSTRAINT "partner_activation_requests_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_activation_requests" ADD CONSTRAINT "partner_activation_requests_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_activation_requests" ADD CONSTRAINT "partner_activation_requests_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_agency_id_profiles_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_submissions" ADD CONSTRAINT "pending_submissions_submitted_by_profiles_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_submissions" ADD CONSTRAINT "pending_submissions_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_campus_assignments" ADD CONSTRAINT "program_campus_assignments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_campus_assignments" ADD CONSTRAINT "program_campus_assignments_campus_id_university_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."university_campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_campuses" ADD CONSTRAINT "university_campuses_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_assignments" ADD CONSTRAINT "application_assignments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_assignments" ADD CONSTRAINT "application_assignments_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_assignments" ADD CONSTRAINT "application_assignments_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_step_states" ADD CONSTRAINT "application_step_states_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_fulfilled_doc_id_application_documents_id_fk" FOREIGN KEY ("fulfilled_doc_id") REFERENCES "public"."application_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_entries" ADD CONSTRAINT "education_entries_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experience_entries" ADD CONSTRAINT "work_experience_entries_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_activity" ADD CONSTRAINT "agent_contract_activity_contract_id_agent_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."agent_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_activity" ADD CONSTRAINT "agent_contract_activity_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_activity" ADD CONSTRAINT "agent_contract_activity_performed_by_profiles_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_violation_reported_by_profiles_id_fk" FOREIGN KEY ("violation_reported_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_action_taken_by_profiles_id_fk" FOREIGN KEY ("action_taken_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contracts" ADD CONSTRAINT "agent_contracts_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_document_requests" ADD CONSTRAINT "contract_document_requests_contract_id_agent_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."agent_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_document_requests" ADD CONSTRAINT "contract_document_requests_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_document_requests" ADD CONSTRAINT "contract_document_requests_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_team_notes" ADD CONSTRAINT "contract_team_notes_contract_id_agent_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."agent_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_team_notes" ADD CONSTRAINT "contract_team_notes_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_team_notes" ADD CONSTRAINT "contract_team_notes_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_kb_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."kb_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_media" ADD CONSTRAINT "kb_media_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_feedback" ADD CONSTRAINT "portal_feedback_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_event_responses" ADD CONSTRAINT "technical_event_responses_event_id_technical_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."technical_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_event_responses" ADD CONSTRAINT "technical_event_responses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_events" ADD CONSTRAINT "technical_events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_reactions" ADD CONSTRAINT "blog_reactions_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_reactions" ADD CONSTRAINT "blog_reactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD CONSTRAINT "event_proposals_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_bookings" ADD CONSTRAINT "event_team_bookings_event_booking_id_event_bookings_id_fk" FOREIGN KEY ("event_booking_id") REFERENCES "public"."event_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_category_scope" ADD CONSTRAINT "admission_team_category_scope_team_member_id_admission_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."admission_team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_geographic_scope" ADD CONSTRAINT "admission_team_geographic_scope_team_member_id_admission_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."admission_team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_members" ADD CONSTRAINT "admission_team_members_admission_manager_id_profiles_id_fk" FOREIGN KEY ("admission_manager_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_members" ADD CONSTRAINT "admission_team_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_permissions" ADD CONSTRAINT "admission_team_permissions_team_member_id_admission_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."admission_team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_team_permissions" ADD CONSTRAINT "admission_team_permissions_granted_by_profiles_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_performance_analytics" ADD CONSTRAINT "agent_performance_analytics_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_analytics" ADD CONSTRAINT "university_analytics_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invites_email_key" ON "admin_user_invites" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "email_tokens_hash_key" ON "email_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_tokens_user_idx" ON "email_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mfa_factors_user_idx" ON "mfa_factors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_kyc_idx" ON "profiles" USING btree ("kyc_status");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_key" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_user_idx" ON "security_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_created_idx" ON "security_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_backup_codes_user_idx" ON "user_backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_devices_user_idx" ON "user_devices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_security_keys_credential_key" ON "user_security_keys" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "user_security_keys_user_idx" ON "user_security_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_security_settings_user_key" ON "user_security_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "agent_categories_agent_key" ON "agent_categories" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_categories_category_idx" ON "agent_categories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "category_review_agent_idx" ON "agent_category_review_queue" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "category_review_status_idx" ON "agent_category_review_queue" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "agent_activities_agent_idx" ON "agent_global_activities" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_activities_created_idx" ON "agent_global_activities" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_kyc_agent_key" ON "agent_kyc" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_partner_unique" ON "agent_partner_selections" USING btree ("agent_id","university_id");--> statement-breakpoint
CREATE INDEX "partner_activation_agent_idx" ON "partner_activation_requests" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "partner_activation_status_idx" ON "partner_activation_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_agency_email_key" ON "team_members" USING btree ("agency_id",lower("invited_email"));--> statement-breakpoint
CREATE INDEX "team_members_email_idx" ON "team_members" USING btree (lower("invited_email"));--> statement-breakpoint
CREATE UNIQUE INDEX "countries_code_key" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pending_submissions_status_idx" ON "pending_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pending_submissions_submitter_idx" ON "pending_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE UNIQUE INDEX "program_campus_unique" ON "program_campus_assignments" USING btree ("program_id","campus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_slug_key" ON "programs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "programs_university_idx" ON "programs" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "programs_level_idx" ON "programs" USING btree ("level");--> statement-breakpoint
CREATE UNIQUE INDEX "regions_code_key" ON "regions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "universities_slug_key" ON "universities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "universities_country_idx" ON "universities" USING btree ("country");--> statement-breakpoint
CREATE INDEX "campuses_university_idx" ON "university_campuses" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "assignments_app_idx" ON "application_assignments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "assignments_assignee_idx" ON "application_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "application_comments_app_idx" ON "application_comments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_comments_created_idx" ON "application_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "application_documents_app_idx" ON "application_documents" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_step_states_unique" ON "application_step_states" USING btree ("application_id","step_number");--> statement-breakpoint
CREATE INDEX "applications_agent_idx" ON "applications" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_student_idx" ON "applications" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "applications_university_idx" ON "applications" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "applications_created_idx" ON "applications" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_reference_key" ON "applications" USING btree ("submission_reference");--> statement-breakpoint
CREATE INDEX "document_requests_app_idx" ON "document_requests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "education_application_idx" ON "education_entries" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "students_agent_idx" ON "students" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "students_email_idx" ON "students" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "work_experience_application_idx" ON "work_experience_entries" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "contract_activity_contract_idx" ON "agent_contract_activity" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contract_activity_agent_idx" ON "agent_contract_activity" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_contracts_agent_key" ON "agent_contracts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_contracts_status_idx" ON "agent_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contract_doc_requests_contract_idx" ON "contract_document_requests" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contract_doc_requests_agent_idx" ON "contract_document_requests" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "contract_notes_contract_idx" ON "contract_team_notes" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_articles_slug_key" ON "kb_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "kb_articles_status_idx" ON "kb_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_articles_category_idx" ON "kb_articles" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_categories_slug_key" ON "kb_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "portal_feedback_user_idx" ON "portal_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_number_key" ON "support_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_created_idx" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "technical_event_responses_unique" ON "technical_event_responses" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "technical_events_status_idx" ON "technical_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "technical_events_created_idx" ON "technical_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "announcements_published_idx" ON "announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_comments_post_idx" ON "blog_comments" USING btree ("blog_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("is_published","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_reactions_unique" ON "blog_reactions" USING btree ("blog_post_id","user_id","reaction_type");--> statement-breakpoint
CREATE UNIQUE INDEX "event_bookings_unique" ON "event_bookings" USING btree ("event_id","agent_id");--> statement-breakpoint
CREATE INDEX "event_proposals_agent_idx" ON "event_proposals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "news_posts_published_idx" ON "news_posts" USING btree ("is_published","published_at");--> statement-breakpoint
CREATE INDEX "message_attachments_message_idx" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_team_category_unique" ON "admission_team_category_scope" USING btree ("team_member_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_team_geo_unique" ON "admission_team_geographic_scope" USING btree ("team_member_id","scope_type","scope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_team_manager_user_key" ON "admission_team_members" USING btree ("admission_manager_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_team_manager_email_key" ON "admission_team_members" USING btree ("admission_manager_id",lower("email"));--> statement-breakpoint
CREATE INDEX "admission_team_user_idx" ON "admission_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_team_perm_unique" ON "admission_team_permissions" USING btree ("team_member_id","permission_type");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_performance_period_key" ON "agent_performance_analytics" USING btree ("agent_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_events_created_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_agent_idx" ON "analytics_events" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_analytics_snapshot_date_key" ON "application_analytics_snapshot" USING btree ("snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "university_analytics_date_key" ON "university_analytics" USING btree ("university_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "files_bucket_path_key" ON "files" USING btree ("bucket","path");--> statement-breakpoint
CREATE INDEX "files_uploader_idx" ON "files" USING btree ("uploaded_by");