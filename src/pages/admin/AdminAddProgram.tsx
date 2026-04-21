import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft, GraduationCap, BookOpen, DollarSign, ClipboardList,
  ImageIcon, CheckCircle2, Plus, X, Upload, Loader2, Save, MapPin
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadProgramCover } from '../../lib/storageHelpers'
import toast from 'react-hot-toast'
import '../dashboard/DashboardPages.css'
import './AdminPages.css'

const LEVELS = [
  'certificate', 'certificate_of_higher_education', 'continuing_education',
  'diploma', 'executive_course', 'executive_education', 'foundation',
  'graduate_program', 'management_development', 'postgraduate',
  'preparatory_program', 'professional_qualification', 'undergraduate',
  'undergraduate_foundation', 'bachelor', 'master', 'phd'
]

const LEVEL_DISPLAY: Record<string, string> = {
  certificate: 'Certificate',
  certificate_of_higher_education: 'Certificate of Higher Education',
  continuing_education: 'Continuing Education',
  diploma: 'Diploma',
  executive_course: 'Executive Course',
  executive_education: 'Executive Education',
  foundation: 'Foundation',
  graduate_program: 'Graduate Program',
  management_development: 'Management Development Programs',
  postgraduate: 'Postgraduate',
  preparatory_program: 'Preparatory Program',
  professional_qualification: 'Professional Qualification',
  undergraduate: 'Undergraduate',
  undergraduate_foundation: 'Undergraduate + Foundation',
  bachelor: "Bachelor's",
  master: "Master's",
  phd: 'PhD'
}
const CATEGORIES = [
  'Business & Management', 'Computer Science & IT', 'Engineering', 'Medicine & Health',
  'Arts & Humanities', 'Social Sciences', 'Natural Sciences', 'Law', 'Education',
  'Architecture & Design', 'Agriculture', 'Media & Communication', 'Hospitality & Tourism',
  'Environmental Studies', 'Mathematics & Statistics', 'Economics & Finance', 'Other'
]
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY', 'INR', 'ZAR', 'XOF', 'XAF', 'NGN', 'KES']
const LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Chinese', 'Arabic', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Italian', 'Dutch', 'Turkish', 'Bilingual (EN/FR)', 'Other']
const DELIVERY_MODES = ['on-campus', 'online', 'hybrid']
const CAMPUS_TYPES = ['Urban', 'Suburban', 'Rural', 'Multiple Campuses', 'Virtual']

interface ProgramFormData {
  university_id: string
  name: string
  level: string
  category: string
  duration: string
  duration_months: number | null
  language: string
  delivery_mode: string
  campus_type: string
  tuition_fee: number | null
  currency: string
  application_fee: number | null
  application_deadline: string
  start_dates: string[]
  intake: string
  description: string
  requirements: string
  requirements_list: string[]
  english_requirements: string
  prerequisites: string
  curriculum_summary: string
  scholarship_available: boolean
  accommodation_available: boolean
  visa_support: boolean
  is_active: boolean
  is_all_campuses: boolean
  campus_ids: string[]
}

const INITIAL_FORM: ProgramFormData = {
  university_id: '',
  name: '',
  level: '',
  category: '',
  duration: '',
  duration_months: null,
  language: 'English',
  delivery_mode: 'on-campus',
  campus_type: '',
  tuition_fee: null,
  currency: 'USD',
  application_fee: null,
  application_deadline: '',
  start_dates: [],
  intake: '',
  description: '',
  requirements: '',
  requirements_list: [],
  english_requirements: '',
  prerequisites: '',
  curriculum_summary: '',
  scholarship_available: false,
  accommodation_available: false,
  visa_support: true,
  is_active: true,
  is_all_campuses: true,
  campus_ids: []
}

const STEPS = [
  { label: 'University', icon: <GraduationCap size={16} /> },
  { label: 'Program Info', icon: <BookOpen size={16} /> },
  { label: 'Fees & Dates', icon: <DollarSign size={16} /> },
  { label: 'Requirements', icon: <ClipboardList size={16} /> },
  { label: 'Media & Review', icon: <ImageIcon size={16} /> },
]

