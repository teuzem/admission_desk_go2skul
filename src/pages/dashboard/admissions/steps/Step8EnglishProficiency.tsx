import { useRef, useState } from 'react'
import { Upload, FileText, X, Eye } from 'lucide-react'
import type { AdmissionFormData } from '../admissionTypes'
import { ENGLISH_METHODS, ENGLISH_TESTS } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  testResultFile: File | null
  onTestResultFile: (f: File | null) => void
  onNext: () => void
  onBack: () => void
}

export default function Step8EnglishProficiency({ data, onChange, testResultFile, onTestResultFile, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const isTestBased = data.english_proficiency_method === ENGLISH_METHODS[0]

  const isValid = data.english_proficiency_method && (
    !isTestBased || (data.english_test_name && data.english_trf_number && data.english_test_date && data.english_overall_score)
  )

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    onTestResultFile(file)
  }

  return (
    <div>
      <h1 className="admission-step-title">English Proficiency</h1>
      <p className="admission-step-subtitle">Demonstrate your English language ability.</p>

      <div className="adm-form-grid">
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Select how you will demonstrate your level of English <span className="required">*</span></label>
          <select className="adm-input" value={data.english_proficiency_method} onChange={e => set('english_proficiency_method', e.target.value)}>
            <option value="">Select...</option>
            {ENGLISH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {isTestBased && (
          <>
            <div className="adm-form-group">
              <label className="adm-label">Test <span className="required">*</span></label>
              <select className="adm-input" value={data.english_test_name} onChange={e => set('english_test_name', e.target.value)}>
                <option value="">Select test...</option>
                {ENGLISH_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Test Report Form (TRF) Number <span className="required">*</span></label>
              <input className="adm-input" value={data.english_trf_number} onChange={e => set('english_trf_number', e.target.value)} placeholder="TRF identifier" />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Test Date <span className="required">*</span></label>
              <input className="adm-input" type="date" value={data.english_test_date} onChange={e => set('english_test_date', e.target.value)} />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Overall Score <span className="required">*</span></label>
              <input className="adm-input" value={data.english_overall_score} onChange={e => set('english_overall_score', e.target.value)} placeholder="e.g., 7.5" />
            </div>

            {/* Test results upload */}
            <div className="adm-form-group adm-form-full">
              <label className="adm-label">Attach a copy of your Test Results</label>
              {!testResultFile ? (
                <div className="adm-upload-zone" onClick={() => fileRef.current?.click()}>
                  <Upload size={24} className="upload-icon" />
                  <div className="upload-text">Drop files to attach, or <span>browse</span></div>
                  <div className="upload-hint">pdf, jpg, png, docx — Max 25MB</div>
                </div>
              ) : (
                <div className="adm-file-card">
                  <FileText size={18} className="file-icon" />
                  <div className="file-info">
                    <div className="file-name">{testResultFile.name}</div>
                    <div className="file-size">{(testResultFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="file-actions">
                    <button onClick={() => setPreviewOpen(true)}><Eye size={14} /></button>
                    <button className="delete-btn" onClick={() => onTestResultFile(null)}><X size={14} /></button>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
            </div>
          </>
        )}

        {data.english_proficiency_method && !isTestBased && (
          <div className="adm-form-group adm-form-full">
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem', fontSize: '0.88rem', color: '#166534' }}>
              You selected: <strong>{data.english_proficiency_method}</strong>. If additional evidence is required, please upload supporting documents in the Documents step.
            </div>
          </div>
        )}
      </div>

      {previewOpen && testResultFile && (
        <DocumentPreviewModal file={testResultFile} fileName={testResultFile.name} onClose={() => setPreviewOpen(false)} onDelete={() => { onTestResultFile(null); setPreviewOpen(false) }} />
      )}

      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}
