import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, FileText, X, Eye } from 'lucide-react'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import type { AdmissionFormData, WorkExperienceEntry } from '../admissionTypes'
import { EMPLOYMENT_TYPES, INDUSTRIES, createEmptyWorkExperience } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  entries: WorkExperienceEntry[]
  onEntriesChange: (entries: WorkExperienceEntry[]) => void
  onNext: () => void
  onBack: () => void
}

export default function Step6WorkExperience({ data, onChange, entries, onEntriesChange, onNext, onBack }: Props) {
  const [previewFile, setPreviewFile] = useState<{ file: File; name: string } | null>(null)

  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })
  const update = (idx: number, key: keyof WorkExperienceEntry, val: any) => {
    const newEntries = [...entries]
    newEntries[idx] = { ...newEntries[idx], [key]: val }
    onEntriesChange(newEntries)
  }

  const addEntry = () => onEntriesChange([...entries, createEmptyWorkExperience()])
  const removeEntry = (idx: number) => {
    if (entries.length <= 1 && !data.no_work_experience) return
    onEntriesChange(entries.filter((_, i) => i !== idx))
  }

  const handleFile = (idx: number, key: 'recommendation_letter_file' | 'work_attestation_file' | 'additional_doc_file', file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    update(idx, key, file)
  }

  // Documents are now OPTIONAL — only core work info is required
  const isValid = data.no_work_experience
    ? data.no_work_experience_explanation.trim().length > 0
    : entries.length > 0 && entries.every(e =>
      e.employer_name && e.job_title && e.employment_type && e.industry &&
      e.country && e.city_state && e.start_date && e.responsibilities &&
      (e.currently_working || e.end_date)
    )

  return (
    <div>
      <h1 className="admission-step-title">Work Experience</h1>
      <p className="admission-step-subtitle">Add your professional background and employment history.</p>

      {/* No work experience checkbox */}
      <div className="adm-no-experience-box" style={{ marginBottom: '1.5rem' }}>
        <label className="adm-checkbox-label" style={{ fontWeight: 600 }}>
          <input type="checkbox" checked={data.no_work_experience} onChange={e => set('no_work_experience', e.target.checked)} />
          Applicant has no formal work experience
        </label>
        {data.no_work_experience && (
          <div style={{ marginTop: '0.75rem' }}>
            <label className="adm-label">Please explain <span className="required">*</span></label>
            <textarea className="adm-textarea" value={data.no_work_experience_explanation} onChange={e => set('no_work_experience_explanation', e.target.value)} placeholder="Describe any alternative experience (internship, volunteering, leadership, etc.)" rows={4} />
          </div>
        )}
      </div>

      {!data.no_work_experience && (
        <>
          {entries.map((entry, idx) => (
            <div className="adm-entry-card" key={idx}>
              <div className="adm-entry-card-header">
                <span className="adm-entry-card-title">Work Experience #{idx + 1}</span>
                {entries.length > 1 && (
                  <button className="adm-entry-card-remove" onClick={() => removeEntry(idx)}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>

              <div className="adm-form-grid">
                <div className="adm-form-group">
                  <label className="adm-label">Employer / Organization <span className="required">*</span></label>
                  <input className="adm-input" value={entry.employer_name} onChange={e => update(idx, 'employer_name', e.target.value)} placeholder="Company name" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Job Title / Position <span className="required">*</span></label>
                  <input className="adm-input" value={entry.job_title} onChange={e => update(idx, 'job_title', e.target.value)} placeholder="Job title" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Employment Type <span className="required">*</span></label>
                  <select className="adm-input" value={entry.employment_type} onChange={e => update(idx, 'employment_type', e.target.value)}>
                    <option value="">Select...</option>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Industry / Sector <span className="required">*</span></label>
                  <select className="adm-input" value={entry.industry} onChange={e => update(idx, 'industry', e.target.value)}>
                    <option value="">Select...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Country <span className="required">*</span></label>
                  <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === entry.country)} onChange={o => update(idx, 'country', o?.value || '')} placeholder="Country" classNamePrefix="react-select" className="adm-select" isClearable />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">City / State <span className="required">*</span></label>
                  <input className="adm-input" value={entry.city_state} onChange={e => update(idx, 'city_state', e.target.value)} placeholder="City, State" />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">Start Date <span className="required">*</span></label>
                  <input className="adm-input" type="date" value={entry.start_date} onChange={e => update(idx, 'start_date', e.target.value)} />
                </div>
                <div className="adm-form-group">
                  <label className="adm-label">End Date {!entry.currently_working && <span className="required">*</span>}</label>
                  <input className="adm-input" type="date" value={entry.end_date} onChange={e => update(idx, 'end_date', e.target.value)} disabled={entry.currently_working} />
                </div>
                <div className="adm-form-group adm-form-full">
                  <label className="adm-checkbox-label">
                    <input type="checkbox" checked={entry.currently_working} onChange={e => update(idx, 'currently_working', e.target.checked)} />
                    Currently Working Here
                  </label>
                </div>
                <div className="adm-form-group adm-form-full">
                  <label className="adm-label">Main Responsibilities <span className="required">*</span></label>
                  <textarea className="adm-textarea" value={entry.responsibilities} onChange={e => update(idx, 'responsibilities', e.target.value)} placeholder="Describe your key responsibilities" rows={3} />
                </div>
                {!entry.currently_working && (
                  <div className="adm-form-group adm-form-full">
                    <label className="adm-label">Reason for Leaving</label>
                    <textarea className="adm-textarea" value={entry.reason_for_leaving} onChange={e => update(idx, 'reason_for_leaving', e.target.value)} placeholder="Reason for leaving" rows={2} />
                  </div>
                )}
              </div>

              {/* Work Documents — One per line, ALL OPTIONAL */}
              <div style={{ marginTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Supporting Documents (Optional)</h4>

                {/* Recommendation Letter — own line */}
                <div className="adm-doc-single-line">
                  <label className="adm-label">Recommendation Letter</label>
                  <WorkDocUpload
                    file={entry.recommendation_letter_file || null}
                    onSelect={f => handleFile(idx, 'recommendation_letter_file', f)}
                    onClear={() => update(idx, 'recommendation_letter_file', null)}
                    onPreview={f => setPreviewFile({ file: f, name: f.name })}
                  />
                </div>

                {/* Work Attestation — own line */}
                <div className="adm-doc-single-line">
                  <label className="adm-label">Work Attestation</label>
                  <WorkDocUpload
                    file={entry.work_attestation_file || null}
                    onSelect={f => handleFile(idx, 'work_attestation_file', f)}
                    onClear={() => update(idx, 'work_attestation_file', null)}
                    onPreview={f => setPreviewFile({ file: f, name: f.name })}
                  />
                </div>

                {/* Additional Document — own line */}
                <div className="adm-doc-single-line">
                  <label className="adm-label">Additional Employment Document</label>
                  <WorkDocUpload
                    file={entry.additional_doc_file || null}
                    onSelect={f => handleFile(idx, 'additional_doc_file', f)}
                    onClear={() => update(idx, 'additional_doc_file', null)}
                    onPreview={f => setPreviewFile({ file: f, name: f.name })}
                  />
                </div>
              </div>
            </div>
          ))}

          <button className="adm-add-entry-btn" onClick={addEntry}>
            <Plus size={18} /> Add another work experience
          </button>
        </>
      )}

      {previewFile && (
        <DocumentPreviewModal file={previewFile.file} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />
      )}

      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}

function WorkDocUpload({ file, onSelect, onClear, onPreview }: { file: File | null; onSelect: (f: File) => void; onClear: () => void; onPreview: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      {!file ? (
        <div className="adm-upload-zone" onClick={() => ref.current?.click()} style={{ padding: '0.75rem' }}>
          <Upload size={18} className="upload-icon" />
          <div className="upload-text" style={{ fontSize: '0.8rem' }}>Drop or <span>browse</span></div>
          <div className="upload-hint">pdf, jpg, png, docx — Max 25MB</div>
        </div>
      ) : (
        <div className="adm-file-card" style={{ padding: '0.5rem 0.75rem' }}>
          <FileText size={16} className="file-icon" />
          <div className="file-info">
            <div className="file-name" style={{ fontSize: '0.78rem' }}>{file.name}</div>
            <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <div className="file-actions">
            <button onClick={() => onPreview(file)}><Eye size={14} /></button>
            <button className="delete-btn" onClick={onClear}><X size={14} /></button>
          </div>
        </div>
      )}
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onSelect(e.target.files[0]) }} />
    </>
  )
}
