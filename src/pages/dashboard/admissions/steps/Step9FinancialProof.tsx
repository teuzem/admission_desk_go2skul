import { useRef, useState } from 'react'
import { Upload, FileText, X, Eye } from 'lucide-react'
import type { AdmissionFormData } from '../admissionTypes'
import { FUNDING_SOURCES } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  financialFiles: File[]
  onFinancialFiles: (files: File[]) => void
  onNext: () => void
  onBack: () => void
}

export default function Step9FinancialProof({ data, onChange, financialFiles, onFinancialFiles, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<{ file: File; name: string } | null>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    onFinancialFiles([...financialFiles, file])
  }

  const removeFile = (idx: number) => {
    onFinancialFiles(financialFiles.filter((_, i) => i !== idx))
  }

  const isValid = data.funding_source && financialFiles.length > 0

  return (
    <div>
      <h1 className="admission-step-title">Financial Proof of Funds</h1>
      <p className="admission-step-subtitle">Provide evidence of financial capability to support your studies.</p>

      {/* Info block */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1.25rem', marginBottom: '2rem', fontSize: '0.88rem', color: '#1e40af', lineHeight: 1.6 }}>
        <strong>Required Documents:</strong>
        <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
          <li>Affidavit of Support</li>
          <li>Bank Statement</li>
          <li>DSO review for I-20 issuance (if applicable)</li>
        </ul>
      </div>

      <div className="adm-form-grid">
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">How do you plan on paying for your studies? <span className="required">*</span></label>
          <select className="adm-input" value={data.funding_source} onChange={e => set('funding_source', e.target.value)}>
            <option value="">Select funding source...</option>
            {FUNDING_SOURCES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Financial document upload */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Attach Affidavit of Support and Bank Statement <span className="required">*</span></label>

          {financialFiles.map((file, idx) => (
            <div className="adm-file-card" key={idx} style={{ marginBottom: '0.5rem' }}>
              <FileText size={18} className="file-icon" />
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div className="file-actions">
                <button onClick={() => setPreviewFile({ file, name: file.name })}><Eye size={14} /></button>
                <button className="delete-btn" onClick={() => removeFile(idx)}><X size={14} /></button>
              </div>
            </div>
          ))}

          <div className="adm-upload-zone" onClick={() => fileRef.current?.click()}>
            <Upload size={24} className="upload-icon" />
            <div className="upload-text">Drop files to attach, or <span>browse</span></div>
            <div className="upload-hint">Upload multiple files — pdf, jpg, png, docx — Max 25MB each</div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => { handleFile(e.target.files?.[0]); if (fileRef.current) fileRef.current.value = '' }} />
        </div>
      </div>

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
