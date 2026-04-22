import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, GraduationCap, FileText, Eye, Download,
  CheckCircle2, XCircle, Clock, Send, Save, Building2, Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getSecureUrl } from '../../lib/storageHelpers'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import AdminHeader from '../../components/layout/AdminHeader'
import AdminFooter from '../../components/layout/AdminFooter'
import '../dashboard/DashboardPages.css'
import './AdminPages.css'

const STATUSES = [
  { value: 'draft', label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  { value: 'submitted', label: 'Submitted', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'under_review', label: 'Under Review', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'offer_received', label: 'Offer Received', color: '#10b981', bg: '#f0fdf4' },
  { value: 'accepted', label: 'Accepted', color: '#06b6d4', bg: '#ecfeff' },
  { value: 'enrolled', label: 'Enrolled', color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444', bg: '#fef2f2' },
]

export default function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchApp = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          students(*),
          universities(name, country, city, logo_url),
          programs(name, level, duration, tuition_fee, currency, start_dates, category),
          profiles:agent_id(first_name, last_name, email, agency_name, phone)
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        setApp(data)
        setNewStatus(data.status)
        setAdminNotes(data.admin_notes || '')
      }
      setLoading(false)
    }
    fetchApp()
  }, [id])

  const handleSave = async () => {
    if (!app || !user) return
    setSaving(true)
    try {
      const updates: any = {
        admin_notes: adminNotes || null,
      }
      if (newStatus !== app.status) {
        updates.status = newStatus
        updates.reviewed_by = user.email || user.id
        updates.reviewed_at = new Date().toISOString()
      }
      const { error } = await supabase.from('applications').update(updates).eq('id', app.id)
      if (error) throw error
      setApp({ ...app, ...updates })
      toast.success('Application updated successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update application')
    } finally {
      setSaving(false)
    }
  }

  const DocCard = ({ label, url, icon }: { label: string; url: string | null; icon?: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', background: url ? '#f0fdf4' : '#fef2f2',
      borderRadius: '10px', border: `1px solid ${url ? '#bbf7d0' : '#fecaca'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {url ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: '#ef4444' }} />}
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: url ? '#166534' : '#991b1b' }}>{icon || '📄'} {label}</span>
      </div>
      {url && (
        <button
          type="button"
          onClick={async () => {
            const secureUrl = await getSecureUrl('student-documents', url)
            if (secureUrl) window.open(secureUrl, '_blank')
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700,
            border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px',
            background: '#eff6ff'
          }}
        >
          <Eye size={12} /> View
        </button>
      )}
    </div>
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <AdminHeader />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#94a3b8' }}>Loading application...</p>
        </main>
        <AdminFooter />
      </div>
    )
  }

  if (!app) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <AdminHeader />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontWeight: 600 }}>Application not found</p>
          <button onClick={() => navigate('/admin')} className="btn btn-outline" style={{ marginTop: '1rem' }}>← Back to Admin</button>
        </main>
        <AdminFooter />
      </div>
    )
  }

  const student = app.students
  const program = app.programs
  const university = app.universities
  const agent = app.profiles
  const currentStatus = STATUSES.find(s => s.value === app.status) || STATUSES[0]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />
      
      <main style={{ flex: 1, padding: '2rem 2.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/admin')} className="admin-back-btn">
            <ArrowLeft size={16} /> Back to Admin
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Application Review</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>ID: {app.id}</p>
          </div>
          <span style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem',
            fontWeight: 700, color: currentStatus.color, background: currentStatus.bg
          }}>
            {currentStatus.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Student Info */}
            <div className="card-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--color-primary)' }} /> Student Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {student && [
                  ['Full Name', `${student.first_name} ${student.last_name}`],
                  ['Email', student.email],
                  ['Phone', student.phone],
                  ['Gender', student.gender],
                  ['Nationality', student.nationality],
                  ['DOB', student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : null],
                  ['Passport', student.passport_number],
                  ['Country of Residence', student.country_of_residence],
                  ['Highest Education', student.highest_education],
                  ['Institution', student.current_institution],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Programme Info */}
            <div className="card-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={16} style={{ color: '#00CCA0' }} /> Programme Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {[
                  ['University', university?.name],
                  ['Country', university?.country],
                  ['Programme', program?.name],
                  ['Level', program?.level],
                  ['Category', program?.category],
                  ['Duration', program?.duration],
                  ['Tuition', program?.tuition_fee ? `${program.currency} ${program.tuition_fee.toLocaleString()}/yr` : null],
                  ['Intake', app.intake_month],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Info */}
            {agent && (
              <div className="card-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} style={{ color: '#f59e0b' }} /> Submitted by Agent
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {[
                    ['Agent', `${agent.first_name || ''} ${agent.last_name || ''}`],
                    ['Email', agent.email],
                    ['Agency', agent.agency_name],
                    ['Phone', agent.phone],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.6rem' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Notes */}
            {app.notes && (
              <div className="card-panel" style={{ padding: '1.25rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>Agent Notes</div>
                <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>{app.notes}</div>
              </div>
            )}

            {/* English Test */}
            {app.english_test_type && (
              <div className="card-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem 0' }}>🌐 English Proficiency</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.6rem', flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Test</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{app.english_test_type}</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.6rem', flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Score</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{app.english_test_score || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Documents, Actions & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '2rem' }}>
            {/* Documents */}
            <div className="card-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: '#e91e63' }} /> Documents
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <DocCard label="Passport Scan" url={app.passport_url} icon="🛂" />
                <DocCard label="Official Transcripts" url={app.transcript_url} icon="📋" />
                <DocCard label="Statement of Purpose" url={app.sop_url} icon="📝" />
                <DocCard label="Curriculum Vitae" url={app.cv_url} icon="📄" />
                <DocCard label="English Test Results" url={app.english_test_url} icon="🌐" />
                <DocCard label="Financial Proof" url={app.financial_proof_url} icon="💰" />
              </div>

              {/* Additional docs */}
              {app.additional_docs && app.additional_docs.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Additional Documents</div>
                  {app.additional_docs.map((doc: any, i: number) => (
                    <button key={i} type="button" onClick={async () => {
                      const secureUrl = await getSecureUrl('student-documents', doc.url)
                      if (secureUrl) window.open(secureUrl, '_blank')
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.75rem',
                      background: '#f8fafc', borderRadius: '8px', marginBottom: '4px',
                      textDecoration: 'none', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
                      border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left'
                    }}>
                      <FileText size={14} /> {doc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Update */}
            <div className="card-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0' }}>⚡ Update Status</h3>
              <div className="form-group">
                <label className="form-label">Application Status</label>
                <select className="form-input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Admin Review Notes</label>
                <textarea className="form-input" rows={4} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add feedback, requests for additional docs, decision notes..." />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{
                width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '6px', background: '#00CCA0', borderColor: '#00CCA0'
              }}>
                {saving ? <><span className="spinner" /> Saving...</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>

            {/* Timeline */}
            <div className="card-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: '#8b5cf6' }} /> Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Submitted</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{new Date(app.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {app.reviewed_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Reviewed</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{new Date(app.reviewed_at).toLocaleString()} — by {app.reviewed_by}</div>
                    </div>
                  </div>
                )}
                {app.updated_at && app.updated_at !== app.created_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Last Updated</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{new Date(app.updated_at).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
      <AdminFooter />
    </div>
  )
}
