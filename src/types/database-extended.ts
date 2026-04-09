// Extended database type definitions for Admission Manager Analytics
// These extend the base database.ts types

export type AgentCategory =
  | 'student_travel_agency'
  | 'university_institution'
  | 'secondary_high_school'
  | 'language_center'
  | 'pending_classification';

export type PermissionScope = 'read' | 'write' | 'manage';

export type TeamPermissionType =
  | 'applications_view'
  | 'applications_review'
  | 'applications_manage'
  | 'documents_view'
  | 'documents_manage'
  | 'messages_view'
  | 'messages_send'
  | 'analytics_view'
  | 'team_manage';

export type AssignmentType = 'review' | 'processing' | 'escalation' | 'consultation';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'reassigned' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type TeamMemberStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// Agent Categories Table
export type AgentCategoryRow = {
  id: string;
  agent_id: string;
  category: AgentCategory;
  sub_category: string | null;
  classification_notes: string | null;
  classified_by: string | null;
  classified_at: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

// Regions Table
export type RegionRow = {
  id: string;
  name: string;
  code: string;
  country: string;
  continent: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
};

// Countries Table
export type CountryRow = {
  id: string;
  name: string;
  code: string;
  region_id: string | null;
  continent: string | null;
  timezone: string | null;
  population: number | null;
  is_active: boolean;
  created_at: string;
};

// Admission Team Members Table
export type AdmissionTeamMemberRow = {
  id: string;
  admission_manager_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
};

// Admission Team Permissions Table
export type AdmissionTeamPermissionRow = {
  id: string;
  team_member_id: string;
  permission_type: TeamPermissionType;
  scope: PermissionScope;
  is_granted: boolean;
  granted_by: string | null;
  granted_at: string | null;
  expires_at: string | null;
  created_at: string;
};

// Admission Team Geographic Scope Table
export type AdmissionTeamGeographicScopeRow = {
  id: string;
  team_member_id: string;
  scope_type: 'country' | 'region';
  scope_id: string;
  can_view: boolean;
  can_review: boolean;
  can_manage: boolean;
  created_at: string;
};

// Admission Team Category Scope Table
export type AdmissionTeamCategoryScopeRow = {
  id: string;
  team_member_id: string;
  category: AgentCategory;
  can_view: boolean;
  can_review: boolean;
  can_manage: boolean;
  created_at: string;
};

// Application Assignments Table
export type ApplicationAssignmentRow = {
  id: string;
  application_id: string;
  assigned_to: string;
  assigned_by: string | null;
  assignment_type: AssignmentType;
  status: AssignmentStatus;
  priority: Priority;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

// Analytics Events Table
export type AnalyticsEventRow = {
  id: string;
  event_type: string;
  event_category: string | null;
  application_id: string | null;
  agent_id: string | null;
  university_id: string | null;
  program_id: string | null;
  country_code: string | null;
  region_code: string | null;
  agent_category: AgentCategory | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Application Analytics Snapshot Table
export type ApplicationAnalyticsSnapshotRow = {
  id: string;
  snapshot_date: string;
  total_applications: number;
  applications_by_status: Record<string, number>;
  applications_by_country: Record<string, number>;
  applications_by_region: Record<string, number>;
  applications_by_university: Record<string, number>;
  applications_by_agent_category: Record<string, number>;
  applications_by_agent: Record<string, number>;
  average_processing_days: number | null;
  conversion_rate: number | null;
  created_at: string;
};

// Agent Performance Analytics Table
export type AgentPerformanceAnalyticsRow = {
  id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  total_applications: number;
  submitted_applications: number;
  under_review_applications: number;
  offers_given: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
  average_processing_days: number | null;
  success_rate: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// University Analytics Table
export type UniversityAnalyticsRow = {
  id: string;
  university_id: string;
  snapshot_date: string;
  total_applications: number;
  pending_applications: number;
  under_review_applications: number;
  offers_given: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
  average_processing_days: number | null;
  conversion_rate: number | null;
  top_countries: Array<{ country: string; count: number }> | null;
  top_agents: Array<{ agent_id: string; name: string; count: number }> | null;
  created_at: string;
};

// Agent Category Review Queue Table
export type AgentCategoryReviewQueueRow = {
  id: string;
  agent_id: string;
  requested_category: AgentCategory | null;
  submitted_documents: Record<string, unknown>[] | null;
  review_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_more_info';
  reviewed_by: string | null;
  review_notes: string | null;
  investigator_notes: string | null;
  external_verification_status: string | null;
  external_verification_url: string | null;
  decision_made_at: string | null;
  created_at: string;
  updated_at: string;
};

// Analytics Data Types for Charts
export interface CountryAnalytics {
  country: string;
  country_code: string;
  total_count: number;
  accepted_count: number;
  rejected_count: number;
  enrollment_count: number;
  percentage: number;
}

export interface RegionAnalytics {
  region_name: string;
  region_code: string;
  total_count: number;
  percentage: number;
}

export interface AgentCategoryAnalytics {
  category: string;
  category_label: string;
  total_count: number;
  accepted_count: number;
  success_rate: number;
  percentage: number;
  color: string;
}

export interface AgentPerformanceData {
  agent_id: string;
  agent_name: string;
  agency_name: string;
  category: AgentCategory | null;
  total_applications: number;
  submitted: number;
  under_review: number;
  offers: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
  success_rate: number;
  avg_processing_days: number;
}

export interface UniversityAnalyticsData {
  university_id: string;
  university_name: string;
  total_applications: number;
  pending: number;
  under_review: number;
  offers: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
  success_rate: number;
  avg_processing_days: number;
}

export interface TimelineData {
  date: string;
  applications: number;
  offers: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
}

export interface TopDestination {
  university_id: string;
  university_name: string;
  country: string;
  total_applications: number;
  offers: number;
  enrollments: number;
  acceptance_rate: number;
}

export interface TeamMemberWithPermissions {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: TeamMemberStatus;
  permissions: TeamPermissionType[];
  geographic_scope: Array<{
    scope_type: 'country' | 'region';
    scope_id: string;
    can_view: boolean;
    can_review: boolean;
    can_manage: boolean;
  }>;
  category_scope: Array<{
    category: AgentCategory;
    can_view: boolean;
    can_review: boolean;
    can_manage: boolean;
  }>;
}

// Agent Category Display Configuration
export const AGENT_CATEGORY_CONFIG: Record<AgentCategory, { label: string; shortLabel: string; color: string; description: string }> = {
  student_travel_agency: {
    label: 'Student & Travel Agencies',
    shortLabel: 'Student/Travel',
    color: '#3b82f6',
    description: 'Agencies specializing in student recruitment and travel services'
  },
  university_institution: {
    label: 'Universities & Institutions',
    shortLabel: 'Universities',
    color: '#8b5cf6',
    description: 'Educational institutions recruiting international students'
  },
  secondary_high_school: {
    label: 'Secondary & High Schools',
    shortLabel: 'High Schools',
    color: '#f59e0b',
    description: 'Secondary education institutions with international programs'
  },
  language_center: {
    label: 'Language Centers',
    shortLabel: 'Language Centers',
    color: '#10b981',
    description: 'Language training centers preparing students for study abroad'
  },
  pending_classification: {
    label: 'Pending Classification',
    shortLabel: 'Pending',
    color: '#94a3b8',
    description: 'Agents awaiting category classification after document review'
  }
};

// Region Color Configuration
export const REGION_COLORS: Record<string, string> = {
  'Europe': '#3b82f6',
  'North America': '#ef4444',
  'Asia Pacific': '#10b981',
  'Middle East': '#f59e0b',
  'Africa': '#8b5cf6',
  'Latin America': '#06b6d4'
};

// Chart Color Palette
export const CHART_COLORS = [
  '#3A4391', // Primary
  '#00CCA0', // Secondary
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#10b981', // Green
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
];
