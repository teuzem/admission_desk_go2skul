import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, FileText, X, Eye, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { DocumentEntry } from '../admissionTypes'
import { ALL_DOCUMENT_TYPES, MANDATORY_DOCUMENT_TYPES, createEmptyDocument } from '../admissionTypes'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

interface Props {
  entries: DocumentEntry[]
  onEntriesChange: (entries: DocumentEntry[]) => void
  onNext: () => void
  onBack: () => void
}

export default function Step7Documents({ entries, onEntriesChange, onNext, onBack }: Props) {
  const [previewFile, setPreviewFile] = useState<{ file: File; name: string } | null>(null)

  const update = (idx: number, key: keyof DocumentEntry, val: any) => {
    const newEntries = [...entries]
    newEntries[idx] = { ...newEntries[idx], [key]: val }
    onEntriesChange(newEntries)
  }

  const addEntry = () => onEntriesChange([...entries, createEmptyDocument()])
  const removeEntry = (idx: number) => {
    const entry = entries[idx]
    if (entry.is_mandatory) return // Cannot remove mandatory
    onEntriesChange(entries.filter((_, i) => i !== idx))
  }

  const handleFile = (idx: number, file: File | undefined) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be under 25MB'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'png', 'jpg', 'jpeg', 'docx'].includes(ext || '')) { alert('Unsupported file type'); return }
    const newEntries = [...entries]
    newEntries[idx] = { ...newEntries[idx], file, file_name: file.name }
    onEntriesChange(newEntries)
  }

  // Check all mandatory types have files
  const mandatorySatisfied = MANDATORY_DOCUMENT_TYPES.every(type => {
    const entry = entries.find(e => e.document_type === type)
    return entry && (entry.file || entry.file_url)
  })

  // Check all non-empty rows have both type and file
  const allRowsValid = entries.every(e => {
    if (!e.document_type && !e.file) return true // empty row, ok
    return e.document_type && (e.file || e.file_url)
  })

  const isValid = mandatorySatisfied && allRowsValid

  // Missing mandatory types for warning
  const missingMandatory = MANDATORY_DOCUMENT_TYPES.filter(type => {
    const entry = entries.find(e => e.document_type === type)
    return !entry || (!entry.file && !entry.file_url)
  })

  // Uploaded docs (have file)
  const uploadedDocs = entries.filter(e => e.document_type && (e.file || e.file_url))

  // Get available types (filter out already used types)
  const usedTypes = entries.map(e => e.document_type).filter(Boolean)
  const availableTypes = ALL_DOCUMENT_TYPES.filter(t => !usedTypes.includes(t))

  return (
    <div>
      <h1 className="admission-step-title">Personal Documents</h1>
      <p className="admission-step-subtitle">Upload all required documents. Select the document type, then upload the corresponding file.</p>

      {/* Missing mandatory warning */}
      {missingMandatory.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: '#991b1b' }}>
            <strong>Required documents missing:</strong> {missingMandatory.join(', ')}
          </div>
        </div>
      )}

      {/* Already uploaded documents list */}
      {uploadedDocs.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
            Uploaded Documents ({uploadedDocs.length})
          </h4>
          <div className="adm-doc-uploaded-list">
            {entries.map((entry, idx) => {
              if (!entry.document_type || (!entry.file && !entry.file_url)) return null
              return (
                <div key={idx} className={`adm-file-card ${entry.is_mandatory ? '' : ''}`} style={{ position: 'relative' }}>
                  {entry.is_mandatory && (
                    <div style={{ position: 'absolute', top: -1, left: -1, bottom: -1, width: 3, background: '#3A4391', borderRadius: '10px 0 0 10px' }} />
                  )}
                  <FileText size={18} className="file-icon" />
                  <div className="file-info">
                    <div className="file-name">{entry.document_type}</div>
                    <div className="file-size">
                      {entry.file ? `${entry.file.name} — ${(entry.file.size / 1024 / 1024).toFixed(2)} MB` : entry.file_name || 'Uploaded'}
                    </div>
                  </div>
                  <div className="file-actions">
                    {entry.file && (
                      <button onClick={() => setPreviewFile({ file: entry.file!, name: entry.file!.name })} title="Preview">
                        <Eye size={14} />
                      </button>
                    )}
                    <button className="delete-btn" onClick={() => {
                      const newEntries = [...entries]
                      newEntries[idx] = { ...newEntries[idx], file: null, file_name: '', file_url: null }
                      // If not mandatory, remove the entry entirely
                      if (!entry.is_mandatory) {
                        onEntriesChange(entries.filter((_, i) => i !== idx))
                      } else {
                        onEntriesChange(newEntries)
                      }
                    }} title="Remove file">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active upload areas — show entries that don't have files yet */}
      {entries.map((entry, idx) => {
        // Skip already uploaded ones
        if (entry.file || entry.file_url) return null

        return (
          <div className={`adm-doc-row ${entry.is_mandatory ? 'mandatory' : ''}`} key={idx}>
            <div className="adm-doc-row-header">
              <label className="adm-label" style={{ margin: 0 }}>
                Document Type {entry.is_mandatory && <span className="required">*</span>}
              </label>
              {!entry.is_mandatory && (
                <button className="adm-entry-card-remove" onClick={() => removeEntry(idx)} style={{ padding: '4px 8px' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Document type selector */}
            <select
              className="adm-input"
              value={entry.document_type}
              onChange={e => update(idx, 'document_type', e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">Select document type...</option>
              {entry.is_mandatory ? (
                <option value={entry.document_type}>{entry.document_type}</option>
              ) : (
                availableTypes.map(t => <option key={t} value={t}>{t}</option>)
              )}
              {/* Also show currently selected type if it's set */}
              {!entry.is_mandatory && entry.document_type && !availableTypes.includes(entry.document_type) && (
                <option value={entry.document_type}>{entry.document_type}</option>
              )}
            </select>

            {/* Upload dropzone — below selector */}
            <div>
              <label className="adm-label">
                Upload File {entry.is_mandatory && <span className="required">*</span>}
              </label>
              <DocFileUpload
                file={null}
                fileName=""
                onSelect={f => handleFile(idx, f)}
                onPreview={() => {}}
              />
            </div>

            {/* Notes — below dropzone, optional */}
            <div>
              <label className="adm-label">Notes</label>
              <input
                className="adm-input"
                value={entry.notes}
                onChange={e => update(idx, 'notes', e.target.value)}
                placeholder="Additional notes about this document (optional)"
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )
      })}

      {/* Add another document button */}
      <button className="adm-add-entry-btn" onClick={addEntry} style={{ marginTop: '0.75rem' }}>
        <Plus size={18} /> Add another document
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

function DocFileUpload({ file, fileName, onSelect, onPreview }: { file: File | null; fileName: string; onSelect: (f: File) => void; onPreview: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <div className="adm-upload-zone" onClick={() => ref.current?.click()} style={{ padding: '1rem' }}>
        <Upload size={22} className="upload-icon" />
        <div className="upload-text">Drop files to attach, or <span>browse</span></div>
        <div className="upload-hint">pdf, jpg, png, docx — Max 25MB</div>
      </div>
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onSelect(e.target.files[0]) }} />
    </>
  )
}
