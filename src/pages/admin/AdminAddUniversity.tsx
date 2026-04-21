import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft, Building2, Globe, ImageIcon, CheckCircle2,
  Upload, X, Loader2, Save, MapPin, Plus, Trash2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadUniversityLogo, uploadUniversityCampusImage } from '../../lib/storageHelpers'
import toast from 'react-hot-toast'
import '../dashboard/DashboardPages.css'
import './AdminPages.css'

const REGIONS = ['North America', 'Europe', 'Asia', 'Africa', 'Caribbean', 'South America', 'Oceania', 'Middle East']
const COUNTRIES = [
  'Canada', 'United States', 'United Kingdom', 'France', 'Germany', 'Australia',
  'Netherlands', 'Italy', 'Spain', 'Switzerland', 'Ireland', 'Sweden', 'Denmark',
  'Norway', 'Finland', 'Belgium', 'Austria', 'New Zealand', 'Japan', 'South Korea',
  'China', 'Singapore', 'Malaysia', 'India', 'South Africa', 'Nigeria', 'Kenya',
  'Ghana', 'Egypt', 'Morocco', 'Turkey', 'UAE', 'Saudi Arabia', 'Jamaica',
  'Trinidad & Tobago', 'Barbados', 'Antigua & Barbuda', 'Brazil', 'Mexico',
  'Cameroon', 'Senegal', 'Côte d\'Ivoire', 'Czech Republic', 'Poland', 'Hungary',
  'Portugal', 'Cyprus', 'Malta', 'Estonia', 'Latvia', 'Lithuania', 'Other'
]

interface CampusData {
  id?: string
  campus_name: string
  country: string
  city: string
  region: string
  address: string
  postal_code: string
  phone: string
  email: string
  website_url: string
  student_count: number | null
  is_main: boolean
}

const EMPTY_CAMPUS: CampusData = {
  campus_name: '', country: '', city: '', region: '', address: '',
  postal_code: '', phone: '', email: '', website_url: '', student_count: null, is_main: false
}

interface UniversityFormData {
  name: string
  country: string
  region: string
  city: string
  established: number | null
  ranking: string
  global_ranking: number | null
  accreditation: string
  student_count: number | null
  acceptance_rate: number | null
  about: string
  description: string
  website_url: string
  features: string[]
  is_active: boolean
  is_multisite: boolean
}

const INITIAL_FORM: UniversityFormData = {
  name: '', country: '', region: '', city: '', established: null,
  ranking: '', global_ranking: null, accreditation: '', student_count: null,
  acceptance_rate: null, about: '', description: '', website_url: '',
  features: [], is_active: true, is_multisite: false
}

const STEPS_SINGLE = [
  { label: 'Basic Info', icon: <Building2 size={16} /> },
  { label: 'Web & Features', icon: <Globe size={16} /> },
  { label: 'Media & Review', icon: <ImageIcon size={16} /> },
]
const STEPS_MULTI = [
  { label: 'Basic Info', icon: <Building2 size={16} /> },
  { label: 'Campuses', icon: <MapPin size={16} /> },
  { label: 'Web & Features', icon: <Globe size={16} /> },
  { label: 'Media & Review', icon: <ImageIcon size={16} /> },
]

