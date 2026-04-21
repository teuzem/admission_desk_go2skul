import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CheckCircle2, XCircle, FileText, Search, AlertTriangle,
  ChevronDown, Building2, BookOpen, MapPin, Globe, Calendar,
  DollarSign, Users, Star, Trash2, Edit3, RefreshCw, Eye, X, Plus
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

interface MySubmissionsProps {
  submissions: any[]
  refreshData: () => void
}

export default function MySubmissions({ submissions, refreshData }: MySubmissionsProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const filtered = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (typeFilter !== 'all' && s.submission_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = s.payload?.name || ''
      return name.toLowerCase().includes(q) || s.submission_type.toLowerCase().includes(q)
    }
    return true
  })

  const handleWithdraw = async (id: string) => {
    if (!window.confirm('Are you sure you want to withdraw this submission?')) return
    setWithdrawingId(id)
    try {
      const { error } = await supabase.from('pending_submissions').delete().eq('id', id)
      if (error) throw error
      toast.success('Submission withdrawn')
      refreshData()
    } catch (err: any) {
      toast.error('Failed to withdraw: ' + err.message)
    } finally {
      setWithdrawingId(null)
    }
  }

  const statusCfg = {
    pending: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: Clock, label: 'Awaiting Review' },
    approved: { color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', icon: CheckCircle2, label: 'Approved' },
    rejected: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: XCircle, label: 'Rejected' },
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} style={{ color: '#f59e0b' }} /> My Submissions
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Track approval status of your submitted universities and programs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', paddingRight: search ? '32px' : '12px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', outline: 'none', width: '180px', background: 'white', color: '#1e293b' }}
            />
            {search && <X size={14} onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', cursor: 'pointer', color: '#94a3b8' }} />}
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', padding: '0 10px', background: 'white', color: '#1e293b' }}>
            <option value="all">All Types</option>
            <option value="university">Universities</option>
            <option value="program">Programs</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', padding: '0 10px', background: 'white', color: '#1e293b' }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total', value: submissions.length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Pending Review', value: pendingCount, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Approved', value: approvedCount, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Rejected', value: rejectedCount, color: '#ef4444', bg: '#fef2f2' },
        ].map(st => (
          <div key={st.label} onClick={() => setStatusFilter(st.label === 'Total' ? 'all' : st.label.toLowerCase().split(' ')[0])}
            style={{ background: st.bg, border: `1px solid ${st.color}30`, borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'transform 0.15s', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* ── Submissions List ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          {typeFilter === 'program' ? <BookOpen size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1', display: 'block' }} /> : 
           typeFilter === 'university' ? <Building2 size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1', display: 'block' }} /> :
           <FileText size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1', display: 'block' }} />}
          
          <h3 style={{ color: '#64748b', fontWeight: 600 }}>
            {typeFilter === 'program' ? 'No program submissions found' : 
             typeFilter === 'university' ? 'No university submissions found' : 
             'No submissions found'}
          </h3>
          
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or status filters.'
              : typeFilter === 'program' ? 'Start by submitting your first academic program for approval.' :
                typeFilter === 'university' ? 'Start by submitting your first university for approval.' :
                'Submit a university or program for approval to get started.'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            {(typeFilter === 'all' || typeFilter === 'university') && (
              <button 
                onClick={() => navigate('/admin/universities/new')} 
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#3A4391', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Add University
              </button>
            )}
            {(typeFilter === 'all' || typeFilter === 'program') && (
              <button 
                onClick={() => navigate('/admin/programs/new')} 
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Add Program
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(sub => {
            const cfg = statusCfg[sub.status as keyof typeof statusCfg] || statusCfg.pending
            const StatusIcon = cfg.icon
            const isUni = sub.submission_type === 'university'
            const campuses: any[] = sub.payload?.campuses || []
            const isExpanded = expandedId === sub.id
            const isPending = sub.status === 'pending'

            return (
              <div key={sub.id} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${isExpanded ? '#10b981' : '#e2e8f0'}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* ── Card Header ── */}
                <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                  {/* Type icon */}
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUni ? '#eff6ff' : '#f5f3ff', flexShrink: 0 }}>
                    {isUni ? <Building2 size={18} style={{ color: '#3A4391' }} /> : <BookOpen size={18} style={{ color: '#8b5cf6' }} />}
                  </div>

                  {/* Name & meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{sub.payload?.name || 'Unknown'}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', background: isUni ? '#eff6ff' : '#f5f3ff', color: isUni ? '#3A4391' : '#8b5cf6' }}>
                        {sub.submission_type}
                      </span>
                      {isUni && sub.payload?.is_multisite && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>🌐 Multisite · {campuses.length} campuses</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {isUni && sub.payload?.country && <span><MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />{sub.payload.country}{sub.payload.city ? `, ${sub.payload.city}` : ''}</span>}
                      {!isUni && sub.payload?.level && <span>Level: <strong>{sub.payload.level}</strong></span>}
                      {!isUni && sub.payload?.category && <span>· {sub.payload.category}</span>}
                      <span>Submitted {new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '99px', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 700, fontSize: '0.78rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <StatusIcon size={13} /> {cfg.label}
                  </div>

                  {/* Expand chevron */}
                  <ChevronDown size={16} style={{ color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>

                {/* ── Expanded Detail Panel ── */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.25rem' }}>
                    {/* Rejection notice */}
                    {sub.status === 'rejected' && sub.reviewer_notes && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.82rem', marginBottom: '2px' }}>Reviewer Notes</div>
                          <div style={{ color: '#7f1d1d', fontSize: '0.82rem', lineHeight: 1.5 }}>{sub.reviewer_notes}</div>
                        </div>
                      </div>
                    )}

                    {/* ── UNIVERSITY DETAILS ── */}
                    {isUni && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Core info grid */}
                        <div>
                          <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>University Details</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            {[
                              ['Country', sub.payload.country],
                              ['City', sub.payload.city],
                              ['Region', sub.payload.region],
                              ['Established', sub.payload.established],
                              ['Global Ranking #', sub.payload.global_ranking],
                              ['Ranking', sub.payload.ranking],
                              ['Accreditation', sub.payload.accreditation],
                              ['Students', sub.payload.student_count?.toLocaleString()],
                              ['Acceptance Rate', sub.payload.acceptance_rate ? `${sub.payload.acceptance_rate}%` : null],
                              ['Website', sub.payload.website_url],
                              ['Active on Publish', sub.payload.is_active ? '✓ Yes' : '✗ No'],
                              ['Multisite', sub.payload.is_multisite ? `✓ Yes (${campuses.length} campuses)` : '✗ No'],
                            ].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                              <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>{String(v)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* About */}
                        {sub.payload.about && (
                          <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>About</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.7, background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>{sub.payload.about}</p>
                          </div>
                        )}

                        {/* Campuses */}
                        {campuses.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Campuses ({campuses.length})</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                              {campuses.map((c: any, i: number) => (
                                <div key={i} style={{ background: c.is_main ? '#fffbeb' : '#f8fafc', border: `1px solid ${c.is_main ? '#fde68a' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <MapPin size={13} style={{ color: c.is_main ? '#f59e0b' : '#94a3b8' }} />
                                    <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{c.campus_name}</strong>
                                    {c.is_main && <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>★ MAIN</span>}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <span>{c.city}{c.city && c.country ? ', ' : ''}{c.country}</span>
                                    {c.address && <span>{c.address}</span>}
                                    {c.phone && <span>📞 {c.phone}</span>}
                                    {c.email && <span>✉ {c.email}</span>}
                                    {c.student_count && <span>👥 {Number(c.student_count).toLocaleString()} students</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Features */}
                        {sub.payload.features?.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Key Features</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {sub.payload.features.map((f: string) => (
                                <span key={f} style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── PROGRAM DETAILS ── */}
                    {!isUni && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                          <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Program Details</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            {[
                              ['Level', sub.payload.level],
                              ['Category', sub.payload.category],
                              ['Duration', sub.payload.duration],
                              ['Duration (months)', sub.payload.duration_months],
                              ['Language', sub.payload.language],
                              ['Delivery Mode', sub.payload.delivery_mode],
                              ['Campus Type', sub.payload.campus_type],
                              ['Tuition Fee', sub.payload.tuition_fee ? `${sub.payload.currency} ${Number(sub.payload.tuition_fee).toLocaleString()}/yr` : null],
                              ['Application Fee', sub.payload.application_fee ? `${sub.payload.currency} ${sub.payload.application_fee}` : null],
                              ['Deadline', sub.payload.application_deadline],
                              ['Intake', sub.payload.intake],
                              ['Scholarship', sub.payload.scholarship_available ? '✓ Yes' : '✗ No'],
                              ['Accommodation', sub.payload.accommodation_available ? '✓ Yes' : '✗ No'],
                              ['Visa Support', sub.payload.visa_support ? '✓ Yes' : '✗ No'],
                              ['Campus Scope', !sub.payload.is_all_campuses ? `Specific campuses (${(sub.payload.campus_ids || []).length})` : 'All campuses'],
                              ['Active', sub.payload.is_active ? '✓ Yes' : '✗ No'],
                            ].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                              <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!sub.payload.is_all_campuses && sub.payload.campuses_details?.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Selected Campuses ({sub.payload.campuses_details.length})</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                              {sub.payload.campuses_details.map((c: any, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${c.is_main ? '#fde68a' : '#e2e8f0'}` }}>
                                  <MapPin size={14} style={{ color: c.is_main ? '#f59e0b' : '#94a3b8' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{c.campus_name}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.city}, {c.country}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sub.payload.description && (
                          <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Description</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.7, background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>{sub.payload.description}</p>
                          </div>
                        )}

                        {sub.payload.requirements_list?.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Entry Requirements</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.8, background: '#f8fafc', borderRadius: '8px', padding: '10px 10px 10px 24px' }}>
                              {sub.payload.requirements_list.map((r: string) => <li key={r}>{r}</li>)}
                            </ul>
                          </div>
                        )}

                        {sub.payload.start_dates?.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Start Dates</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {sub.payload.start_dates.map((d: string) => (
                                <span key={d} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>{d}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Actions ── */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                      {isPending && (
                        <>
                          <button
                            onClick={() => navigate(isUni ? '/admin/universities/new' : '/admin/programs/new')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                          >
                            <Edit3 size={14} /> Edit & Resubmit
                          </button>
                          <button
                            onClick={() => handleWithdraw(sub.id)}
                            disabled={withdrawingId === sub.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', opacity: withdrawingId === sub.id ? 0.6 : 1 }}
                          >
                            <Trash2 size={14} /> Withdraw
                          </button>
                        </>
                      )}
                      {sub.status === 'rejected' && (
                        <button
                          onClick={() => navigate(isUni ? '/admin/universities/new' : '/admin/programs/new')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #10b981', background: '#f0fdf4', color: '#10b981', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          <RefreshCw size={14} /> Resubmit
                        </button>
                      )}
                      <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(sub.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
