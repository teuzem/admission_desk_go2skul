import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { listAgentKycDocs, getAgentKycDocUrl } from '../../../lib/storageHelpers';
import './AdvancedAnalytics.css';
import {
  AgentCategory,
  AGENT_CATEGORY_CONFIG
} from '../../../types/database-extended';
import {
  Briefcase, Building2, GraduationCap, Plane, Globe,
  Search, ChevronDown, ChevronRight, Loader2,
  CheckCircle, XCircle, Clock, AlertTriangle, FileText,
  Users, Edit, ExternalLink, X,
  Shield, Clipboard, FileCheck, Info, RefreshCw, Wifi,
  Mail, MapPin, Phone, Calendar, Eye, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface AgentCategoryManagementProps {
  userId: string;
  userRole: string;
  isSuperAdmin: boolean;
}

interface AgentWithCategory {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  agency_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  kyc_status: string;
  created_at: string;
  current_category: AgentCategory | null;
  classification_notes: string | null;
  verification_status: string | null;
  review_status: string | null;
  category_id: string | null;
}

interface ReviewQueueItem {
  id: string;
  agent_id: string;
  agent_email: string;
  agent_name: string;
  agency_name: string | null;
  avatar_url: string | null;
  requested_category: AgentCategory | null;
  review_status: string;
  review_notes: string | null;
  investigator_notes: string | null;
  external_verification_status: string | null;
  external_verification_url: string | null;
  created_at: string;
  decision_made_at: string | null;
}

interface KycDocument {
  name: string;
  url: string | null;
  size: number;
  created_at: string;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const LoadingSpinner = ({ size = 20 }: { size?: number }) => (
  <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
);

const CategoryBadge = ({ category }: { category: AgentCategory | string }) => {
  const config = AGENT_CATEGORY_CONFIG[category as AgentCategory] || { label: category, color: '#94a3b8', shortLabel: category };
  return (
    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: `${config.color}15`, color: config.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {config.shortLabel}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const m: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending Review' },
    under_review: { color: '#3b82f6', bg: '#eff6ff', label: 'Under Review' },
    approved: { color: '#10b981', bg: '#f0fdf4', label: 'Approved' },
    rejected: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
    needs_more_info: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Needs More Info' },
    verified: { color: '#10b981', bg: '#f0fdf4', label: 'Verified' },
    not_submitted: { color: '#94a3b8', bg: '#f8fafc', label: 'Not Submitted' },
  };
  const c = m[status] || m.pending;
  return <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: c.bg, color: c.color }}>{c.label}</span>;
};

