// Extended database types for Enterprise Support System

import { Json } from './database';

// ─── Support Ticket Types ────────────────────────────────────────────────────
export type SupportTicketStatus = 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type KbArticleStatus = 'draft' | 'published' | 'archived';

export const TICKET_CATEGORIES = [
  { value: 'login_authentication', label: 'Login & Authentication', icon: 'Lock' },
  { value: 'account_access', label: 'Account Access', icon: 'UserX' },
  { value: 'application_submission', label: 'Application Submission', icon: 'FileText' },
  { value: 'document_upload', label: 'Document Upload', icon: 'Upload' },
  { value: 'university_programs', label: 'University & Programs', icon: 'GraduationCap' },
  { value: 'profile_settings', label: 'Profile & Settings', icon: 'Settings' },
  { value: 'notification_email', label: 'Notifications & Email', icon: 'Bell' },
  { value: 'performance_speed', label: 'Performance & Speed', icon: 'Zap' },
  { value: 'mobile_responsive', label: 'Mobile & Responsive', icon: 'Smartphone' },
  { value: 'data_export', label: 'Data & Export', icon: 'Download' },
  { value: 'security_privacy', label: 'Security & Privacy', icon: 'Shield' },
  { value: 'browser_compatibility', label: 'Browser Compatibility', icon: 'Globe' },
  { value: 'feature_request', label: 'Feature Request', icon: 'Lightbulb' },
  { value: 'bug_report', label: 'Bug Report', icon: 'Bug' },
  { value: 'other', label: 'Other', icon: 'HelpCircle' },
] as const;

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'medium', label: 'Medium', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'high', label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'urgent', label: 'Urgent', color: '#ea580c', bg: '#fff7ed' },
  { value: 'critical', label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
] as const;

export const TICKET_STATUSES = [
  { value: 'open', label: 'Open', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'awaiting_response', label: 'Awaiting Response', color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'resolved', label: 'Resolved', color: '#10b981', bg: '#ecfdf5' },
  { value: 'closed', label: 'Closed', color: '#6b7280', bg: '#f9fafb' },
] as const;

export interface SupportAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface SessionInfo {
  ua: string;
  lang: string;
  href: string;
  ts: string;
  timezone?: string;
}

export interface AgentInfo {
  name: string;
  email: string;
  agency: string;
  role: string;
  phone: string;
  country: string;
  city: string;
}

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screen: string;
  deviceType: string;
  platform: string;
}

// ─── Agent Category Types ───────────────────────────────────────────────────

export type AgentCategory = 
  | 'student_travel_agency' 
  | 'university_institution' 
  | 'secondary_high_school' 
  | 'language_center' 
  | 'pending_classification';

export interface AgentCategoryDetail {
  label: string;
  color: string;
  shortLabel: string;
  description: string;
}

export const AGENT_CATEGORY_CONFIG: Record<AgentCategory, AgentCategoryDetail> = {
  student_travel_agency: {
    label: 'Student Travel Agency',
    color: '#3b82f6',
    shortLabel: 'STA',
    description: 'Agencies focusing on student travel and study abroad'
  },
  university_institution: {
    label: 'University / Institution',
    color: '#10b981',
    shortLabel: 'UNI',
    description: 'Higher education institutions or their direct representatives'
  },
  secondary_high_school: {
    label: 'Secondary / High School',
    color: '#8b5cf6',
    shortLabel: 'SCH',
    description: 'High schools and secondary education providers'
  },
  language_center: {
    label: 'Language Center',
    color: '#f59e0b',
    shortLabel: 'LAN',
    description: 'Specialized language training and preparation centers'
  },
  pending_classification: {
    label: 'Pending Classification',
    color: '#94a3b8',
    shortLabel: 'PEN',
    description: 'Agents waiting for category classification'
  }
};

// ─── Team Management Types ───────────────────────────────────────────────────

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

export type TeamMemberStatus = 'active' | 'pending' | 'inactive' | 'suspended';

export interface TeamGeographicScope {
  scope_type: 'country' | 'region';
  scope_id: string;
  can_view: boolean;
  can_review: boolean;
  can_manage: boolean;
}

export interface TeamCategoryScope {
  category: AgentCategory;
  can_view: boolean;
  can_review: boolean;
  can_manage: boolean;
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
  geographic_scope: TeamGeographicScope[];
  category_scope: TeamCategoryScope[];
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export const CHART_COLORS = [
  '#3A4391', // Primary Blue
  '#00CCA0', // Success Green
  '#3b82f6', // Light Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];
