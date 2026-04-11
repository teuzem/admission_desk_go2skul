import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Search, Eye, Mail, Phone, MapPin,
  CheckCircle2, XCircle, Clock, ChevronUp, X, Shield, FileText,
  Building2, ToggleLeft, ToggleRight, ExternalLink
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getSecureUrl } from '../../lib/storageHelpers'
import toast from 'react-hot-toast'
import { VerifiedBadgeInline } from '../../components/ui/VerifiedBadge'
import '../dashboard/DashboardPages.css'
import './AdminPages.css'

const KYC_COLORS: Record<string, string> = {
  pending: '#f59e0b', under_review: '#3b82f6', approved: '#10b981', rejected: '#ef4444'
}

export default function AdminAgents() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<any[]>([])
  const [kycRecords, setKycRecords] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [partnerSelections, setPartnerSelections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [agentRes, kycRes, appRes, studentRes, partnerRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'agent').order('created_at', { ascending: false }),
      supabase.from('agent_kyc').select('*'),
      supabase.from('applications').select('id, status, agent_id, created_at'),
      supabase.from('students').select('id, agent_id, first_name, last_name'),
      supabase.from('agent_partner_selections').select('agent_id, universities(name, country)')
    ])
    setAgents(agentRes.data || [])
    setKycRecords(kycRes.data || [])
    setApplications(appRes.data || [])
    setStudents(studentRes.data || [])
    setPartnerSelections(partnerRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const countries = [...new Set(agents.map(a => a.country).filter(Boolean))].sort()

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${a.first_name} ${a.last_name} ${a.email} ${a.agency_name || ''}`.toLowerCase().includes(q)
    const matchKyc = !kycFilter || a.kyc_status === kycFilter
    const matchCountry = !countryFilter || a.country === countryFilter
    return matchSearch && matchKyc && matchCountry
  })

  const getAgentApps = (agentId: string) => applications.filter(a => a.agent_id === agentId)
  const getAgentStudents = (agentId: string) => students.filter(s => s.agent_id === agentId)
  const getAgentKyc = (agentId: string) => kycRecords.find(k => k.agent_id === agentId)
  const getAgentPartners = (agentId: string) => partnerSelections.filter(p => p.agent_id === agentId)

  const updateKyc = async (agentId: string, status: string) => {
    const { error } = await supabase.from('profiles').update({ kyc_status: status as any }).eq('id', agentId)
    if (error) { toast.error('Failed to update KYC'); return }
    if (adminNotes) {
      await supabase.from('agent_kyc').update({ status: status as any, admin_notes: adminNotes }).eq('agent_id', agentId)
    } else {
      await supabase.from('agent_kyc').update({ status: status as any }).eq('agent_id', agentId)
    }
    toast.success(`KYC status updated to ${status.replace(/_/g, ' ')}`)
    setAdminNotes('')
    fetchAll()
  }

  const toggleActive = async (agentId: string, currentlyActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !currentlyActive } as any).eq('id', agentId)
    if (error) { toast.error('Failed to toggle status'); return }
    toast.success(currentlyActive ? 'Agent deactivated' : 'Agent activated')
    fetchAll()
  }

  const getStatusBadge = (status: string) => {
    const color = KYC_COLORS[status] || '#94a3b8'
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    return <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>{label}</span>
  }

  return (
    <div className="dashboard-page" style={{ padding: '2rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => navigate('/admin')} className="admin-back-btn"><ArrowLeft size={16} /> Admin</button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Agent Management</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {filtered.length} agent{filtered.length !== 1 ? 's' : ''} • 
              {agents.filter(a => a.kyc_status === 'pending' || a.kyc_status === 'under_review').length} pending KYC
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-search-box">
            <Search size={16} />
            <input placeholder="Search agents by name, email, agency..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input admin-filter-select" value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
            <option value="">All KYC Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="form-input admin-filter-select" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Agent List */}
        <div className="card-panel" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Agency</th>
                  <th>Location</th>
                  <th>KYC Status</th>
                  <th>Apps</th>
                  <th>Students</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading agents...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No agents found.</td></tr>
                ) : filtered.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {agent.first_name} {agent.last_name}
                        <VerifiedBadgeInline isVerified={agent.kyc_status === 'approved'} size={15} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{agent.email}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>{agent.agency_name || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {agent.city ? `${agent.city}, ` : ''}{agent.country || '—'}
                    </td>
                    <td>{getStatusBadge(agent.kyc_status || 'pending')}</td>
                    <td><span className="admin-count-badge">{getAgentApps(agent.id).length}</span></td>
                    <td><span className="admin-count-badge">{getAgentStudents(agent.id).length}</span></td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="admin-icon-btn" onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)} title="View details">
                          {expandedAgent === agent.id ? <ChevronUp size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="admin-icon-btn" onClick={() => toggleActive(agent.id, agent.is_active !== false)} title={agent.is_active !== false ? 'Deactivate' : 'Activate'}>
                          {agent.is_active !== false ? <ToggleRight size={14} style={{ color: '#10b981' }} /> : <ToggleLeft size={14} style={{ color: '#ef4444' }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded Agent Details */}
          {expandedAgent && (() => {
            const agent = filtered.find(a => a.id === expandedAgent)
            if (!agent) return null
            const kyc = getAgentKyc(agent.id)
            const apps = getAgentApps(agent.id)
            const myStudents = getAgentStudents(agent.id)
            const partners = getAgentPartners(agent.id)

            return (
              <div className="admin-expanded-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: '#3A4391' }} />
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {agent.first_name} {agent.last_name}
                      <VerifiedBadgeInline isVerified={agent.kyc_status === 'approved'} size={18} />
                    </div>
                    — Full Profile
                  </h3>
                  <button onClick={() => setExpandedAgent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
                </div>

                {/* Agent Info Grid */}
                <div className="review-grid" style={{ marginBottom: '1.25rem' }}>
                  {[
                    ['Email', agent.email], ['Phone', agent.phone || '—'],
                    ['Agency', agent.agency_name || '—'], ['Trading Name', agent.trading_name || '—'],
                    ['Country', agent.country || '—'], ['City', agent.city || '—'],
                    ['Designation', agent.designation || '—'], ['Account Type', agent.account_type || '—'],
                    ['Website', agent.website || '—'], ['KYC Status', agent.kyc_status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '—'],
                    ['Super Agent', agent.is_super_agent ? '✓ Yes' : '✗ No'],
                    ['Active', agent.is_active !== false ? '✓ Yes' : '✗ Inactive'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="review-item">
                      <div className="review-label">{k}</div>
                      <div className="review-value">{v}</div>
                    </div>
                  ))}
                </div>

                {/* KYC Section */}
                {kyc && (
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> KYC Verification Details
                    </h4>
                    <div className="review-grid">
                      {[
                        ['Reg. Number', kyc.company_registration_number || '—'],
                        ['Incorporation', kyc.incorporation_date || '—'],
                        ['Expiry', kyc.does_not_expire ? 'Never expires' : kyc.expiry_date || '—'],
                        ['Reg. Address', kyc.registered_address || '—'],
                        ['Reg. City', kyc.registered_city || '—'],
                        ['Reg. Country', kyc.registered_country || '—'],
                      ].map(([k, v]) => (
                        <div key={k as string} className="review-item">
                          <div className="review-label">{k}</div>
                          <div className="review-value">{v}</div>
                        </div>
                      ))}
                    </div>
                    {kyc.business_licence_url && (
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await getSecureUrl('kyc-documents', kyc.business_licence_url)
                          if (url) window.open(url, '_blank')
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', color: '#3A4391', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <ExternalLink size={13} /> View Business Licence
                      </button>
                    )}
                    {kyc.admin_notes && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fffbeb', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e' }}>
                        <strong>Admin Notes:</strong> {kyc.admin_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* KYC Actions */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>KYC Actions</h4>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <input className="form-input" placeholder="Admin notes (optional)..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {agent.kyc_status !== 'under_review' && (
                      <button onClick={() => updateKyc(agent.id, 'under_review')} className="btn btn-sm" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                        <Clock size={12} /> Under Review
                      </button>
                    )}
                    {agent.kyc_status !== 'approved' && (
                      <button onClick={() => updateKyc(agent.id, 'approved')} className="btn btn-sm" style={{ background: '#10b981', color: 'white', border: 'none' }}>
                        <CheckCircle2 size={12} /> Approve
                      </button>
                    )}
                    {agent.kyc_status !== 'rejected' && (
                      <button onClick={() => updateKyc(agent.id, 'rejected')} className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                        <XCircle size={12} /> Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Partner Universities */}
                {partners.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} /> Partner Universities ({partners.length})
                    </h4>
                    <div className="tag-list">
                      {partners.map((p: any, i: number) => (
                        <span key={i} className="tag-chip tag-chip-static">{(p.universities as any)?.name} — {(p.universities as any)?.country}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Students and Apps Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{myStudents.length}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Students Registered</div>
                  </div>
                  <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{apps.length}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Applications Submitted</div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