export default function AdminAddProgram() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ProgramFormData>({ ...INITIAL_FORM })
  const [universities, setUniversities] = useState<any[]>([])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const { user, isAdmissionManager, isAdmin, isSuperAdmin } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [newStartDate, setNewStartDate] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [campuses, setCampuses] = useState<any[]>([])
  const [isMultisite, setIsMultisite] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const f = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }))

  useEffect(() => {
    supabase.from('universities').select('id, name, country, city, is_multisite').eq('is_active', true).order('name')
      .then(({ data }) => setUniversities(data || []))
  }, [])

  // Fetch campuses when university changes
  useEffect(() => {
    const uni = universities.find(u => u.id === form.university_id)
    if (uni?.is_multisite) {
      setIsMultisite(true)
      supabase.from('university_campuses').select('*').eq('university_id', uni.id).eq('is_active', true).order('is_main', { ascending: false })
        .then(({ data }) => setCampuses(data || []))
    } else {
      setIsMultisite(false)
      setCampuses([])
      f('is_all_campuses', true)
      f('campus_ids', [])
    }
  }, [form.university_id, universities])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setCoverImage(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const addStartDate = () => {
    if (newStartDate && !form.start_dates.includes(newStartDate)) {
      f('start_dates', [...form.start_dates, newStartDate])
      setNewStartDate('')
    }
  }

  const removeStartDate = (d: string) => f('start_dates', form.start_dates.filter(x => x !== d))

  const addRequirement = () => {
    if (newRequirement.trim() && !form.requirements_list.includes(newRequirement.trim())) {
      f('requirements_list', [...form.requirements_list, newRequirement.trim()])
      setNewRequirement('')
    }
  }

  const removeRequirement = (r: string) => f('requirements_list', form.requirements_list.filter(x => x !== r))

  const selectedUni = universities.find(u => u.id === form.university_id)

  const canProceed = (s: number) => {
    if (s === 1) return !!form.university_id
    if (s === 2) return !!form.name && !!form.level
    if (s === 3) return true
    if (s === 4) return true
    return true
  }

  const handleSubmit = async () => {
    if (!form.university_id || !form.name || !form.level) {
      toast.error('University, program name and level are required'); return
    }
    if (isMultisite && !form.is_all_campuses && form.campus_ids.length === 0) {
      toast.error('Please select at least one campus'); return
    }
    setSubmitting(true)
    const isPending = isAdmissionManager && !isAdmin && !isSuperAdmin

    try {
      if (isPending) {
        const payload = {
          ...form,
          campuses_details: !form.is_all_campuses && campuses.length > 0
            ? campuses.filter(c => form.campus_ids.includes(c.id)).map(c => ({
              id: c.id,
              campus_name: c.campus_name,
              city: c.city,
              country: c.country,
              is_main: c.is_main
            }))
            : []
        }
        const { error } = await supabase.from('pending_submissions').insert({
          submitted_by: user?.id, submission_type: 'program', payload, status: 'pending'
        })
        if (error) throw error
        toast.success('Program submitted for approval!')
        navigate('/admin/programs')
      } else {
        const { data: inserted, error } = await supabase.from('programs').insert({
          university_id: form.university_id, name: form.name, level: form.level,
          category: form.category || null, duration: form.duration || null,
          duration_months: form.duration_months, language: form.language,
          delivery_mode: form.delivery_mode, campus_type: form.campus_type || null,
          tuition_fee: form.tuition_fee, currency: form.currency,
          application_fee: form.application_fee,
          application_deadline: form.application_deadline || null,
          start_dates: form.start_dates.length > 0 ? form.start_dates : null,
          intake: form.intake || null, description: form.description || null,
          requirements: form.requirements || null,
          requirements_list: form.requirements_list.length > 0 ? form.requirements_list : null,
          english_requirements: form.english_requirements || null,
          prerequisites: form.prerequisites || null,
          curriculum_summary: form.curriculum_summary || null,
          scholarship_available: form.scholarship_available,
          accommodation_available: form.accommodation_available,
          visa_support: form.visa_support, img_url: null,
          is_active: form.is_active, is_all_campuses: form.is_all_campuses
        }).select('id').single()
        if (error) throw error

        if (inserted) {
          // Upload cover image
          if (coverImage) {
            try {
              const imgUrl = await uploadProgramCover(inserted.id, coverImage)
              await supabase.from('programs').update({ img_url: imgUrl }).eq('id', inserted.id)
            } catch (imgErr) { console.error('Cover upload failed:', imgErr) }
          }
          // Insert campus assignments for campus-specific programs
          if (!form.is_all_campuses && form.campus_ids.length > 0) {
            const rows = form.campus_ids.map((cid: string) => ({ program_id: inserted.id, campus_id: cid }))
            await supabase.from('program_campus_assignments').insert(rows)
          }
        }
        toast.success('Program created successfully!')
        navigate(isAdmissionManager ? '/admin/programs' : '/admin')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit program')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page" style={{ padding: '2rem 2.5rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate((isAdmissionManager && !isAdmin && !isSuperAdmin) ? '/admin/programs' : '/admin')} className="admin-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Add New Program</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>Create a study program for a partner university.</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => {
            const num = i + 1
            const active = step === num, done = step > num
            return (
              <div
                key={num}
                className={`wizard-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => done && setStep(num)}
              >
                <div className="wizard-step-circle">
                  {done ? <CheckCircle2 size={14} /> : num}
                </div>
                <span className="wizard-step-label">{s.icon} {s.label}</span>
              </div>
            )
          })}
        </div>

        {/* Step 1: Select University */}
        {step === 1 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#eff6ff', color: '#3A4391' }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="admin-form-title">Select Partner University</h2>
                <p className="admin-form-subtitle">Choose the university this program belongs to.</p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">University <span className="required">*</span></label>
              <select className="form-input" value={form.university_id} onChange={e => f('university_id', e.target.value)}>
                <option value="">Select a university...</option>
                {universities.map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.city ? `${u.city}, ` : ''}{u.country}</option>
                ))}
              </select>
            </div>
            {selectedUni && (
              <div className="selected-uni-card">
                <GraduationCap size={20} />
                <div>
                  <strong>{selectedUni.name}</strong>
                  <span>{selectedUni.city ? `${selectedUni.city}, ` : ''}{selectedUni.country}{selectedUni.is_multisite ? ' — Multisite' : ''}</span>
                </div>
              </div>
            )}
            {isMultisite && campuses.length > 0 && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Campus Availability</label>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px' }}>Choose whether this program is available at all campuses or only specific ones.</p>
                <label className="admin-checkbox" style={{ marginBottom: '10px' }}>
                  <input type="checkbox" checked={form.is_all_campuses} onChange={e => { f('is_all_campuses', e.target.checked); if (e.target.checked) f('campus_ids', []) }} />
                  <span>Available at all campuses</span>
                </label>
                {!form.is_all_campuses && (
                  <div className="campus-assign-grid">
                    {campuses.map(c => {
                      const sel = form.campus_ids.includes(c.id)
                      return (
                        <div key={c.id} className={`campus-assign-item ${sel ? 'selected' : ''}`} onClick={() => {
                          f('campus_ids', sel ? form.campus_ids.filter((x: string) => x !== c.id) : [...form.campus_ids, c.id])
                        }}>
                          <input type="checkbox" checked={sel} readOnly />
                          <MapPin size={14} style={{ color: c.is_main ? '#f59e0b' : '#94a3b8' }} />
                          <div style={{ flex: 1 }}>
                            <strong>{c.campus_name}</strong>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>{c.city}, {c.country}</span>
                          </div>
                          {c.is_main && <span style={{ fontSize: '0.68rem', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>Main</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="admin-form-actions">
              <div />
              <button className="btn btn-primary btn-lg" disabled={!canProceed(1)} onClick={() => setStep(2)}>
                Next: Program Info →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Program Basics */}
        {step === 2 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="admin-form-title">Program Information</h2>
                <p className="admin-form-subtitle">Basic details about this study program.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group form-grid-full">
                <label className="form-label">Program Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g., Bachelor of Computer Science" />
              </div>
              <div className="form-group">
                <label className="form-label">Level <span className="required">*</span></label>
                <select className="form-input" value={form.level} onChange={e => f('level', e.target.value)}>
                  <option value="">Select level...</option>
                  {LEVELS.map(l => <option key={l} value={l}>{LEVEL_DISPLAY[l] || l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category / Subject Area</label>
                <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (text)</label>
                <input className="form-input" value={form.duration} onChange={e => f('duration', e.target.value)} placeholder="e.g., 4 Years, 18 Months" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (months)</label>
                <input className="form-input" type="number" value={form.duration_months ?? ''} onChange={e => f('duration_months', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 48" />
              </div>
              <div className="form-group">
                <label className="form-label">Language of Instruction</label>
                <select className="form-input" value={form.language} onChange={e => f('language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Mode</label>
                <select className="form-input" value={form.delivery_mode} onChange={e => f('delivery_mode', e.target.value)}>
                  {DELIVERY_MODES.map(m => <option key={m} value={m}>{m.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Campus Type</label>
                <select className="form-input" value={form.campus_type} onChange={e => f('campus_type', e.target.value)}>
                  <option value="">Select...</option>
                  {CAMPUS_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" disabled={!canProceed(2)} onClick={() => setStep(3)}>
                Next: Fees & Dates →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Fees & Dates */}
        {step === 3 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <h2 className="admin-form-title">Fees & Important Dates</h2>
                <p className="admin-form-subtitle">Tuition fees, application costs, and key dates.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tuition Fee (per year)</label>
                <input className="form-input" type="number" value={form.tuition_fee ?? ''} onChange={e => f('tuition_fee', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 15000" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency} onChange={e => f('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Application Fee</label>
                <input className="form-input" type="number" value={form.application_fee ?? ''} onChange={e => f('application_fee', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 100" />
              </div>
              <div className="form-group">
                <label className="form-label">Application Deadline</label>
                <input className="form-input" type="date" value={form.application_deadline} onChange={e => f('application_deadline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Intake Period</label>
                <input className="form-input" value={form.intake} onChange={e => f('intake', e.target.value)} placeholder="e.g., September, January" />
              </div>
              <div className="form-group">
                <label className="form-label">Start Dates</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} placeholder="e.g., September 2026" style={{ flex: 1 }} />
                  <button className="btn btn-outline btn-sm" onClick={addStartDate} type="button"><Plus size={14} /></button>
                </div>
                {form.start_dates.length > 0 && (
                  <div className="tag-list">
                    {form.start_dates.map(d => (
                      <span key={d} className="tag-chip">{d} <button onClick={() => removeStartDate(d)}><X size={12} /></button></span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="admin-checkbox-group">
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.scholarship_available} onChange={e => f('scholarship_available', e.target.checked)} />
                <span>Scholarship Available</span>
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.accommodation_available} onChange={e => f('accommodation_available', e.target.checked)} />
                <span>Accommodation Available</span>
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.visa_support} onChange={e => f('visa_support', e.target.checked)} />
                <span>Visa Support Provided</span>
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                <span>Active (visible to agents)</span>
              </label>
            </div>

            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(4)}>
                Next: Requirements →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Requirements & Curriculum */}
        {step === 4 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="admin-form-title">Requirements & Curriculum</h2>
                <p className="admin-form-subtitle">Entry requirements, prerequisites, and curriculum details.</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Program Description</label>
                <textarea className="form-input" rows={5} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Detailed description of the program, its objectives, career prospects..." />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Requirements (general text)</label>
                <textarea className="form-input" rows={3} value={form.requirements} onChange={e => f('requirements', e.target.value)} placeholder="e.g., High school diploma with minimum GPA of 3.0, relevant work experience..." />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Requirements (list items)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={newRequirement} onChange={e => setNewRequirement(e.target.value)} placeholder="Add a requirement..." style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirement())} />
                  <button className="btn btn-outline btn-sm" onClick={addRequirement} type="button"><Plus size={14} /></button>
                </div>
                {form.requirements_list.length > 0 && (
                  <div className="tag-list">
                    {form.requirements_list.map(r => (
                      <span key={r} className="tag-chip">{r} <button onClick={() => removeRequirement(r)}><X size={12} /></button></span>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">English Language Requirements</label>
                <textarea className="form-input" rows={2} value={form.english_requirements} onChange={e => f('english_requirements', e.target.value)} placeholder="e.g., IELTS 6.5 overall (no band below 6.0), TOEFL iBT 90..." />
              </div>
              <div className="form-group">
                <label className="form-label">Prerequisites</label>
                <textarea className="form-input" rows={2} value={form.prerequisites} onChange={e => f('prerequisites', e.target.value)} placeholder="e.g., Mathematics A-Level, Biology background..." />
              </div>
              <div className="form-group">
                <label className="form-label">Curriculum Summary</label>
                <textarea className="form-input" rows={4} value={form.curriculum_summary} onChange={e => f('curriculum_summary', e.target.value)} placeholder="Overview of the curriculum, key modules, specialisations..." />
              </div>
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(5)}>
                Next: Media & Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Media & Review */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Image Upload */}
            <div className="card-panel admin-form-card">
              <div className="admin-form-header">
                <div className="admin-form-icon" style={{ background: '#fce7f3', color: '#ec4899' }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h2 className="admin-form-title">Cover Image</h2>
                  <p className="admin-form-subtitle">Upload a cover image for this program (optional).</p>
                </div>
              </div>
              <div
                className="admin-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                {coverPreview ? (
                  <div className="admin-upload-preview">
                    <img src={coverPreview} alt="Preview" />
                    <button className="admin-upload-remove" onClick={e => { e.stopPropagation(); setCoverImage(null); setCoverPreview(null) }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="admin-upload-placeholder">
                    <Upload size={28} />
                    <span>Click to upload cover image</span>
                    <small>JPG, PNG, WebP — Max 5MB</small>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Review Summary */}
            <div className="card-panel admin-form-card">
              <h2 className="admin-form-title" style={{ marginBottom: '1.25rem' }}>📋 Review Program Details</h2>
              <div className="review-grid">
                {[
                  ['University', selectedUni?.name || '—'],
                  ['Program Name', form.name || '—'],
                  ['Level', form.level ? form.level.charAt(0).toUpperCase() + form.level.slice(1) : '—'],
                  ['Category', form.category || '—'],
                  ['Duration', form.duration || '—'],
                  ['Language', form.language],
                  ['Delivery', form.delivery_mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())],
                  ['Campus', form.campus_type || '—'],
                  ['Tuition', form.tuition_fee ? `${form.currency} ${form.tuition_fee.toLocaleString()}/yr` : '—'],
                  ['App. Fee', form.application_fee ? `${form.currency} ${form.application_fee}` : '—'],
                  ['Deadline', form.application_deadline || '—'],
                  ['Intake', form.intake || '—'],
                  ['Start Dates', form.start_dates.join(', ') || '—'],
                  ['Scholarship', form.scholarship_available ? '✓ Yes' : '✗ No'],
                  ['Accommodation', form.accommodation_available ? '✓ Yes' : '✗ No'],
                  ['Visa Support', form.visa_support ? '✓ Yes' : '✗ No'],
                  ['Active', form.is_active ? '✓ Yes' : '✗ No'],
                ].map(([k, v]) => (
                  <div key={k as string} className="review-item">
                    <div className="review-label">{k}</div>
                    <div className="review-value">{v}</div>
                  </div>
                ))}
              </div>
              {form.description && (
                <div className="review-block">
                  <div className="review-label">Description</div>
                  <div className="review-value-long">{form.description}</div>
                </div>
              )}
              {form.requirements_list.length > 0 && (
                <div className="review-block">
                  <div className="review-label">Requirements</div>
                  <ul className="review-list">
                    {form.requirements_list.map(r => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
              {form.english_requirements && (
                <div className="review-block">
                  <div className="review-label">English Requirements</div>
                  <div className="review-value-long">{form.english_requirements}</div>
                </div>
              )}
            </div>

            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(4)}>← Back</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ background: '#00CCA0', borderColor: '#00CCA0', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submitting ? <><Loader2 size={16} className="spinning" /> Submitting...</> : <><Save size={16} /> {(isAdmissionManager && !isAdmin && !isSuperAdmin) ? 'Submit for Approval' : 'Create Program'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
