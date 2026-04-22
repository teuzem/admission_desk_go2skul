import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { getAdmissionDocUrl, getSecureUrl } from '../../../lib/storageHelpers'
import toast from 'react-hot-toast'
import {
  ArrowLeft, User, GraduationCap, Briefcase, Languages, DollarSign,
  FileText, Download, Eye, Send, CheckCircle2, XCircle, AlertTriangle,
  Clock, MessageSquare, ChevronDown, Paperclip, Shield, Globe,
  MapPin, Phone, Mail, Calendar, FileWarning, RefreshCw, X
} from 'lucide-react'
import ApplicationChat from '../../../components/common/ApplicationChat'
import AdminHeader from '../../../components/layout/AdminHeader'
import AdminFooter from '../../../components/layout/AdminFooter'
import './AdmissionManagerDashboard.css'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#94a3b8', bg: '#f1f5f9', label: 'Draft' },
  submitted: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  under_review: { color: '#f59e0b', bg: '#fffbeb', label: 'Under Review' },
  offer: { color: '#10b981', bg: '#f0fdf4', label: 'Offer' },
  accepted: { color: '#06b6d4', bg: '#ecfeff', label: 'Accepted' },
  rejected: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
  enrolled: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Enrolled' },
}

const REQUIRED_DOC_TYPES = ['Birth Certificate', 'CV / Resume', 'SOP / Statement of Purpose', 'Awards', 'Certifications']