const AgentAvatar = ({ agent, size = 44 }: { agent: { avatar_url?: string | null; first_name?: string | null; email?: string }; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  const hasImage = agent.avatar_url && !imgError;
  const initial = (agent.first_name?.[0] || agent.email?.[0] || '?').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: hasImage ? 'transparent' : 'linear-gradient(135deg, #3A4391, #00CCA0)',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38,
    }}>
      {hasImage ? (
        <img src={agent.avatar_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
      ) : initial}
    </div>
  );
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  student_travel_agency: Plane,
  university_institution: Building2,
  secondary_high_school: GraduationCap,
  language_center: Globe,
  pending_classification: Clock,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AgentCategoryManagement({ userId, userRole, isSuperAdmin }: AgentCategoryManagementProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'review_queue' | 'classified'>('all');
  const [agents, setAgents] = useState<AgentWithCategory[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentWithCategory | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ category: '' as AgentCategory, notes: '', investigatorNotes: '', externalVerificationUrl: '', status: 'approved' as string });
  const [submitting, setSubmitting] = useState(false);
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  const canManageCategories = isSuperAdmin || userRole === 'admin' || userRole === 'contract_manager' || userRole === 'admission_manager';

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all agents with full profile info
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agency_name, avatar_url, phone, country, city, website, kyc_status, created_at')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch agent categories
      const { data: categoriesData } = await supabase.from('agent_categories' as any).select('*') as any;

      // Fetch review queue
      const { data: reviewData } = await supabase.from('agent_category_review_queue' as any).select('*') as any;

      const agentsWithCategories: AgentWithCategory[] = (agentsData || []).map((agent: any) => {
        const category = categoriesData?.find((c: any) => c.agent_id === agent.id);
        const queueItem = reviewData?.find((q: any) => q.agent_id === agent.id && !['approved', 'rejected'].includes(q.review_status));
        return {
          id: agent.id,
          email: agent.email,
          first_name: agent.first_name,
          last_name: agent.last_name,
          agency_name: agent.agency_name,
          avatar_url: agent.avatar_url,
          phone: agent.phone,
          country: agent.country,
          city: agent.city,
          website: agent.website,
          kyc_status: agent.kyc_status,
          created_at: agent.created_at,
          current_category: category?.category || null,
          classification_notes: category?.classification_notes || null,
          verification_status: category?.verification_status || null,
          review_status: queueItem?.review_status || null,
          category_id: category?.id || null,
        };
      });

      setAgents(agentsWithCategories);
      setReviewQueue((reviewData || []).map((item: any) => {
        const agent = agentsData?.find((a: any) => a.id === item.agent_id);
        return {
          ...item,
          agent_email: agent?.email || '',
          agent_name: `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() || 'Unknown',
          agency_name: agent?.agency_name || null,
          avatar_url: agent?.avatar_url || null,
        };
      }));
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Real-time subscription
  useEffect(() => {
    const ch = supabase.channel('agent_cat_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_categories' }, () => { setIsRealtime(true); fetchAgents(); setTimeout(() => setIsRealtime(false), 2000); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_category_review_queue' }, () => { setIsRealtime(true); fetchAgents(); setTimeout(() => setIsRealtime(false), 2000); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchAgents(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAgents]);

  // Fetch KYC documents for an agent
  const fetchKycDocuments = async (agentId: string) => {
    setLoadingDocs(true);
    setKycDocs([]);
    try {
      const files = await listAgentKycDocs(agentId);
      const docs: KycDocument[] = [];
      for (const file of files) {
        const url = await getAgentKycDocUrl(agentId, file.name);
        docs.push({ name: file.name, url, size: file.metadata?.size || 0, created_at: file.created_at || '' });
      }
      setKycDocs(docs);
    } catch (err) {
      console.warn('Could not load KYC docs:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Classify agent
  const handleClassifyAgent = async () => {
    if (!selectedAgent || !reviewForm.category) {
      toast.error('Please select a category'); return;
    }
    setSubmitting(true);
    try {
      // Check if category record exists
      const { data: existingCategory } = await supabase
        .from('agent_categories' as any).select('id').eq('agent_id', selectedAgent.id).maybeSingle() as any;

      const categoryPayload = {
        category: reviewForm.category,
        classification_notes: reviewForm.notes || null,
        classified_by: userId,
        classified_at: new Date().toISOString(),
        verification_status: reviewForm.status === 'approved' ? 'verified' : reviewForm.status === 'rejected' ? 'rejected' : 'pending',
        verified_by: reviewForm.status === 'approved' ? userId : null,
        verified_at: reviewForm.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (existingCategory) {
        const { error } = await (supabase.from('agent_categories' as any).update(categoryPayload).eq('id', existingCategory.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('agent_categories' as any).insert({ agent_id: selectedAgent.id, ...categoryPayload }) as any);
        if (error) throw error;
      }

      // Update or create review queue entry
      const { data: queueItem } = await supabase
        .from('agent_category_review_queue' as any).select('id').eq('agent_id', selectedAgent.id).maybeSingle() as any;

      const queuePayload = {
        review_status: reviewForm.status,
        reviewed_by: userId,
        review_notes: reviewForm.notes || null,
        investigator_notes: reviewForm.investigatorNotes || null,
        requested_category: reviewForm.category,
        external_verification_status: reviewForm.status === 'approved' ? 'verified' : reviewForm.status,
        external_verification_url: reviewForm.externalVerificationUrl || null,
        decision_made_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (queueItem) {
        await (supabase.from('agent_category_review_queue' as any).update(queuePayload).eq('id', queueItem.id) as any);
      } else {
        await (supabase.from('agent_category_review_queue' as any).insert({ agent_id: selectedAgent.id, ...queuePayload }) as any);
      }

      toast.success(`Agent classified as ${AGENT_CATEGORY_CONFIG[reviewForm.category]?.label}`);
      setShowReviewModal(false);
      setSelectedAgent(null);
      setReviewForm({ category: '' as AgentCategory, notes: '', investigatorNotes: '', externalVerificationUrl: '', status: 'approved' });
      fetchAgents();
    } catch (error: any) {
      console.error('Error classifying agent:', error);
      toast.error(error.message || 'Failed to classify agent');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter
  const filteredAgents = agents.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = a.email?.toLowerCase().includes(q) || a.agency_name?.toLowerCase().includes(q) || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'all' || a.current_category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' && !a.current_category) || (statusFilter === 'classified' && a.current_category);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categoryStats = Object.keys(AGENT_CATEGORY_CONFIG).map(cat => ({
    category: cat as AgentCategory, ...AGENT_CATEGORY_CONFIG[cat as AgentCategory],
    count: agents.filter(a => a.current_category === cat).length
  }));

  const openClassifyModal = (agent: AgentWithCategory) => {
    setSelectedAgent(agent);
    setReviewForm({
      category: agent.current_category || '' as AgentCategory,
      notes: agent.classification_notes || '',
      investigatorNotes: '', externalVerificationUrl: '', status: 'approved'
    });
    setShowReviewModal(true);
    fetchKycDocuments(agent.id);
  };

  // Render agent card
  const renderAgentCard = (agent: AgentWithCategory) => (
    <div key={agent.id} className="acm-agent-card">
      <div className="acm-agent-main" onClick={() => setShowDetailPanel(showDetailPanel === agent.id ? null : agent.id)} style={{ cursor: 'pointer' }}>
        <AgentAvatar agent={agent} size={48} />
        <div className="acm-agent-info">
          <div className="acm-agent-name">
            {agent.first_name} {agent.last_name}
            {agent.agency_name && <span className="acm-agency-name">({agent.agency_name})</span>}
          </div>
          <div className="acm-agent-email">{agent.email}</div>
          {agent.country && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}><MapPin size={10} style={{ display: 'inline', marginRight: '4px' }} />{agent.city ? `${agent.city}, ` : ''}{agent.country}</div>}
        </div>
        <div className="acm-agent-category" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {agent.current_category ? <CategoryBadge category={agent.current_category} /> : <span className="acm-pending-badge">Pending</span>}
          <StatusBadge status={agent.verification_status || (agent.current_category ? 'verified' : 'not_submitted')} />
        </div>
        {canManageCategories && (
          <div className="acm-agent-actions">
            <button className="acm-btn acm-btn-outline" onClick={(e) => { e.stopPropagation(); openClassifyModal(agent); }}>
              <Edit size={14} /> {agent.current_category ? 'Reclassify' : 'Classify'}
            </button>
          </div>
        )}
        <button className="tm-expand-btn" style={{ marginLeft: '8px' }} onClick={(e) => { e.stopPropagation(); setShowDetailPanel(showDetailPanel === agent.id ? null : agent.id); }}>
          {showDetailPanel === agent.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Expanded Detail Panel */}
      {showDetailPanel === agent.id && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #f1f5f9', animation: 'slideDown 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1rem' }}>
            {/* Profile Info */}
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Profile Info</h4>
              <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span><Mail size={12} style={{ marginRight: '6px', opacity: 0.6 }} />{agent.email}</span>
                {agent.phone && <span><Phone size={12} style={{ marginRight: '6px', opacity: 0.6 }} />{agent.phone}</span>}
                {agent.country && <span><MapPin size={12} style={{ marginRight: '6px', opacity: 0.6 }} />{agent.city ? `${agent.city}, ` : ''}{agent.country}</span>}
                {agent.website && <a href={agent.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3A4391', textDecoration: 'none' }}><ExternalLink size={12} style={{ marginRight: '6px' }} />{agent.website}</a>}
                <span><Calendar size={12} style={{ marginRight: '6px', opacity: 0.6 }} />Joined: {new Date(agent.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* KYC Status */}
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> KYC Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <StatusBadge status={agent.kyc_status || 'pending'} />
                {agent.classification_notes && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', marginTop: '4px' }}>
                    <strong>Notes:</strong> {agent.classification_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Category Info */}
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} /> Classification</h4>
              {agent.current_category ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <CategoryBadge category={agent.current_category} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{AGENT_CATEGORY_CONFIG[agent.current_category]?.description}</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Not yet classified</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="acm-container">
      {/* Header */}
      <div className="acm-header">
        <div className="acm-header-left">
          <Shield size={24} />
          <div>
            <h1>Agent Category Management</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Classify and manage agent categories after document review
              {isRealtime && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}><Wifi size={12} /> Live</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={fetchAgents} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {canManageCategories && <span className="acm-info-badge"><Info size={14} /> You can classify agents</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="acm-stats-grid">
        {categoryStats.map(stat => (
          <div key={stat.category} className="acm-stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="acm-stat-value">{stat.count}</div>
            <div className="acm-stat-label">{stat.label}</div>
            <div className="acm-stat-bar"><div className="acm-stat-bar-fill" style={{ width: `${agents.length > 0 ? (stat.count / agents.length) * 100 : 0}%`, background: stat.color }} /></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="acm-tabs">
        <button className={`acm-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}><Users size={16} /> All Agents ({agents.length})</button>
        <button className={`acm-tab ${activeTab === 'review_queue' ? 'active' : ''}`} onClick={() => setActiveTab('review_queue')}><Clipboard size={16} /> Review Queue ({reviewQueue.filter(r => !['approved', 'rejected'].includes(r.review_status)).length})</button>
        <button className={`acm-tab ${activeTab === 'classified' ? 'active' : ''}`} onClick={() => setActiveTab('classified')}><FileCheck size={16} /> Classified ({agents.filter(a => a.current_category).length})</button>
      </div>

      {/* Filters */}
      <div className="acm-filters">
        <div className="acm-search"><Search size={18} /><input type="text" placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <select className="acm-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {Object.entries(AGENT_CATEGORY_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
        </select>
        <select className="acm-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending Classification</option>
          <option value="classified">Classified</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="acm-loading"><LoadingSpinner size={40} /><p>Loading agents from Supabase...</p></div>
      ) : (
        <>
          {/* All Agents */}
          {activeTab === 'all' && (
            <div className="acm-agents-list">
              {filteredAgents.length === 0 ? (
                <div className="acm-empty"><Users size={48} /><h3>No agents found</h3><p>Try adjusting your filters</p></div>
              ) : filteredAgents.map(renderAgentCard)}
            </div>
          )}

          {/* Review Queue */}
          {activeTab === 'review_queue' && (
            <div className="acm-review-queue">
              {reviewQueue.filter(r => !['approved', 'rejected'].includes(r.review_status)).length === 0 ? (
                <div className="acm-empty"><Clipboard size={48} /><h3>Review Queue is Empty</h3><p>All agent category reviews are complete</p></div>
              ) : (
                <div className="acm-queue-list">
                  {reviewQueue.filter(r => !['approved', 'rejected'].includes(r.review_status)).map(item => (
                    <div key={item.id} className="acm-queue-item">
                      <div className="acm-queue-header">
                        <div className="acm-queue-agent">
                          <AgentAvatar agent={item} size={40} />
                          <div>
                            <div className="acm-queue-name">{item.agent_name}</div>
                            <div className="acm-queue-email">{item.agent_email}</div>
                            {item.agency_name && <div className="acm-queue-agency">{item.agency_name}</div>}
                          </div>
                        </div>
                        <div className="acm-queue-meta">
                          <StatusBadge status={item.review_status} />
                          {item.requested_category && <CategoryBadge category={item.requested_category} />}
                        </div>
                      </div>
                      {item.investigator_notes && <div className="acm-queue-notes"><strong>Investigator Notes:</strong> {item.investigator_notes}</div>}
                      <div className="acm-queue-footer">
                        <span className="acm-queue-date"><Clock size={12} /> Submitted: {new Date(item.created_at).toLocaleDateString()}</span>
                        {canManageCategories && (
                          <button className="acm-btn acm-btn-primary" onClick={() => {
                            const agent = agents.find(a => a.id === item.agent_id);
                            if (agent) openClassifyModal(agent);
                          }}>
                            <FileCheck size={14} /> Review & Classify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Classified */}
          {activeTab === 'classified' && (
            <div className="acm-agents-list">
              {filteredAgents.filter(a => a.current_category).length === 0 ? (
                <div className="acm-empty"><FileCheck size={48} /><h3>No Classified Agents</h3><p>Classified agents will appear here</p></div>
              ) : filteredAgents.filter(a => a.current_category).map(renderAgentCard)}
            </div>
          )}
        </>
      )}

      {/* Classification Modal */}
      {showReviewModal && selectedAgent && (
        <div className="acm-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="acm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acm-modal-header">
              <h2><Shield size={20} /> Classify Agent</h2>
              <button className="acm-modal-close" onClick={() => setShowReviewModal(false)}><X size={20} /></button>
            </div>
            <div className="acm-modal-body">
              {/* Agent Summary */}
              <div className="acm-agent-summary">
                <AgentAvatar agent={selectedAgent} size={56} />
                <div>
                  <div className="acm-agent-name">{selectedAgent.first_name} {selectedAgent.last_name}</div>
                  <div className="acm-agent-email">{selectedAgent.email}</div>
                  {selectedAgent.agency_name && <div className="acm-agent-agency">{selectedAgent.agency_name}</div>}
                  {selectedAgent.country && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}><MapPin size={10} style={{ display: 'inline', marginRight: '4px' }} />{selectedAgent.city ? `${selectedAgent.city}, ` : ''}{selectedAgent.country}</div>}
                </div>
              </div>

              {/* KYC Documents */}
              <div className="acm-form-section">
                <h4><FileText size={16} /> KYC Documents</h4>
                {loadingDocs ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem', color: '#64748b' }}><LoadingSpinner size={16} /> Loading documents...</div>
                ) : kycDocs.length === 0 ? (
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center' }}>No KYC documents uploaded yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {kycDocs.map((doc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} style={{ color: '#3A4391' }} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{doc.name}</div>
                            {doc.created_at && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</div>}
                          </div>
                        </div>
                        {doc.url && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', background: '#eff6ff', color: '#3A4391', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                              <Eye size={12} /> View
                            </a>
                            <a href={doc.url} download style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', background: '#f0fdf4', color: '#10b981', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                              <Download size={12} /> Download
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div className="acm-form-section">
                <h4>Select Category</h4>
                <p className="acm-form-hint">Based on your review of the submitted documents, select the appropriate category.</p>
                <div className="acm-category-grid">
                  {Object.entries(AGENT_CATEGORY_CONFIG).filter(([k]) => k !== 'pending_classification').map(([key, config]) => {
                    const Icon = CATEGORY_ICONS[key] || Briefcase;
                    return (
                      <div key={key}
                        className={`acm-category-option ${reviewForm.category === key ? 'selected' : ''}`}
                        style={{ borderColor: reviewForm.category === key ? config.color : undefined, background: reviewForm.category === key ? `${config.color}10` : undefined }}
                        onClick={() => setReviewForm({ ...reviewForm, category: key as AgentCategory })}
                      >
                        <div className="acm-category-icon" style={{ background: `${config.color}20`, color: config.color }}><Icon size={24} /></div>
                        <div className="acm-category-info">
                          <div className="acm-category-label">{config.label}</div>
                          <div className="acm-category-desc">{config.description}</div>
                        </div>
                        {reviewForm.category === key && <div className="acm-category-check"><CheckCircle size={20} style={{ color: config.color }} /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Investigator Notes */}
              <div className="acm-form-group">
                <label>Investigator Notes (Internal)</label>
                <textarea className="acm-form-textarea" value={reviewForm.investigatorNotes} onChange={(e) => setReviewForm({ ...reviewForm, investigatorNotes: e.target.value })} placeholder="Document your investigation findings..." rows={3} />
              </div>

              {/* Classification Notes */}
              <div className="acm-form-group">
                <label>Classification Notes (Visible to Agent)</label>
                <textarea className="acm-form-textarea" value={reviewForm.notes} onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })} placeholder="Add any notes about this classification..." rows={2} />
              </div>

              {/* External URL */}
              <div className="acm-form-group">
                <label>External Verification URL (Optional)</label>
                <input type="url" className="acm-form-input" value={reviewForm.externalVerificationUrl} onChange={(e) => setReviewForm({ ...reviewForm, externalVerificationUrl: e.target.value })} placeholder="https://..." />
              </div>

              {/* Decision */}
              <div className="acm-form-section">
                <h4>Decision</h4>
                <div className="acm-decision-buttons">
                  <button className={`acm-decision-btn approve ${reviewForm.status === 'approved' ? 'selected' : ''}`} onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}><CheckCircle size={20} /> Approve & Verify</button>
                  <button className={`acm-decision-btn reject ${reviewForm.status === 'rejected' ? 'selected' : ''}`} onClick={() => setReviewForm({ ...reviewForm, status: 'rejected' })}><XCircle size={20} /> Reject</button>
                  <button className={`acm-decision-btn info ${reviewForm.status === 'needs_more_info' ? 'selected' : ''}`} onClick={() => setReviewForm({ ...reviewForm, status: 'needs_more_info' })}><AlertTriangle size={20} /> Need More Info</button>
                </div>
              </div>
            </div>
            <div className="acm-modal-footer">
              <button className="acm-btn acm-btn-outline" onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button className="acm-btn acm-btn-primary" onClick={handleClassifyAgent} disabled={submitting || !reviewForm.category}>
                {submitting ? <LoadingSpinner /> : <FileCheck size={16} />}
                Submit Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
