import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { usePageRefetch } from '../../../lib/useRealtimeRecovery';
import './AdvancedAnalytics.css';
import {
  TeamMemberWithPermissions,
  AgentCategory,
  TeamPermissionType,
  AGENT_CATEGORY_CONFIG
} from '../../../types/database-extended';
import {
  Users, UserPlus, Settings, Shield, MapPin, Flag, CheckCircle,
  XCircle, Edit, Trash2, Eye, Search,
  ChevronDown, ChevronRight, Loader2, Save, X, AlertTriangle,
  UserCheck, Clock, Globe, Building2,
  Send, RefreshCw, Wifi
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// CUSTOM SVG ICONS (local replacements for lucide)
// ============================================================================

const FileText = ({ size }: { size?: number }) => (
  <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const MessageSquare = ({ size }: { size?: number }) => (
  <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BarChart3 = ({ size }: { size?: number }) => (
  <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface TeamManagementProps {
  userId: string;
  userRole: string;
}

interface InviteTeamMemberForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AVAILABLE_PERMISSIONS: { type: TeamPermissionType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'applications_view', label: 'View Applications', description: 'Can view assigned applications', icon: Eye },
  { type: 'applications_review', label: 'Review Applications', description: 'Can review and update status', icon: CheckCircle },
  { type: 'applications_manage', label: 'Manage Applications', description: 'Full application management', icon: Settings },
  { type: 'documents_view', label: 'View Documents', description: 'Can view application documents', icon: FileText },
  { type: 'documents_manage', label: 'Manage Documents', description: 'Can upload and manage documents', icon: FileText },
  { type: 'messages_view', label: 'View Messages', description: 'Can view application messages', icon: MessageSquare },
  { type: 'messages_send', label: 'Send Messages', description: 'Can send messages to agents', icon: Send },
  { type: 'analytics_view', label: 'View Analytics', description: 'Can view analytics dashboards', icon: BarChart3 },
  { type: 'team_manage', label: 'Manage Team', description: 'Can manage other team members', icon: Users }
];

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const LoadingSpinner = ({ size = 20 }: { size?: number }) => (
  <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: '#10b981', bg: '#f0fdf4', label: 'Active' },
    inactive: { color: '#94a3b8', bg: '#f8fafc', label: 'Inactive' },
    pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending' },
    suspended: { color: '#ef4444', bg: '#fef2f2', label: 'Suspended' }
  };
  const cfg = config[status] || config.pending;
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '99px',
      fontSize: '0.72rem',
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color
    }}>
      {cfg.label}
    </span>
  );
};

// ============================================================================
// TEAM MANAGEMENT COMPONENT
// ============================================================================