export default function AdminAddUniversity() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<UniversityFormData>({ ...INITIAL_FORM })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [campusFile, setCampusFile] = useState<File | null>(null)
  const [campusPreview, setCampusPreview] = useState<string | null>(null)
  const { user, isAdmissionManager, isAdmin, isSuperAdmin } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [newFeature, setNewFeature] = useState('')
  const [campuses, setCampuses] = useState<CampusData[]>([])
  const [expandedCampus, setExpandedCampus] = useState<number | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const campusInputRef = useRef<HTMLInputElement>(null)

  const f = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }))

  const handleFileChange = (file: File | undefined, setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const addFeature = () => {
    if (newFeature.trim() && !form.features.includes(newFeature.trim())) {
      f('features', [...form.features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const STEPS = form.is_multisite ? STEPS_MULTI : STEPS_SINGLE
  const stepOffset = form.is_multisite ? 1 : 0
  const webStep = 2 + stepOffset
  const mediaStep = 3 + stepOffset

  const addCampus = () => {
    setCampuses(prev => [...prev, { ...EMPTY_CAMPUS, country: form.country, is_main: prev.length === 0 }])
    setExpandedCampus(campuses.length)
  }
  const removeCampus = (idx: number) => {
    setCampuses(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length > 0 && !next.some(c => c.is_main)) next[0].is_main = true
      return next
    })
    setExpandedCampus(null)
  }
  const updateCampus = (idx: number, key: keyof CampusData, value: any) => {
    setCampuses(prev => prev.map((c, i) => {
      if (i !== idx) return key === 'is_main' && value ? { ...c, is_main: false } : c
      return { ...c, [key]: value }
    }))
  }

  const canProceed = (s: number) => {
    if (s === 1) return !!form.name && !!form.country
    if (form.is_multisite && s === 2) return campuses.length >= 2 && campuses.every(c => c.campus_name && c.country && c.city)
    return true
  }

  const handleSubmit = async () => {
    if (!form.name || !form.country) { toast.error('Name and country are required'); return }
    if (form.is_multisite && campuses.length < 2) { toast.error('Multisite universities need at least 2 campuses'); return }
    setSubmitting(true)

    const isPending = isAdmissionManager && !isAdmin && !isSuperAdmin

    try {
      if (isPending) {
        const payload = { ...form, campuses: form.is_multisite ? campuses : [] }
        const { error } = await supabase.from('pending_submissions').insert({
          submitted_by: user?.id, submission_type: 'university', payload, status: 'pending'
        })
        if (error) throw error
        toast.success('University submitted for approval! Awaiting Super Admin review.')
        navigate('/admin/programs')
      } else {
        const { data: inserted, error } = await supabase.from('universities').insert({
          name: form.name, country: form.country, region: form.region || null,
          city: form.is_multisite ? null : (form.city || null),
          established: form.established, ranking: form.ranking || null,
          global_ranking: form.global_ranking, accreditation: form.accreditation || null,
          student_count: form.student_count, acceptance_rate: form.acceptance_rate,
          about: form.about || null, description: form.description || null,
          website_url: form.website_url || null,
          features: form.features.length > 0 ? form.features : null,
          is_active: form.is_active, is_multisite: form.is_multisite
        }).select('id').single()
        if (error) throw error

        if (inserted) {
          // Upload images
          const updates: any = {}
          if (logoFile) { try { updates.logo_url = await uploadUniversityLogo(inserted.id, logoFile) } catch (e) { console.error('Logo upload failed:', e) } }
          if (campusFile) { try { updates.image_url = await uploadUniversityCampusImage(inserted.id, campusFile) } catch (e) { console.error('Campus image upload failed:', e) } }
          if (Object.keys(updates).length > 0) await supabase.from('universities').update(updates).eq('id', inserted.id)

          // Insert campuses for multisite
          if (form.is_multisite && campuses.length > 0) {
            const campusRows = campuses.map(c => ({
              university_id: inserted.id, campus_name: c.campus_name, country: c.country,
              city: c.city || null, region: c.region || null, address: c.address || null,
              postal_code: c.postal_code || null, phone: c.phone || null, email: c.email || null,
              website_url: c.website_url || null, student_count: c.student_count, is_main: c.is_main
            }))
            const { error: campErr } = await supabase.from('university_campuses').insert(campusRows)
            if (campErr) console.error('Campus insert failed:', campErr)
          }
        }
        toast.success('University created successfully!')
        navigate(isAdmissionManager ? '/admin/programs' : '/admin')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit university')
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
            <h1 className="page-title" style={{ margin: 0 }}>Add New University</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>Register a new partner institution.</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => {
            const num = i + 1
            const active = step === num, done = step > num
            return (
              <div key={num} className={`wizard-step ${active ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => done && setStep(num)}>
                <div className="wizard-step-circle">{done ? <CheckCircle2 size={14} /> : num}</div>
                <span className="wizard-step-label">{s.icon} {s.label}</span>
              </div>
            )
          })}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#eff6ff', color: '#3A4391' }}><Building2 size={20} /></div>
              <div>
                <h2 className="admin-form-title">University Information</h2>
                <p className="admin-form-subtitle">Basic details about this institution.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group form-grid-full">
                <label className="form-label">University Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g., University of Toronto" />
              </div>
              <div className="form-group">
                <label className="form-label">Country <span className="required">*</span></label>
                <select className="form-input" value={form.country} onChange={e => f('country', e.target.value)}>
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <select className="form-input" value={form.region} onChange={e => f('region', e.target.value)}>
                  <option value="">Select region...</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {!form.is_multisite && <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => f('city', e.target.value)} placeholder="e.g., Toronto" />
              </div>}
              <div className="form-group form-grid-full">
                <div className="multisite-toggle-card" onClick={() => { f('is_multisite', !form.is_multisite); if (!form.is_multisite && campuses.length === 0) { setCampuses([{ ...EMPTY_CAMPUS, country: form.country, is_main: true }]); } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`multisite-switch ${form.is_multisite ? 'active' : ''}`}><div className="multisite-switch-knob" /></div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Multisite University</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>This university has multiple campuses in different locations/countries</div>
                    </div>
                  </div>
                  {form.is_multisite && <span className="tag-chip" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}><MapPin size={12} /> Multisite Enabled</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Year Established</label>
                <input className="form-input" type="number" value={form.established ?? ''} onChange={e => f('established', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 1827" />
              </div>
              <div className="form-group">
                <label className="form-label">Ranking (text)</label>
                <input className="form-input" value={form.ranking} onChange={e => f('ranking', e.target.value)} placeholder="e.g., Top 100 QS World" />
              </div>
              <div className="form-group">
                <label className="form-label">Global Ranking (#)</label>
                <input className="form-input" type="number" value={form.global_ranking ?? ''} onChange={e => f('global_ranking', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 34" />
              </div>
              <div className="form-group">
                <label className="form-label">Accreditation</label>
                <input className="form-input" value={form.accreditation} onChange={e => f('accreditation', e.target.value)} placeholder="e.g., AACSB, EQUIS, AMBA" />
              </div>
              <div className="form-group">
                <label className="form-label">Student Count</label>
                <input className="form-input" type="number" value={form.student_count ?? ''} onChange={e => f('student_count', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 45000" />
              </div>
              <div className="form-group">
                <label className="form-label">Acceptance Rate (%)</label>
                <input className="form-input" type="number" min="0" max="100" value={form.acceptance_rate ?? ''} onChange={e => f('acceptance_rate', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 43" />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">About</label>
                <textarea className="form-input" rows={3} value={form.about} onChange={e => f('about', e.target.value)} placeholder="Brief summary about the university..." />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={4} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Detailed description, history, notable programs..." />
              </div>
            </div>
            <div className="admin-form-actions">
              <div />
              <button className="btn btn-primary btn-lg" disabled={!canProceed(1)} onClick={() => setStep(2)}>
                {form.is_multisite ? 'Next: Campuses →' : 'Next: Web & Features →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Campuses (multisite only) */}
        {form.is_multisite && step === 2 && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><MapPin size={20} /></div>
              <div>
                <h2 className="admin-form-title">Campus Locations</h2>
                <p className="admin-form-subtitle">Add all campuses for this university. Minimum 2 campuses required.</p>
              </div>
            </div>
            <div className="campus-list">
              {campuses.map((campus, idx) => (
                <div key={idx} className={`campus-card ${expandedCampus === idx ? 'expanded' : ''}`}>
                  <div className="campus-card-header" onClick={() => setExpandedCampus(expandedCampus === idx ? null : idx)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <MapPin size={16} style={{ color: campus.is_main ? '#f59e0b' : '#94a3b8' }} />
                      <div>
                        <strong>{campus.campus_name || `Campus ${idx + 1}`}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '8px' }}>{campus.city ? `${campus.city}, ` : ''}{campus.country}</span>
                      </div>
                      {campus.is_main && <span className="tag-chip" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.7rem', padding: '2px 8px' }}>Main Campus</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="admin-icon-btn" style={{ color: '#ef4444' }} onClick={e => { e.stopPropagation(); removeCampus(idx) }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {expandedCampus === idx && (
                    <div className="campus-card-body">
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Campus Name <span className="required">*</span></label>
                          <input className="form-input" value={campus.campus_name} onChange={e => updateCampus(idx, 'campus_name', e.target.value)} placeholder="e.g., Main Campus Paris" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Country <span className="required">*</span></label>
                          <select className="form-input" value={campus.country} onChange={e => updateCampus(idx, 'country', e.target.value)}>
                            <option value="">Select...</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">City <span className="required">*</span></label>
                          <input className="form-input" value={campus.city} onChange={e => updateCampus(idx, 'city', e.target.value)} placeholder="e.g., Paris" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Region</label>
                          <select className="form-input" value={campus.region} onChange={e => updateCampus(idx, 'region', e.target.value)}>
                            <option value="">Select...</option>
                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="form-group form-grid-full">
                          <label className="form-label">Address</label>
                          <input className="form-input" value={campus.address} onChange={e => updateCampus(idx, 'address', e.target.value)} placeholder="Street address" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Postal Code</label>
                          <input className="form-input" value={campus.postal_code} onChange={e => updateCampus(idx, 'postal_code', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone</label>
                          <input className="form-input" value={campus.phone} onChange={e => updateCampus(idx, 'phone', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email</label>
                          <input className="form-input" value={campus.email} onChange={e => updateCampus(idx, 'email', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Student Count</label>
                          <input className="form-input" type="number" value={campus.student_count ?? ''} onChange={e => updateCampus(idx, 'student_count', e.target.value ? parseInt(e.target.value) : null)} />
                        </div>
                        <div className="form-group form-grid-full">
                          <label className="admin-checkbox"><input type="checkbox" checked={campus.is_main} onChange={e => updateCampus(idx, 'is_main', e.target.checked)} /><span>Set as Main Campus</span></label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button className="btn btn-outline" onClick={addCampus} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.85rem' }}>
                <Plus size={16} /> Add Campus
              </button>
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" disabled={!canProceed(2)} onClick={() => setStep(webStep)}>Next: Web & Features →</button>
            </div>
          </div>
        )}

        {/* Web & Features Step */}
        {step === webStep && (
          <div className="card-panel admin-form-card">
            <div className="admin-form-header">
              <div className="admin-form-icon" style={{ background: '#f0fdf4', color: '#10b981' }}><Globe size={20} /></div>
              <div>
                <h2 className="admin-form-title">Web & Features</h2>
                <p className="admin-form-subtitle">Online presence and key features.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group form-grid-full">
                <label className="form-label">Website URL</label>
                <input className="form-input" value={form.website_url} onChange={e => f('website_url', e.target.value)} placeholder="https://www.university.edu" />
              </div>
              <div className="form-group form-grid-full">
                <label className="form-label">Key Features / Highlights</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="e.g., Research-intensive, Study abroad programs"
                    style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} />
                  <button className="btn btn-outline btn-sm" onClick={addFeature} type="button"><span style={{ display: 'flex', alignItems: 'center' }}>+</span></button>
                </div>
                {form.features.length > 0 && (
                  <div className="tag-list">
                    {form.features.map(feat => (
                      <span key={feat} className="tag-chip">{feat} <button onClick={() => f('features', form.features.filter(x => x !== feat))}><X size={12} /></button></span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <label className="admin-checkbox" style={{ marginTop: '1rem' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
              <span>Active (visible to agents)</span>
            </label>
            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(form.is_multisite ? 2 : 1)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(mediaStep)}>Next: Media & Review →</button>
            </div>
          </div>
        )}

        {/* Media & Review Step */}
        {step === mediaStep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-panel admin-form-card">
              <h2 className="admin-form-title" style={{ marginBottom: '1rem' }}>Upload Images</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">University Logo</label>
                  <div className="admin-upload-zone admin-upload-zone-sm" onClick={() => logoInputRef.current?.click()}>
                    {logoPreview ? (
                      <div className="admin-upload-preview">
                        <img src={logoPreview} alt="Logo" />
                        <button className="admin-upload-remove" onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null) }}><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="admin-upload-placeholder">
                        <Upload size={22} /><span>Upload Logo</span><small>Max 5MB</small>
                      </div>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={e => handleFileChange(e.target.files?.[0], setLogoFile, setLogoPreview)} style={{ display: 'none' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Campus Image</label>
                  <div className="admin-upload-zone admin-upload-zone-sm" onClick={() => campusInputRef.current?.click()}>
                    {campusPreview ? (
                      <div className="admin-upload-preview">
                        <img src={campusPreview} alt="Campus" />
                        <button className="admin-upload-remove" onClick={e => { e.stopPropagation(); setCampusFile(null); setCampusPreview(null) }}><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="admin-upload-placeholder">
                        <Upload size={22} /><span>Upload Campus Image</span><small>Max 5MB</small>
                      </div>
                    )}
                    <input ref={campusInputRef} type="file" accept="image/*" onChange={e => handleFileChange(e.target.files?.[0], setCampusFile, setCampusPreview)} style={{ display: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Review */}
            <div className="card-panel admin-form-card">
              <h2 className="admin-form-title" style={{ marginBottom: '1.25rem' }}>📋 Review University Details</h2>
              <div className="review-grid">
                {[
                  ['Name', form.name || '—'], ['Country', form.country || '—'], ['Region', form.region || '—'],
                  ...(form.is_multisite ? [['Multisite', `✓ Yes — ${campuses.length} campuses`]] : [['City', form.city || '—']]),
                  ['Established', form.established?.toString() || '—'],
                  ['Ranking', form.ranking || '—'], ['Global #', form.global_ranking?.toString() || '—'],
                  ['Accreditation', form.accreditation || '—'], ['Students', form.student_count?.toLocaleString() || '—'],
                  ['Acceptance', form.acceptance_rate ? `${form.acceptance_rate}%` : '—'],
                  ['Website', form.website_url || '—'], ['Active', form.is_active ? '✓ Yes' : '✗ No'],
                ].map(([k, v]) => (
                  <div key={k as string} className="review-item">
                    <div className="review-label">{k}</div>
                    <div className="review-value">{v}</div>
                  </div>
                ))}
              </div>
              {form.features.length > 0 && (
                <div className="review-block">
                  <div className="review-label">Features</div>
                  <div className="tag-list" style={{ marginTop: '4px' }}>
                    {form.features.map(feat => <span key={feat} className="tag-chip tag-chip-static">{feat}</span>)}
                  </div>
                </div>
              )}
              {form.is_multisite && campuses.length > 0 && (
                <div className="review-block">
                  <div className="review-label">Campuses</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {campuses.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                        <MapPin size={13} style={{ color: c.is_main ? '#f59e0b' : '#94a3b8' }} />
                        <strong>{c.campus_name}</strong> — {c.city}, {c.country}
                        {c.is_main && <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>Main</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(webStep)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}
                style={{ background: '#00CCA0', borderColor: '#00CCA0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {submitting ? <><Loader2 size={16} className="spinning" /> Submitting...</> : <><Save size={16} /> {(isAdmissionManager && !isAdmin && !isSuperAdmin) ? 'Submit for Approval' : 'Create University'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
