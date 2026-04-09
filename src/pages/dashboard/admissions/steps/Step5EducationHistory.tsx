import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, FileText, X, Eye } from 'lucide-react'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import type { EducationEntry } from '../admissionTypes'
import { EDUCATION_LEVELS, SCHOOL_TYPES, EDUCATION_STATUS, createEmptyEducation } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  entries: EducationEntry[]
  onEntriesChange: (entries: EducationEntry[]) => void
  onNext: () => void
  onBack: () => void
}

export default function Step5EducationHistory({ entries, onEntriesChange, onNext, onBack }: Props) {
  const [previewFile, setPreviewFile] = useState<{ file: File; name: string } | null>(null)

  const update = (idx: number, key: keyof EducationEntry, val: any) => {
    const newEntries = [...entries]
    newEntries[idx] = { ...newEntries[idx], [key]: val }
    onEntriesChange(newEntries)
  }

  const addEntry = () => onEntriesChange([...entries, createEmptyEducation()])
  const removeEntry = (idx: number) => {
    if (entries.length <= 1) return
    onEntriesChange(entries.filter((_, i) => i !== idx))
  }

  const handleFile = (idx: number, key: 'transcript_file' | 'certificate_file', file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    update(idx, key, file)
  }

  // Only require: level_of_study, country, school_name, status (and graduation_date if graduated)
  // Transcript/Certificate and additional entries are OPTIONAL
  const isValid = entries.length > 0 && entries.every(e =>
    e.level_of_study && e.country && e.school_name && e.status &&
    (e.status !== 'Graduated' || e.graduation_date)
  )

  return (
    <div>
      <h1 className="admission-step-title">Education History</h1>
      <p className="admission-step-subtitle">Add your academic background, starting with the most recent.</p>

      {entries.map((entry, idx) => (
        <div className="adm-entry-card" key={idx}>
          <div className="adm-entry-card-header">
            <span className="adm-entry-card-title">Education Entry #{idx + 1}</span>
            {entries.length > 1 && (
              <button className="adm-entry-card-remove" onClick={() => removeEntry(idx)}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-label">Level of Study <span className="required">*</span></label>
              <select className="adm-input" value={entry.level_of_study} onChange={e => update(idx, 'level_of_study', e.target.value)}>
                <option value="">Select...</option>
                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">School Type</label>
              <select className="adm-input" value={entry.school_type} onChange={e => update(idx, 'school_type', e.target.value)}>
                <option value="">Select...</option>
                {SCHOOL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Country <span className="required">*</span></label>
              <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === entry.country)} onChange={o => update(idx, 'country', o?.value || '')} placeholder="Country" classNamePrefix="react-select" className="adm-select" isClearable />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">School Name <span className="required">*</span></label>
              <input className="adm-input" value={entry.school_name} onChange={e => update(idx, 'school_name', e.target.value)} placeholder="School name" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">CEEB Code</label>
              <input className="adm-input" value={entry.ceeb_code} onChange={e => update(idx, 'ceeb_code', e.target.value)} placeholder="Optional" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Status <span className="required">*</span></label>
              <select className="adm-input" value={entry.status} onChange={e => update(idx, 'status', e.target.value)}>
                <option value="">Select...</option>
                {EDUCATION_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Graduation Date {entry.status === 'Graduated' && <span className="required">*</span>}</label>
              <input className="adm-input" type="date" value={entry.graduation_date} onChange={e => update(idx, 'graduation_date', e.target.value)} />
            </div>
            {entry.status === 'Graduated' && (
              <div className="adm-form-group">
                <label className="adm-label">Degree / Certificate Obtained</label>
                <input className="adm-input" value={entry.degree_obtained} onChange={e => update(idx, 'degree_obtained', e.target.value)} placeholder="e.g., Bachelor of Science" />
              </div>
            )}
            <div className="adm-form-group">
              <label className="adm-label">GPA / Final Score</label>
              <input className="adm-input" value={entry.gpa_score} onChange={e => update(idx, 'gpa_score', e.target.value)} placeholder="e.g., 3.5/4.0" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Start Date</label>
              <input className="adm-input" type="date" value={entry.start_date} onChange={e => update(idx, 'start_date', e.target.value)} />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">End Date</label>
              <input className="adm-input" type="date" value={entry.end_date} onChange={e => update(idx, 'end_date', e.target.value)} />
            </div>
          </div>

          {/* Document Uploads — One per line, all optional */}
          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Supporting Documents (Optional)</h4>

            {/* Transcript — own line */}
            <div className="adm-doc-single-line">
              <label className="adm-label">Transcript</label>
              <FileUploadMini
                file={entry.transcript_file || null}
                onSelect={f => handleFile(idx, 'transcript_file', f)}
                onClear={() => update(idx, 'transcript_file', null)}
                onPreview={f => setPreviewFile({ file: f, name: f.name })}
              />
            </div>

            {/* Certificate — own line */}
            <div className="adm-doc-single-line">
              <label className="adm-label">Certificate / Diploma</label>
              <FileUploadMini
                file={entry.certificate_file || null}
                onSelect={f => handleFile(idx, 'certificate_file', f)}
                onClear={() => update(idx, 'certificate_file', null)}
                onPreview={f => setPreviewFile({ file: f, name: f.name })}
              />
            </div>
          </div>
        </div>
      ))}

      <button className="adm-add-entry-btn" onClick={addEntry}>
        <Plus size={18} /> Add another education entry
      </button>

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

function FileUploadMini({ file, onSelect, onClear, onPreview }: { file: File | null; onSelect: (f: File) => void; onClear: () => void; onPreview: (f: File) => void }) {
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