export default function AdmissionApplicationReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [application, setApplication] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [agent, setAgent] = useState<any>(null)
  const [university, setUniversity] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [educationEntries, setEducationEntries] = useState<any[]>([])
  const [workEntries, setWorkEntries] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [docRequests, setDocRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedStatus, setSelectedStatus] = useState('')
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [appRes, docsRes, eduRes, workRes, commRes, docReqRes] = await Promise.all([
      supabase.from('applications').select(`
        *, students(*), universities(name, country, logo_url),
        programs(name, level, category, tuition_fee, currency, duration),
        profiles:agent_id(first_name, last_name, email, agency_name, phone, avatar_url)
      `).eq('id', id).single(),
      supabase.from('application_documents').select('*').eq('application_id', id).order('sort_order'),
      supabase.from('education_entries').select('*').eq('application_id', id).order('sort_order'),
      supabase.from('work_experience_entries').select('*').eq('application_id', id).order('sort_order'),
      supabase.from('application_comments').select(`*, profiles:author_id(first_name, last_name, role, avatar_url)`).eq('application_id', id).order('created_at'),
      supabase.from('document_requests').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    ])
    if (appRes.data) {
      setApplication(appRes.data)
      setStudent(appRes.data.students)
      setAgent(appRes.data.profiles)
      setUniversity(appRes.data.universities)
      setProgram(appRes.data.programs)
      setSelectedStatus(appRes.data.status)
    }
    setDocuments(docsRes.data || [])
    setEducationEntries(eduRes.data || [])
    setWorkEntries(workRes.data || [])
    setComments(commRes.data || [])
    setDocRequests(docReqRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`adm-review-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'application_comments', filter: `application_id=eq.${id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests', filter: `application_id=eq.${id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'application_documents', filter: `application_id=eq.${id}` }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, id])

  // ─── Actions ───
  const updateStatus = async () => {
    if (!selectedStatus || selectedStatus === application?.status) return
    const { error } = await supabase.from('applications').update({
      status: selectedStatus as any, reviewed_by: user?.email, reviewed_at: new Date().toISOString()
    }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    await supabase.from('application_comments').insert({
      application_id: id, author_id: user!.id, author_role: profile?.role || 'admission_manager',
      content: `Status changed to "${STATUS_CONFIG[selectedStatus]?.label}"`, comment_type: 'status_update'
    })
    toast.success(`Status updated to ${STATUS_CONFIG[selectedStatus]?.label}`)
    fetchData()
  }

  const sendComment = async () => {
    if (!newComment.trim()) return
    setSendingComment(true)
    await supabase.from('application_comments').insert({
      application_id: id, author_id: user!.id, author_role: profile?.role || 'admission_manager',
      content: newComment.trim(), comment_type: 'comment'
    })
    setNewComment('')
    setSendingComment(false)
    fetchData()
  }

  const requestDocument = async (docType: string) => {
    await supabase.from('document_requests').insert({
      application_id: id, requested_by: user!.id, document_type: docType,
      description: `Please upload the required document: ${docType}`, priority: 'high'
    })
    await supabase.from('application_comments').insert({
      application_id: id, author_id: user!.id, author_role: profile?.role || 'admission_manager',
      content: `📄 Document requested: "${docType}" — Please upload this document at your earliest convenience.`,
      comment_type: 'document_request'
    })
    toast.success(`Document "${docType}" requested`)
    fetchData()
  }

  const handleDownload = async (doc: any) => {
    try {
      const url = await getAdmissionDocUrl(doc.file_url)
      if (!url) { toast.error('Unable to get download URL'); return }
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = doc.file_name || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      toast.success(`Downloaded: ${doc.file_name}`)
    } catch { toast.error('Download failed') }
  }

  const handleRejectDocument = async (doc: any) => {
    const reason = window.prompt(`Provide a reason for rejecting "${doc.file_name}":`)
    if (reason === null) return // canceled
    
    // 1. Delete from application_documents
    await supabase.from('application_documents').delete().eq('id', doc.id)
    
    // 2. Request a new one
    await supabase.from('document_requests').insert({
      application_id: id, requested_by: user!.id, document_type: doc.document_type,
      description: `Fix needed for ${doc.document_type}: ${reason}`, priority: 'high'
    })
    
    // 3. Notify agent via comment
    await supabase.from('application_comments').insert({
      application_id: id, author_id: user!.id, author_role: profile?.role || 'admission_manager',
      content: `❌ Document syntax error/rejected: "${doc.document_type}". Reason: ${reason || 'Invalid document.'} Please re-upload.`,
      comment_type: 'document_request'
    })
    
    toast.success(`Document rejected and agent notified.`)
    fetchData()
  }

  const handlePreview = async (doc: any) => {
    const url = await getAdmissionDocUrl(doc.file_url)
    if (url) { setPreviewUrl(url); setPreviewName(doc.file_name) }
    else toast.error('Unable to preview document')
  }

  const autoDetectMissing = async () => {
    const uploaded = documents.map(d => d.document_type)
    const missingTypes = REQUIRED_DOC_TYPES.filter(t => !uploaded.includes(t))
    let count = 0
    for (const docType of missingTypes) {
      const existing = docRequests.find(dr => dr.document_type === docType && !dr.is_fulfilled)
      if (!existing) {
        await requestDocument(docType)
        count++
      }
    }
    if (count === 0) toast('All required documents have already been requested or uploaded')
    else toast.success(`Requested ${count} missing document(s)`)
  }

  // ─── Computed ───
  const uploadedDocTypes = documents.map(d => d.document_type)
  const requestedDocTypes = docRequests.filter(dr => !dr.is_fulfilled).map(dr => dr.document_type)
  const missingDocs = REQUIRED_DOC_TYPES.filter(t => !uploadedDocTypes.includes(t) && !requestedDocTypes.includes(t))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} className="spinning" style={{ color: '#3A4391' }} />
      </main>
      <AdminFooter />
    </div>
  )

  if (!application) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="adm-empty"><h3>Application not found</h3></div>
      </main>
      <AdminFooter />
    </div>
  )

  const SectionCard = ({ icon, title, children, color = '#3A4391' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }) => (
    <div className="adm-card" style={{ marginBottom: '1rem' }}>
      <h3 className="adm-card-title">{icon} {title}</h3>
      {children}
    </div>
  )

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: '0.82rem' }}>
      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />
      
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
      {/* Preview Modal */}
      {previewUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setPreviewUrl(null)}>
          <div style={{ background: 'white', borderRadius: 16, width: '95%', maxWidth: 1200, height: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{previewName}</h3>
              <button className="adm-btn-icon" onClick={() => setPreviewUrl(null)} style={{ background: '#f1f5f9', borderRadius: '50%', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: '0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
              {previewName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                <div style={{ overflow: 'auto', padding: '1rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewUrl} alt={previewName} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
                </div>
              ) : previewName.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i) ? (
                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`} style={{ width: '100%', height: '100%', border: 'none', flex: 1 }} title={previewName} />
              ) : (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                  <h4 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>Preview unavailable</h4>
                  <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>This file type cannot be previewed directly in the browser.</p>
                  <a href={previewUrl} download={previewName} target="_blank" rel="noreferrer" className="adm-btn adm-btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
                    <Download size={16} style={{ marginRight: 8 }} /> Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => navigate('/admin/admissions')}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="adm-title-block">
            <h1>Application Review</h1>
            <p>Ref: {application.submission_reference || application.id.slice(0, 12)}</p>
          </div>
        </div>
        <div className="adm-header-actions">
          <span className="adm-status-badge" style={{
            background: STATUS_CONFIG[application.status]?.bg,
            color: STATUS_CONFIG[application.status]?.color,
            border: `1px solid ${STATUS_CONFIG[application.status]?.color}25`,
            fontSize: '0.82rem', padding: '6px 14px'
          }}>
            {STATUS_CONFIG[application.status]?.label}
          </span>
        </div>
      </header>

      <div className="adm-body" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* ─── LEFT: Main Content ─── */}
        <div>
          {/* Student Information */}
          <SectionCard icon={<User size={16} style={{ color: '#3A4391' }} />} title="Student Information">
            <div className="adm-form-grid">
              <div>
                <InfoRow label="Full Name" value={`${student?.prefix || ''} ${student?.first_name} ${student?.middle_name || ''} ${student?.last_name}`.trim()} />
                <InfoRow label="Email" value={student?.email} />
                <InfoRow label="Phone" value={student?.primary_phone || student?.phone} />
                <InfoRow label="Gender" value={student?.gender} />
                <InfoRow label="Date of Birth" value={student?.date_of_birth} />
                <InfoRow label="Nationality" value={student?.nationality} />
              </div>
              <div>
                <InfoRow label="Primary Citizenship" value={student?.primary_citizenship} />
                <InfoRow label="Passport Number" value={student?.passport_number} />
                <InfoRow label="Passport Expiry" value={student?.passport_expiry_date} />
                <InfoRow label="Country of Residence" value={student?.country_of_residence} />
                <InfoRow label="Marital Status" value={student?.marital_status} />
                <InfoRow label="Applying From" value={student?.country_applying_from} />
              </div>
            </div>
            {/* Address */}
            {student?.home_address_1 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Home Address</div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {student.home_address_1}{student.home_address_2 ? `, ${student.home_address_2}` : ''}<br />
                  {student.home_city}, {student.home_state} {student.home_zip_code}<br />{student.home_country}
                </div>
              </div>
            )}
            {/* Emergency Contact */}
            {student?.emergency_full_name && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 4 }}>Emergency Contact</div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  <strong>{student.emergency_full_name}</strong> ({student.emergency_relationship})<br />
                  {student.emergency_phone} • {student.emergency_email}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Representative */}
          {application.representative_name && (
            <SectionCard icon={<User size={16} style={{ color: '#f59e0b' }} />} title="Representative / Agent">
              <div className="adm-form-grid">
                <div>
                  <InfoRow label="Name" value={application.representative_name} />
                  <InfoRow label="Email" value={application.representative_email} />
                  <InfoRow label="Phone" value={application.representative_phone} />
                </div>
                <div>
                  <InfoRow label="Address" value={application.representative_address} />
                  <InfoRow label="City" value={application.representative_city} />
                  <InfoRow label="State" value={application.representative_state} />
                  <InfoRow label="Country" value={application.representative_country} />
                  <InfoRow label="Zip" value={application.representative_zip} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* Program & University */}
          <SectionCard icon={<GraduationCap size={16} style={{ color: '#00CCA0' }} />} title="Program & University">
            <div className="adm-form-grid">
              <div>
                <InfoRow label="University" value={university?.name} />
                <InfoRow label="Country" value={university?.country} />
                <InfoRow label="Program" value={program?.name} />
                <InfoRow label="Level" value={program?.level} />
              </div>
              <div>
                <InfoRow label="Category" value={program?.category} />
                <InfoRow label="Duration" value={program?.duration} />
                <InfoRow label="Tuition Fee" value={program?.tuition_fee ? `${program.currency || 'USD'} ${Number(program.tuition_fee).toLocaleString()}` : '—'} />
                <InfoRow label="Intake" value={`${application.intake_month || '—'} ${application.intake_year || ''}`} />
              </div>
            </div>
            {(application.how_heard_about_program || application.applied_before) && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 10 }}>
                <InfoRow label="How Heard About Program" value={application.how_heard_about_program} />
                <InfoRow label="Applied Before" value={application.applied_before ? `Yes${application.previous_application_year ? ` (${application.previous_application_year})` : ''}` : 'No'} />
              </div>
            )}
          </SectionCard>

          {/* Education History */}
          <SectionCard icon={<GraduationCap size={16} style={{ color: '#8b5cf6' }} />} title={`Education History (${educationEntries.length})`}>
            {educationEntries.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No education entries recorded</p>
            ) : educationEntries.map((edu, i) => (
              <div key={edu.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 10, marginBottom: i < educationEntries.length - 1 ? '0.5rem' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{edu.school_name}</strong>
                  <span className="adm-status-badge" style={{ background: edu.status === 'graduated' ? '#f0fdf4' : '#eff6ff', color: edu.status === 'graduated' ? '#10b981' : '#3b82f6', border: 'none', fontSize: '0.68rem' }}>{edu.status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{edu.level_of_study} • {edu.country} • {edu.degree_obtained || '—'}</div>
                {edu.gpa_score && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>GPA: {edu.gpa_score}</div>}
              </div>
            ))}
          </SectionCard>

          {/* Work Experience */}
          <SectionCard icon={<Briefcase size={16} style={{ color: '#f59e0b' }} />} title={`Work Experience (${workEntries.length})`}>
            {application.no_work_experience ? (
              <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: 10, fontSize: '0.82rem', color: '#f59e0b' }}>
                Applicant declared: No work experience. {application.no_work_experience_explanation && <><br /><em>"{application.no_work_experience_explanation}"</em></>}
              </div>
            ) : workEntries.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No work experience entries</p>
            ) : workEntries.map((w, i) => (
              <div key={w.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 10, marginBottom: i < workEntries.length - 1 ? '0.5rem' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{w.job_title} at {w.employer_name}</strong>
                  {w.currently_working && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>Current</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {w.employment_type} • {w.industry} • {w.city_state}, {w.country}<br />
                  {w.start_date} — {w.currently_working ? 'Present' : w.end_date || '—'}
                </div>
                {w.responsibilities && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, lineHeight: 1.5 }}>{w.responsibilities}</div>}
              </div>
            ))}
          </SectionCard>

          {/* English Proficiency */}
          <SectionCard icon={<Languages size={16} style={{ color: '#06b6d4' }} />} title="English Proficiency">
            <div className="adm-form-grid">
              <div>
                <InfoRow label="Method" value={application.english_proficiency_method} />
                <InfoRow label="Test Name" value={application.english_test_name} />
              </div>
              <div>
                <InfoRow label="Overall Score" value={application.english_overall_score} />
                <InfoRow label="Test Date" value={application.english_test_date} />
                <InfoRow label="TRF Number" value={application.english_trf_number} />
              </div>
            </div>
          </SectionCard>

          {/* Financial */}
          <SectionCard icon={<DollarSign size={16} style={{ color: '#10b981' }} />} title="Financial Information">
            <InfoRow label="Funding Source" value={application.funding_source} />
            <InfoRow label="Scholarship Release Auth" value={application.scholarship_release_auth} />
          </SectionCard>

          {/* Terms & Signature */}
          <SectionCard icon={<Shield size={16} style={{ color: '#3A4391' }} />} title="Declaration & Signature">
            <InfoRow label="Terms Accepted" value={application.terms_accepted ? '✓ Yes' : '✗ No'} />
            <InfoRow label="Signature" value={application.applicant_signature} />
            <InfoRow label="Signature Date" value={application.signature_date} />
          </SectionCard>

          {/* Submitted Documents */}
          <SectionCard icon={<Paperclip size={16} style={{ color: '#0ea5e9' }} />} title={`Submitted Documents (${documents.length})`}>
            {documents.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
                <FileText size={36} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: 0, color: '#334155', fontSize: '1rem', fontWeight: 600 }}>No documents submitted</h4>
                <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.86rem' }}>The agent hasn't uploaded any documents for this application yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ 
                    border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', background: '#fff',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#3b82f6' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 10, background: '#eff6ff', fill: '#3b82f6', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <FileText size={22} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.file_name}>
                          {doc.file_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, fontWeight: 500 }}>{doc.document_type}</div>
                        {doc.file_size && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>{(doc.file_size / 1024).toFixed(1)} KB</div>}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f8fafc' }}>
                      <button className="adm-btn adm-btn-primary adm-btn-sm" style={{ flex: 1.5, padding: '0.5rem', justifyContent: 'center', fontSize: '0.8rem' }} onClick={() => handlePreview(doc)}>
                        <Eye size={14} /> Open
                      </button>
                      <button className="adm-btn adm-btn-outline adm-btn-sm" style={{ flex: 1, padding: '0.5rem', justifyContent: 'center', fontSize: '0.8rem' }} onClick={() => handleDownload(doc)} title="Download context to save">
                        <Download size={14} /> Save
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" style={{ flex: 1, padding: '0.5rem', justifyContent: 'center', fontSize: '0.8rem' }} onClick={() => handleRejectDocument(doc)} title="Reject & request feedback automatically">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ─── RIGHT: Sidebar ─── */}
        <div style={{ position: 'sticky', top: 100 }}>
          {/* Quick Actions */}
          <div className="adm-card" style={{ marginBottom: '1rem' }}>
            <h3 className="adm-card-title" style={{ fontSize: '0.88rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem' }}>
              <select className="adm-form-input" style={{ flex: 1 }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={updateStatus} disabled={selectedStatus === application.status}>
                Save
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {application.status === 'submitted' && (
                <button className="adm-btn adm-btn-primary adm-btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedStatus('under_review'); updateStatus() }}>
                  Start Review
                </button>
              )}
              {application.status === 'under_review' && (
                <>
                  <button className="adm-btn adm-btn-success adm-btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedStatus('offer'); setTimeout(updateStatus, 0) }}>
                    <CheckCircle2 size={12} /> Offer
                  </button>
                  <button className="adm-btn adm-btn-danger adm-btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedStatus('rejected'); setTimeout(updateStatus, 0) }}>
                    <XCircle size={12} /> Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Agent Info */}
          <div className="adm-card" style={{ marginBottom: '1rem' }}>
            <h3 className="adm-card-title" style={{ fontSize: '0.88rem' }}><User size={14} /> Agent</h3>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{agent?.first_name} {agent?.last_name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{agent?.agency_name}</div>
            <div style={{ fontSize: '0.78rem', color: '#3A4391', marginTop: 2 }}>{agent?.email}</div>
            {agent?.phone && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{agent?.phone}</div>}
          </div>

          {/* Missing Documents Alert */}
          {missingDocs.length > 0 && (
            <div className="adm-card" style={{ marginBottom: '1rem', border: '1px solid #fecaca', background: '#fef2f2' }}>
              <h3 className="adm-card-title" style={{ fontSize: '0.88rem', color: '#ef4444' }}>
                <AlertTriangle size={14} /> Missing Documents ({missingDocs.length})
              </h3>
              {missingDocs.map(doc => (
                <div key={doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #fecaca25', fontSize: '0.82rem' }}>
                  <span style={{ color: '#dc2626', fontWeight: 500 }}>{doc}</span>
                  <button className="adm-btn adm-btn-danger adm-btn-sm" style={{ padding: '3px 8px', fontSize: '0.68rem' }} onClick={() => requestDocument(doc)}>
                    Request
                  </button>
                </div>
              ))}
              <button className="adm-btn adm-btn-outline adm-btn-sm" style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }} onClick={autoDetectMissing}>
                <AlertTriangle size={12} /> Request All Missing
              </button>
            </div>
          )}


          {/* Document Requests Status */}
          {docRequests.length > 0 && (
            <div className="adm-card" style={{ marginBottom: '1rem' }}>
              <h3 className="adm-card-title" style={{ fontSize: '0.88rem' }}>
                <FileWarning size={14} style={{ color: '#f59e0b' }} /> Document Requests ({docRequests.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {docRequests.map(dr => (
                  <div key={dr.id} className={`adm-doc-card ${dr.is_fulfilled ? 'uploaded' : 'missing'}`}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{dr.document_type}</div>
                      <div style={{ fontSize: '0.68rem', color: dr.is_fulfilled ? '#10b981' : '#ef4444' }}>
                        {dr.is_fulfilled ? '✓ Fulfilled' : '✗ Pending'} • {dr.priority}
                      </div>
                    </div>
                    {dr.is_auto_generated && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: '#fffbeb', color: '#f59e0b', padding: '2px 5px', borderRadius: 4 }}>AUTO</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communication Thread */}
          {user && (
            <ApplicationChat
              applicationId={id!}
              currentUserId={user.id}
              currentUserRole={profile?.role || 'admission_manager'}
              className="mt-4"
            />
          )}
        </div>
      </div>
      </main>
      <AdminFooter />
    </div>
  )
}
