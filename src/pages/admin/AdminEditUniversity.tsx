import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft, Building2, Globe, ImageIcon, CheckCircle2,
  Upload, X, Loader2, Save
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
}

const INITIAL_FORM: UniversityFormData = {
  name: '', country: '', region: '', city: '', established: null,
  ranking: '', global_ranking: null, accreditation: '', student_count: null,
  acceptance_rate: null, about: '', description: '', website_url: '',
  features: [], is_active: true
}

const STEPS = [
  { label: 'Basic Info', icon: <Building2 size={16} /> },
  { label: 'Web & Features', icon: <Globe size={16} /> },
  { label: 'Media & Review', icon: <ImageIcon size={16} /> },
]

export default function AdminEditUniversity() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<UniversityFormData>({ ...INITIAL_FORM })
  const { user, isProgramManager, isAdmin, isSuperAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [campusFile, setCampusFile] = useState<File | null>(null)
  const [campusPreview, setCampusPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newFeature, setNewFeature] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const campusInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return;
    const fetchUniversity = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('universities').select('*').eq('id', id).single()
      if (error || !data) {
        toast.error('Failed to load university')
        navigate('/admin')
      } else {
        setForm({
          name: data.name || '',
          country: data.country || '',
          region: data.region || '',
          city: data.city || '',
          established: data.established,
          ranking: data.ranking || '',
          global_ranking: data.global_ranking,
          accreditation: data.accreditation || '',
          student_count: data.student_count,
          acceptance_rate: data.acceptance_rate,
          about: data.about || '',
          description: data.description || '',
          website_url: data.website_url || '',
          features: (data.features as string[]) || [],
          is_active: data.is_active
        })
        if (data.logo_url) setLogoPreview(data.logo_url)
        if (data.image_url) setCampusPreview(data.image_url)
      }
      setLoading(false)
    }
    fetchUniversity()
  }, [id, navigate])

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

  const canProceed = (s: number) => {
    if (s === 1) return !!form.name && !!form.country
    return true
  }

  const handleSubmit = async () => {
    if (!id) return
    if (!form.name || !form.country) { toast.error('Name and country are required'); return }
    setSubmitting(true)
    
    const isPending = isProgramManager && !isAdmin && !isSuperAdmin
    
    try {
      const updates: any = {
        name: form.name,
        country: form.country,
        region: form.region || null,
        city: form.city || null,
        established: form.established,
        ranking: form.ranking || null,
        global_ranking: form.global_ranking,
        accreditation: form.accreditation || null,
        student_count: form.student_count,
        acceptance_rate: form.acceptance_rate,
        about: form.about || null,
        description: form.description || null,
        website_url: form.website_url || null,
        features: form.features.length > 0 ? form.features : null,
        is_active: form.is_active
      }

      if (isPending) {
        // Enqueue update as an edit submission
        const payload = { ...form, target_id: id, edit_mode: true }
        const { error } = await supabase.from('pending_submissions').insert({
          submitted_by: user?.id,
          submission_type: 'university',
          payload: payload,
          status: 'pending'
        })
        if (error) throw error
        toast.success('Update submitted for approval!')
        navigate('/admin/programs')
      } else {
        if (logoFile) {
          try {
            updates.logo_url = await uploadUniversityLogo(id, logoFile)
          } catch (e) { console.error('Logo upload failed:', e) }
        }
        if (campusFile) {
          try {
            updates.image_url = await uploadUniversityCampusImage(id, campusFile)
          } catch (e) { console.error('Campus image upload failed:', e) }
        }

        const { error } = await supabase.from('universities').update(updates).eq('id', id)

        if (error) throw error

        toast.success('University updated successfully!')
        navigate(isProgramManager ? '/admin/programs' : '/admin')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update university')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page" style={{ padding: '2rem 2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="spinning" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="dashboard-page" style={{ padding: '2rem 2.5rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate((isProgramManager && !isAdmin && !isSuperAdmin) ? '/admin/programs' : '/admin')} className="admin-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Edit University</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>Update details for {form.name}</p>
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
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => f('city', e.target.value)} placeholder="e.g., Toronto" />
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
                Next: Web & Features →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Web & Features */}
        {step === 2 && (
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
              <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(3)}>Next: Media & Review →</button>
            </div>
          </div>
        )}

        {/* Step 3: Media & Review */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-panel admin-form-card">
              <h2 className="admin-form-title" style={{ marginBottom: '1rem' }}>Upload Images (Optional)</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">University Logo</label>
                  <div className="admin-upload-zone admin-upload-zone-sm" onClick={() => logoInputRef.current?.click()}>
                    {logoPreview ? (
                      <div className="admin-upload-preview">
                        <img src={logoPreview} alt="Logo" />
                        <button className="admin-upload-remove" onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); f('logo_url', null); }}><X size={14} /></button>
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
                        <button className="admin-upload-remove" onClick={e => { e.stopPropagation(); setCampusFile(null); setCampusPreview(null); f('image_url', null); }}><X size={14} /></button>
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
                  ['City', form.city || '—'], ['Established', form.established?.toString() || '—'],
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
            </div>

            <div className="admin-form-actions">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}
                style={{ background: '#00CCA0', borderColor: '#00CCA0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {submitting ? <><Loader2 size={16} className="spinning" /> Updating...</> : <><Save size={16} /> {(isProgramManager && !isAdmin && !isSuperAdmin) ? 'Submit Update for Approval' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
