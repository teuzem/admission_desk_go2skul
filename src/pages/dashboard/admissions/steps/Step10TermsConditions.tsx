import { CheckCircle2 } from 'lucide-react'
import type { AdmissionFormData } from '../admissionTypes'

interface Props {
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  selectedUniversity?: any
  onNext: () => void
  onBack: () => void
}

export default function Step10TermsConditions({ data, onChange, selectedUniversity, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })

  const rawExpectedName = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ')
  const expectedSignature = rawExpectedName.trim().toLowerCase().replace(/\s+/g, ' ')
  
  const currentSignature = (data.applicant_signature || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const isSignatureValid = currentSignature === expectedSignature && currentSignature.length > 0

  const isValid = data.scholarship_release_auth && isSignatureValid && data.signature_date && data.terms_accepted

  return (
    <div>
      <h1 className="admission-step-title">Terms &amp; Conditions</h1>
      <p className="admission-step-subtitle">Review and accept the terms and conditions before submitting your application.</p>

      {/* Terms Content */}
      <div className="adm-terms-content">
        <h3>1. Acceptance of Terms</h3>
        <p>
          By accessing and using the Online Application Portal ("Portal") of {selectedUniversity?.name || 'the University'} ("University"), 
          you agree to comply with and be bound by these Terms &amp; Conditions. If you do not agree, please refrain from using this Portal.
        </p>

        <h3>2. Eligibility Criteria</h3>
        <p>
          Applicants must meet the minimum admission requirements as outlined on the official University website. 
          All information provided must be accurate and truthful. Misrepresentation may result in denial or revocation of admission.
        </p>

        <h3>3. Application Process</h3>
        <p>
          • Applicants are required to provide personal, academic, and other relevant information.<br />
          • Submission of an application does not guarantee admission to the University.<br />
          • Incomplete applications will not be processed.
        </p>

        <h3>4. Data Collection and Privacy</h3>
        <p>
          • Personal information collected through this Portal will be used solely for admissions purposes.<br />
          • The University complies with all applicable privacy laws, including regional consumer fraud acts and educational privacy rights.<br />
          • By submitting your application, you consent to the collection and processing of your personal data 
          as described in our Privacy Policy.
        </p>

        <h3>5. Release Information to Scholarship Organizations</h3>
        <p>
          The University may share academic, demographic, and financial information with alumni clubs 
          and other scholarship organizations for scholarship consideration. Applicants may choose to 
          authorize or decline this release below.
        </p>

        <h3>6. Amendments to Terms</h3>
        <p>
          The University reserves the right to modify these Terms &amp; Conditions at any time. 
          Continued use of the Portal after such modifications constitutes acceptance of the new terms.
        </p>

        <h3>7. Contact Information</h3>
        <p>
          For questions or concerns about these terms, please contact the Admissions Office at 
          admissions@avilauniversity.edu or call +1 (602) 555-0100.
        </p>
      </div>

      {/* Scholarship Release Authorization */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 className="adm-section-title">Release Information to Scholarship Organizations</h3>
        <div className="adm-radio-group" style={{ flexDirection: 'column', gap: '1rem' }}>
          <label className="adm-radio-label" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              type="radio"
              name="scholarship_release"
              value="authorize"
              checked={data.scholarship_release_auth === 'authorize'}
              onChange={() => set('scholarship_release_auth', 'authorize')}
              style={{ marginTop: '3px' }}
            />
            <span>
              <strong>I authorize</strong> the release of academic, demographic, and financial information to alumni clubs 
              and organizations for scholarship consideration.
            </span>
          </label>
          <label className="adm-radio-label" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              type="radio"
              name="scholarship_release"
              value="do_not_authorize"
              checked={data.scholarship_release_auth === 'do_not_authorize'}
              onChange={() => set('scholarship_release_auth', 'do_not_authorize')}
              style={{ marginTop: '3px' }}
            />
            <span>
              <strong>I do not authorize</strong> the release for additional scholarship consideration.
            </span>
          </label>
        </div>
      </div>

      {/* Accept Terms */}
      <div style={{ marginBottom: '2rem' }}>
        <label className="adm-checkbox-label" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
          <input
            type="checkbox"
            checked={data.terms_accepted}
            onChange={e => set('terms_accepted', e.target.checked)}
          />
          I have read and agree to the Terms &amp; Conditions <span className="required">*</span>
        </label>
      </div>

      {/* Signature Section */}
      <h3 className="adm-section-title">Applicant's Signature</h3>
      <div className="adm-form-grid">
        <div className="adm-form-group">
          <label className="adm-label">Applicant's Signature (Full Legal Name) <span className="required">*</span></label>
          <div className="adm-input-wrapper">
            <input
              className={`adm-input ${isSignatureValid ? 'valid' : ''}`}
              value={data.applicant_signature}
              onChange={e => set('applicant_signature', e.target.value)}
              placeholder={`Type exactly: ${rawExpectedName || "your full legal name"}`}
              style={{ fontFamily: "'Dancing Script', cursive, 'Inter', sans-serif", fontSize: '1.1rem', fontStyle: 'italic' }}
            />
            {isSignatureValid && <CheckCircle2 size={16} className="valid-check" />}
          </div>
          {data.applicant_signature && !isSignatureValid && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 500 }}>
              Signature must exactly match the student's full legal name: <strong>{rawExpectedName}</strong>
            </div>
          )}
        </div>

        <div className="adm-form-group">
          <label className="adm-label">Date <span className="required">*</span></label>
          <div className="adm-input-wrapper">
            <input
              className={`adm-input ${data.signature_date ? 'valid' : ''}`}
              type="date"
              value={data.signature_date}
              onChange={e => set('signature_date', e.target.value)}
            />
            {data.signature_date && <CheckCircle2 size={16} className="valid-check" />}
          </div>
        </div>
      </div>

      {/* Signature Preview */}
      {data.applicant_signature && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
          padding: '1.25rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <CheckCircle2 size={22} style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, marginBottom: '0.3rem' }}>
              Signed by
            </div>
            <div style={{
              fontFamily: "'Dancing Script', cursive, 'Inter', sans-serif",
              fontSize: '1.35rem', fontStyle: 'italic', color: '#1e293b', fontWeight: 700
            }}>
              {data.applicant_signature}
            </div>
            {data.signature_date && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                Date: {new Date(data.signature_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}
