import type { AdmissionFormData } from '../admissionTypes'
import { HOW_HEARD_ABOUT_PROGRAM } from '../admissionTypes'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  programs?: any[]
  selectedProgram: any
  selectedUniversity: any
  onNext: () => void
  onBack: () => void
}

export default function Step4ProgramInfo({ data, onChange, programs, selectedProgram, selectedUniversity, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })

  const isValid = data.program_id && data.university_id

  return (
    <div>
      <h1 className="admission-step-title">Program Information</h1>
      <p className="admission-step-subtitle">Details about the program you are applying to.</p>

      <div className="adm-form-grid">
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Select Program <span className="required">*</span></label>
          <select
            className="adm-input"
            value={data.program_id || ''}
            onChange={e => set('program_id', e.target.value)}
          >
            <option value="">Select a program...</option>
            {programs?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Auto-populated program details */}
        {selectedProgram && (
          <div className="adm-form-group adm-form-full" style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Program Name</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram?.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Level</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram?.level || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>University</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedUniversity?.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Campus / Country</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedUniversity?.country || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Duration</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram?.duration || `${selectedProgram?.duration_months || '—'} months`}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Tuition Fee</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram?.currency} {selectedProgram?.tuition_fee?.toLocaleString() || '—'}/yr</div>
              </div>
              {selectedProgram?.start_dates && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Start Dates</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram.start_dates.join(', ')}</div>
                </div>
              )}
              {selectedProgram?.category && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Category</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>{selectedProgram.category}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How did you hear — Dropdown select */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">How did you hear about this program?</label>
          <select
            className="adm-input"
            value={data.how_heard_about_program}
            onChange={e => set('how_heard_about_program', e.target.value)}
          >
            <option value="">Select an option...</option>
            {HOW_HEARD_ABOUT_PROGRAM.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Have you applied to this program before?</label>
          <div className="adm-radio-group">
            <label className="adm-radio-label"><input type="radio" name="applied_before" checked={data.applied_before === true} onChange={() => set('applied_before', true)} /> Yes</label>
            <label className="adm-radio-label"><input type="radio" name="applied_before" checked={data.applied_before === false} onChange={() => set('applied_before', false)} /> No</label>
          </div>
        </div>

        {data.applied_before && (
          <div className="adm-form-group adm-form-full">
            <label className="adm-label">Previous Application Year / ID</label>
            <input className="adm-input" value={data.previous_application_year} onChange={e => set('previous_application_year', e.target.value)} placeholder="e.g., 2024" />
          </div>
        )}
      </div>

      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}