export default function TeamManagement({ userId, userRole }: TeamManagementProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithPermissions[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<TeamMemberWithPermissions | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteTeamMemberForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'admission_staff'
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<TeamPermissionType[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<AgentCategory[]>([]);

  // Common country list for geographic scope (hardcoded since the DB countries table may be empty)
  const commonCountries = [
    'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Cameroon', 'Tanzania', 'Ethiopia', 'Uganda',
    'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium',
    'United States', 'Canada', 'China', 'India', 'Japan', 'Australia', 'South Korea',
    'United Arab Emirates', 'Saudi Arabia', 'Turkey', 'Qatar',
    'Brazil', 'Mexico', 'Colombia', 'Argentina'
  ].sort();

  // Fetch team members with robust error handling
  const fetchTeamMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch team members (with profiles join via FK)
      const { data: membersData, error: membersError } = await supabase
        .from('admission_team_members' as any)
        .select('*')
        .eq('admission_manager_id', userId)
        .order('created_at', { ascending: false });

      if (membersError) {
        console.error('Team members query error:', membersError);
        throw new Error(`Failed to load team members: ${membersError.message}`);
      }

      const members = membersData || [];

      if (members.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch permissions, geographic scope, and category scope for all members
      const memberIds = members.map((m: any) => m.id);

      const [permissionsRes, geoScopeRes, catScopeRes] = await Promise.all([
        supabase
          .from('admission_team_permissions' as any)
          .select('*')
          .in('team_member_id', memberIds)
          .eq('is_granted', true),
        supabase
          .from('admission_team_geographic_scope' as any)
          .select('*')
          .in('team_member_id', memberIds),
        supabase
          .from('admission_team_category_scope' as any)
          .select('*')
          .in('team_member_id', memberIds)
      ]);

      // Also try to fetch profile info for user_ids
      const userIds = members.map((m: any) => m.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', userIds);
        
        (profilesData || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      const permissionsData = permissionsRes.data || [];
      const geoScopeData = geoScopeRes.data || [];
      const catScopeData = catScopeRes.data || [];

      // Step 3: Build the complete team member objects
      const membersWithPermissions: TeamMemberWithPermissions[] = members.map((member: any) => {
        const memberPerms = permissionsData.filter((p: any) => p.team_member_id === member.id);
        const memberGeoScope = geoScopeData.filter((g: any) => g.team_member_id === member.id);
        const memberCatScope = catScopeData.filter((c: any) => c.team_member_id === member.id);
        const profile = profilesMap[member.user_id];

        return {
          id: member.id,
          user_id: member.user_id,
          email: member.email,
          first_name: member.first_name || profile?.first_name || null,
          last_name: member.last_name || profile?.last_name || null,
          role: member.role || 'admission_staff',
          status: member.status || 'pending',
          permissions: memberPerms.map((p: any) => p.permission_type as TeamPermissionType),
          geographic_scope: memberGeoScope.map((g: any) => ({
            scope_type: g.scope_type || 'country',
            scope_id: g.scope_id,
            can_view: g.can_view ?? true,
            can_review: g.can_review ?? false,
            can_manage: g.can_manage ?? false
          })),
          category_scope: memberCatScope.map((c: any) => ({
            category: c.category,
            can_view: c.can_view ?? true,
            can_review: c.can_review ?? false,
            can_manage: c.can_manage ?? false
          }))
        };
      });

      setTeamMembers(membersWithPermissions);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initialize
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Real-time subscription for team changes
  useEffect(() => {
    const channel = supabase
      .channel('team_management_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_team_members' }, () => {
        fetchTeamMembers();
      })
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn('[TeamManagement] channel error:', status)
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamMembers]);

  // Invite team member
  const handleInviteMember = async () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }

    if (!inviteForm.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      // Check if user exists in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteForm.email)
        .maybeSingle();

      const userIdToUse = existingUser?.id || crypto.randomUUID();
      const memberStatus = existingUser ? 'active' : 'pending';

      // Create team member record
      const { data: newMember, error: createError } = await (supabase
        .from('admission_team_members' as any)
        .insert({
          admission_manager_id: userId,
          user_id: userIdToUse,
          email: inviteForm.email,
          first_name: inviteForm.firstName || null,
          last_name: inviteForm.lastName || null,
          role: inviteForm.role,
          status: memberStatus
        })
        .select()
        .single() as any);

      if (createError) {
        console.error('Create team member error:', createError);
        throw new Error(createError.message || 'Failed to create team member');
      }

      // Assign ALL selected permissions
      if (selectedPermissions.length > 0 && newMember) {
        const permissionInserts = selectedPermissions.map(p => ({
          team_member_id: newMember.id,
          permission_type: p,
          scope: 'write' as const,
          is_granted: true,
          granted_by: userId
        }));

        const { error: permError } = await (supabase
          .from('admission_team_permissions' as any)
          .insert(permissionInserts) as any);

        if (permError) {
          console.warn('Permission assignment partial failure:', permError);
        }
      }

      // Assign geographic scope
      if (selectedCountries.length > 0 && newMember) {
        const geoInserts = selectedCountries.map(c => ({
          team_member_id: newMember.id,
          scope_type: 'country' as const,
          scope_id: c,
          can_view: true,
          can_review: true,
          can_manage: false
        }));

        await (supabase.from('admission_team_geographic_scope' as any).insert(geoInserts) as any);
      }

      // Assign category scope
      if (selectedCategories.length > 0 && newMember) {
        const catInserts = selectedCategories.map(c => ({
          team_member_id: newMember.id,
          category: c,
          can_view: true,
          can_review: true,
          can_manage: false
        }));

        await (supabase.from('admission_team_category_scope' as any).insert(catInserts) as any);
      }

      const successMsg = existingUser
        ? `${inviteForm.email} added to your team as ${inviteForm.role.replace(/_/g, ' ')}`
        : `Invitation sent to ${inviteForm.email}`;
      toast.success(successMsg);

      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'admission_staff' });
      setSelectedPermissions([]);
      setSelectedCountries([]);
      setSelectedRegions([]);
      setSelectedCategories([]);
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Error inviting team member:', err);
      toast.error(err.message || 'Failed to add team member');
    } finally {
      setSubmitting(false);
    }
  };

  // Update team member
  const handleUpdateMember = async () => {
    if (!showEditModal) return;

    setSubmitting(true);
    try {
      // Update basic info
      const { error: updateError } = await (supabase
        .from('admission_team_members' as any)
        .update({
          first_name: showEditModal.first_name,
          last_name: showEditModal.last_name,
          role: showEditModal.role,
          status: showEditModal.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', showEditModal.id) as any);

      if (updateError) throw new Error(updateError.message);

      // Replace permissions: delete old, insert new
      await (supabase.from('admission_team_permissions' as any).delete().eq('team_member_id', showEditModal.id) as any);

      if (selectedPermissions.length > 0) {
        const permissionInserts = selectedPermissions.map(p => ({
          team_member_id: showEditModal.id,
          permission_type: p,
          scope: 'write' as const,
          is_granted: true,
          granted_by: userId
        }));
        await (supabase.from('admission_team_permissions' as any).insert(permissionInserts) as any);
      }

      // Replace geographic scope
      await (supabase.from('admission_team_geographic_scope' as any).delete().eq('team_member_id', showEditModal.id) as any);
      if (selectedCountries.length > 0) {
        const geoInserts = selectedCountries.map(c => ({
          team_member_id: showEditModal.id,
          scope_type: 'country' as const,
          scope_id: c,
          can_view: true,
          can_review: true,
          can_manage: false
        }));
        await (supabase.from('admission_team_geographic_scope' as any).insert(geoInserts) as any);
      }

      // Replace category scope
      await (supabase.from('admission_team_category_scope' as any).delete().eq('team_member_id', showEditModal.id) as any);
      if (selectedCategories.length > 0) {
        const catInserts = selectedCategories.map(c => ({
          team_member_id: showEditModal.id,
          category: c,
          can_view: true,
          can_review: true,
          can_manage: false
        }));
        await (supabase.from('admission_team_category_scope' as any).insert(catInserts) as any);
      }

      toast.success('Team member updated successfully');
      setShowEditModal(null);
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Error updating team member:', err);
      toast.error(err.message || 'Failed to update team member');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove team member (cascade deletes permissions, geo scope, cat scope via FK)
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member? All their permissions will be revoked.')) return;

    try {
      // Delete child records first (in case cascade isn't working)
      await Promise.all([
        supabase.from('admission_team_permissions' as any).delete().eq('team_member_id', memberId),
        supabase.from('admission_team_geographic_scope' as any).delete().eq('team_member_id', memberId),
        supabase.from('admission_team_category_scope' as any).delete().eq('team_member_id', memberId),
      ]);

      const { error } = await (supabase.from('admission_team_members' as any).delete().eq('id', memberId) as any);
      if (error) throw new Error(error.message);
      
      toast.success('Team member removed');
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Error removing team member:', err);
      toast.error(err.message || 'Failed to remove team member');
    }
  };

  // Toggle permission
  const togglePermission = (permission: TeamPermissionType) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Select all permissions
  const selectAllPermissions = () => {
    setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.type));
  };

  // Clear all permissions
  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch =
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="tm-container">
      {/* Header */}
      <div className="tm-header">
        <div className="tm-header-left">
          <Users size={24} />
          <div>
            <h1>Team Management</h1>
            <p>Manage your admission team members and their permissions</p>
          </div>
        </div>
        <div className="tm-header-actions">
          <button
            className="tm-btn tm-btn-outline"
            onClick={fetchTeamMembers}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="tm-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="tm-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="tm-btn tm-btn-primary" onClick={() => {
            setSelectedPermissions([]);
            setSelectedCountries([]);
            setSelectedCategories([]);
            setShowInviteModal(true);
          }}>
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ef4444'
        }}>
          <AlertTriangle size={18} />
          <span style={{ flex: 1, fontSize: '0.85rem' }}>{error}</span>
          <button
            onClick={fetchTeamMembers}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca',
              background: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              color: '#ef4444'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="tm-stats">
        <div className="tm-stat-card">
          <Users size={20} />
          <div>
            <span className="tm-stat-value">{teamMembers.length}</span>
            <span className="tm-stat-label">Total Members</span>
          </div>
        </div>
        <div className="tm-stat-card tm-stat-active">
          <UserCheck size={20} />
          <div>
            <span className="tm-stat-value">{teamMembers.filter(m => m.status === 'active').length}</span>
            <span className="tm-stat-label">Active</span>
          </div>
        </div>
        <div className="tm-stat-card tm-stat-pending">
          <Clock size={20} />
          <div>
            <span className="tm-stat-value">{teamMembers.filter(m => m.status === 'pending').length}</span>
            <span className="tm-stat-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      {loading ? (
        <div className="tm-loading">
          <LoadingSpinner size={40} />
          <p>Loading team members from Supabase...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="tm-empty">
          <Users size={48} />
          <h3>{teamMembers.length === 0 ? 'No team members yet' : 'No matches found'}</h3>
          <p>{teamMembers.length === 0
            ? 'Invite team members to help manage admissions'
            : 'Try adjusting your search or filters'
          }</p>
          {teamMembers.length === 0 && (
            <button className="tm-btn tm-btn-primary" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={18} />
              Invite First Member
            </button>
          )}
        </div>
      ) : (
        <div className="tm-members-list">
          {filteredMembers.map((member) => (
            <div key={member.id} className="tm-member-card">
              <div
                className="tm-member-header"
                onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
              >
                <div className="tm-member-avatar">
                  {(member.first_name?.[0] || member.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="tm-member-info">
                  <div className="tm-member-name">
                    {member.first_name || member.last_name
                      ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                      : member.email?.split('@')[0]
                    }
                    <StatusBadge status={member.status} />
                  </div>
                  <div className="tm-member-email">{member.email}</div>
                </div>
                <div className="tm-member-meta">
                  <span className="tm-member-role">{member.role.replace(/_/g, ' ')}</span>
                  <span className="tm-member-permissions">
                    {member.permissions.length} permission{member.permissions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button className="tm-expand-btn">
                  {expandedMember === member.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              </div>

              {expandedMember === member.id && (
                <div className="tm-member-details">
                  {/* Permissions */}
                  <div className="tm-detail-section">
                    <h4><Shield size={16} /> Permissions ({member.permissions.length})</h4>
                    <div className="tm-permissions-grid">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <div
                          key={perm.type}
                          className={`tm-permission-chip ${member.permissions.includes(perm.type) ? 'active' : ''}`}
                        >
                          <perm.icon size={14} />
                          {perm.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Geographic Scope */}
                  {member.geographic_scope.length > 0 && (
                    <div className="tm-detail-section">
                      <h4><MapPin size={16} /> Geographic Scope</h4>
                      <div className="tm-scope-tags">
                        {member.geographic_scope.map((scope) => (
                          <span key={scope.scope_id} className="tm-scope-tag">
                            <Flag size={12} />
                            {scope.scope_id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Scope */}
                  {member.category_scope.length > 0 && (
                    <div className="tm-detail-section">
                      <h4><Building2 size={16} /> Category Scope</h4>
                      <div className="tm-scope-tags">
                        {member.category_scope.map((scope) => (
                          <span
                            key={scope.category}
                            className="tm-scope-tag"
                            style={{
                              background: `${AGENT_CATEGORY_CONFIG[scope.category]?.color}20`,
                              color: AGENT_CATEGORY_CONFIG[scope.category]?.color
                            }}
                          >
                            {AGENT_CATEGORY_CONFIG[scope.category]?.shortLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="tm-member-actions">
                    <button
                      className="tm-btn tm-btn-outline"
                      onClick={() => {
                        setShowEditModal(member);
                        setSelectedPermissions([...member.permissions]);
                        setSelectedCountries(member.geographic_scope.map(g => g.scope_id));
                        setSelectedCategories(member.category_scope.map(c => c.category));
                      }}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      className="tm-btn tm-btn-danger"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="tm-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2><UserPlus size={20} /> Invite Team Member</h2>
              <button className="tm-modal-close" onClick={() => setShowInviteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="tm-modal-body">
              <div className="tm-form-group">
                <label>Email *</label>
                <input
                  type="email"
                  className="tm-form-input"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="member@example.com"
                />
              </div>
              <div className="tm-form-row">
                <div className="tm-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  />
                </div>
                <div className="tm-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="tm-form-group">
                <label>Role</label>
                <select
                  className="tm-form-input"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="admission_staff">Admission Staff</option>
                  <option value="admission_reviewer">Admission Reviewer</option>
                  <option value="admission_supervisor">Admission Supervisor</option>
                </select>
              </div>

              {/* Permissions */}
              <div className="tm-form-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} /> Permissions
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      style={{ fontSize: '0.72rem', color: '#3A4391', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="tm-permissions-list">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div
                      key={perm.type}
                      className={`tm-permission-checkbox ${selectedPermissions.includes(perm.type) ? 'selected' : ''}`}
                      onClick={() => togglePermission(perm.type)}
                    >
                      <div className="tm-checkbox">
                        {selectedPermissions.includes(perm.type) && <CheckCircle size={16} />}
                      </div>
                      <div className="tm-perm-info">
                        <span className="tm-perm-label">{perm.label}</span>
                        <span className="tm-perm-desc">{perm.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Scope */}
              <div className="tm-form-section">
                <h4><Globe size={16} /> Geographic Scope (Countries)</h4>
                <div className="tm-scope-selector">
                  <select
                    className="tm-form-input"
                    onChange={(e) => {
                      if (e.target.value && !selectedCountries.includes(e.target.value)) {
                        setSelectedCountries([...selectedCountries, e.target.value]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">Add country...</option>
                    {commonCountries
                      .filter(c => !selectedCountries.includes(c))
                      .map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                  <div className="tm-selected-tags">
                    {selectedCountries.map(c => (
                      <span key={c} className="tm-tag">
                        {c}
                        <button onClick={() => setSelectedCountries(selectedCountries.filter(x => x !== c))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Scope */}
              <div className="tm-form-section">
                <h4><Building2 size={16} /> Category Scope</h4>
                <div className="tm-category-selector">
                  {Object.entries(AGENT_CATEGORY_CONFIG).map(([key, config]) => (
                    <div
                      key={key}
                      className={`tm-category-chip ${selectedCategories.includes(key as AgentCategory) ? 'selected' : ''}`}
                      style={{
                        borderColor: selectedCategories.includes(key as AgentCategory) ? config.color : undefined,
                        background: selectedCategories.includes(key as AgentCategory) ? `${config.color}15` : undefined
                      }}
                      onClick={() => {
                        setSelectedCategories(prev =>
                          prev.includes(key as AgentCategory)
                            ? prev.filter(c => c !== key)
                            : [...prev, key as AgentCategory]
                        );
                      }}
                    >
                      <span className="tm-cat-label">{config.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="tm-modal-footer">
              <button className="tm-btn tm-btn-outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </button>
              <button className="tm-btn tm-btn-primary" onClick={handleInviteMember} disabled={submitting}>
                {submitting ? <LoadingSpinner /> : <Send size={16} />}
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="tm-modal-overlay" onClick={() => setShowEditModal(null)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2><Edit size={20} /> Edit Team Member</h2>
              <button className="tm-modal-close" onClick={() => setShowEditModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="tm-modal-body">
              <div className="tm-form-row">
                <div className="tm-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    value={showEditModal.first_name || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, first_name: e.target.value })}
                  />
                </div>
                <div className="tm-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    value={showEditModal.last_name || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="tm-form-group">
                <label>Role</label>
                <select
                  className="tm-form-input"
                  value={showEditModal.role}
                  onChange={(e) => setShowEditModal({ ...showEditModal, role: e.target.value })}
                >
                  <option value="admission_staff">Admission Staff</option>
                  <option value="admission_reviewer">Admission Reviewer</option>
                  <option value="admission_supervisor">Admission Supervisor</option>
                </select>
              </div>
              <div className="tm-form-group">
                <label>Status</label>
                <select
                  className="tm-form-input"
                  value={showEditModal.status}
                  onChange={(e) => setShowEditModal({ ...showEditModal, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Permissions */}
              <div className="tm-form-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} /> Permissions
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      style={{ fontSize: '0.72rem', color: '#3A4391', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="tm-permissions-list">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div
                      key={perm.type}
                      className={`tm-permission-checkbox ${selectedPermissions.includes(perm.type) ? 'selected' : ''}`}
                      onClick={() => togglePermission(perm.type)}
                    >
                      <div className="tm-checkbox">
                        {selectedPermissions.includes(perm.type) && <CheckCircle size={16} />}
                      </div>
                      <div className="tm-perm-info">
                        <span className="tm-perm-label">{perm.label}</span>
                        <span className="tm-perm-desc">{perm.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Scope */}
              <div className="tm-form-section">
                <h4><Globe size={16} /> Geographic Scope</h4>
                <div className="tm-scope-selector">
                  <select
                    className="tm-form-input"
                    onChange={(e) => {
                      if (e.target.value && !selectedCountries.includes(e.target.value)) {
                        setSelectedCountries([...selectedCountries, e.target.value]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">Add country...</option>
                    {commonCountries
                      .filter(c => !selectedCountries.includes(c))
                      .map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                  <div className="tm-selected-tags">
                    {selectedCountries.map(c => (
                      <span key={c} className="tm-tag">
                        {c}
                        <button onClick={() => setSelectedCountries(selectedCountries.filter(x => x !== c))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Scope */}
              <div className="tm-form-section">
                <h4><Building2 size={16} /> Category Scope</h4>
                <div className="tm-category-selector">
                  {Object.entries(AGENT_CATEGORY_CONFIG).map(([key, config]) => (
                    <div
                      key={key}
                      className={`tm-category-chip ${selectedCategories.includes(key as AgentCategory) ? 'selected' : ''}`}
                      style={{
                        borderColor: selectedCategories.includes(key as AgentCategory) ? config.color : undefined,
                        background: selectedCategories.includes(key as AgentCategory) ? `${config.color}15` : undefined
                      }}
                      onClick={() => {
                        setSelectedCategories(prev =>
                          prev.includes(key as AgentCategory)
                            ? prev.filter(c => c !== key)
                            : [...prev, key as AgentCategory]
                        );
                      }}
                    >
                      <span className="tm-cat-label">{config.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="tm-modal-footer">
              <button className="tm-btn tm-btn-outline" onClick={() => setShowEditModal(null)}>
                Cancel
              </button>
              <button className="tm-btn tm-btn-primary" onClick={handleUpdateMember} disabled={submitting}>
                {submitting ? <LoadingSpinner /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
