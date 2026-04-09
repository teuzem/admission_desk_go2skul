import { useState, useRef } from 'react'
import { Upload, FileText, X, Eye } from 'lucide-react'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import type { AdmissionFormData } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  passportFile: File | null
  onPassportFile: (f: File | null) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Citizenship({ data, onChange, passportFile, onPassportFile, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'png', 'jpg', 'jpeg', 'docx'].includes(ext || '')) { alert('Unsupported file type'); return }
    onPassportFile(file)
  }

  const isValid = data.primary_citizenship && data.passport_number && data.passport_expiry_date && data.country_applying_from && passportFile

  return (
    <div>
      <h1 className="admission-step-title">Citizenship Information</h1>
      <p className="admission-step-subtitle">Provide your citizenship and passport details.</p>

      <div className="adm-form-grid">
        <div className="adm-form-group">
          <label className="adm-label">Primary Citizenship <span className="required">*</span></label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.primary_citizenship)} onChange={o => set('primary_citizenship', o?.value || '')} placeholder="Select country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Secondary Citizenship</label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.secondary_citizenship)} onChange={o => set('secondary_citizenship', o?.value || '')} placeholder="Select country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Passport/ID Number <span className="required">*</span></label>
          <input className="adm-input" value={data.passport_number} onChange={e => set('passport_number', e.target.value)} placeholder="AB1234567" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Passport/ID Expiry Date <span className="required">*</span></label>
          <input className="adm-input" type="date" value={data.passport_expiry_date} onChange={e => set('passport_expiry_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Country Applying From <span className="required">*</span></label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.country_applying_from)} onChange={o => set('country_applying_from', o?.value || '')} placeholder="Select country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>

        {/* Passport Upload */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Attach a copy of Passport/ID below <span className="required">*</span></label>
          {!passportFile ? (
            <div
              className={`adm-upload-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            >
              <Upload size={28} className="upload-icon" />
              <div className="upload-text">Drop files to attach, or <span>browse</span></div>
              <div className="upload-hint">docx, jpg, png, pdf — Max 25MB</div>
            </div>
          ) : (
            <div className="adm-file-card">
              <FileText size={20} className="file-icon" />
              <div className="file-info">
                <div className="file-name">{passportFile.name}</div>
                <div className="file-size">{(passportFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div className="file-actions">
                <button onClick={() => setPreviewOpen(true)} title="Preview"><Eye size={16} /></button>
                <button className="delete-btn" onClick={() => onPassportFile(null)} title="Remove"><X size={16} /></button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      </div>

      {previewOpen && passportFile && (
        <DocumentPreviewModal
          file={passportFile}
          fileName={passportFile.name}
          onClose={() => setPreviewOpen(false)}
          onDelete={() => { onPassportFile(null); setPreviewOpen(false) }}
          onReplace={() => { setPreviewOpen(false); fileRef.current?.click() }}
        />
      )}

      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}
