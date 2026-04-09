import { useState } from 'react'
import {
  X, CheckCircle2, Shield, FileText, PenTool, Send, ChevronRight,
  Building, Mail, Phone, User, MapPin, ArrowLeft
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface University {
  id: string
  name: string
  country: string
  city?: string | null
  logo_url?: string | null
  description?: string | null
}

interface ActivatePartnerModalProps {
  university: University
  agentId: string
  agentName: string
  agentEmail: string
  agencyName: string
  onClose: () => void
  onSuccess: () => void
}

export default function ActivatePartnerModal({
  university,
  agentId,
  agentName,
  agentEmail,
  agencyName,
  onClose,
  onSuccess,
}: ActivatePartnerModalProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    contact_name: agentName,
    contact_email: agentEmail,
    contact_phone: '',
    company_name: agencyName,
    reason: '',
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [signature, setSignature] = useState('')

  const canGoStep2 = form.contact_name && form.contact_email && form.company_name
  const canGoStep3 = true // Just need to read the contract
  const isSignatureValid = signature.trim().toLowerCase() === agentName.toLowerCase()
  const canGoStep4 = agreedToTerms && isSignatureValid

  const handleSubmit = async () => {
    if (!canGoStep4 || submitting) return
    setSubmitting(true)

    try {
      const { error } = await supabase.from('partner_activation_requests').insert({
        agent_id: agentId,
        university_id: university.id,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        company_name: form.company_name,
        reason: form.reason || null,
        agreed_to_terms: true,
        signature: signature,
        signed_at: new Date().toISOString(),
        status: 'pending',
      })

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          toast.error('You have already submitted an activation request for this university.')
        } else {
          toast.error('Failed to submit activation request. Please try again.')
          console.error('[ActivatePartner] Insert error:', error)
        }
        setSubmitting(false)
        return
      }

      toast.success('Activation request submitted successfully! The admin will review your request shortly.', { duration: 5000 })
      onSuccess()
    } catch (err) {
      console.error('[ActivatePartner] Unexpected error:', err)
      toast.error('An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  return (
    <div className="activate-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="activate-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="activate-modal-header">
          <div className="activate-modal-title">
            <Shield size={20} style={{ color: '#3A4391' }} />
            Activate Partnership
          </div>
          <button className="activate-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="activate-modal-body">
          {/* Steps Indicator */}
          <div className="activate-steps-indicator">
            {[1, 2, 3, 4].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none', gap: '0.5rem' }}>
                <div className={`activate-step-dot ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                {i < 3 && <div className={`activate-step-line ${step > s ? 'completed' : ''}`} />}
              </div>
            ))}
          </div>

          {/* University Preview */}
          <div className="activate-uni-preview">
            <div className="activate-uni-logo-wrapper">
              {university.logo_url ? (
                <img src={university.logo_url} alt={university.name} style={{ maxWidth: '240px', maxHeight: '100px', objectFit: 'contain' }} />
              ) : (
                <Building size={32} style={{ color: '#3A4391' }} />
              )}
            </div>
            <div className="activate-uni-details">
              <h4>{university.name}</h4>
              <span><MapPin size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '3px' }} />{university.city ? `${university.city}, ` : ''}{university.country}</span>
            </div>
          </div>

          {/* Step 1: Contact Information */}
          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem' }}>
                <User size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#3A4391' }} />
                Contact Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="activate-form-group">
                  <label className="activate-form-label">Full Name *</label>
                  <input
                    className="activate-form-input"
                    value={form.contact_name}
                    onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="activate-form-group">
                  <label className="activate-form-label">Email *</label>
                  <input
                    className="activate-form-input"
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                    placeholder="your.email@company.com"
                  />
                </div>
                <div className="activate-form-group">
                  <label className="activate-form-label">Phone</label>
                  <input
                    className="activate-form-input"
                    value={form.contact_phone}
                    onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="activate-form-group">
                  <label className="activate-form-label">Company / Agency *</label>
                  <input
                    className="activate-form-input"
                    value={form.company_name}
                    onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                    placeholder="Your agency name"
                  />
                </div>
              </div>
              <div className="activate-form-group" style={{ marginTop: '0.5rem' }}>
                <label className="activate-form-label">Reason for Activation (Optional)</label>
                <textarea
                  className="activate-form-textarea"
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Tell us why you'd like to partner with this university..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Partnership Contract */}
          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem' }}>
                <FileText size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#3A4391' }} />
                Partnership Agreement
              </h3>
              <div className="activate-contract-scroll">
                <h3>ADMISSION DESK PARTNER RECRUITMENT AGENCY AGREEMENT</h3>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>Effective Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p>This Partnership Agreement ("Agreement") is entered into between Admission Desk (hereinafter referred to as "Admission Desk") and the Agent (hereinafter referred to as "Partner"), collectively referred to as the "Parties".</p>
                
                <h4>1. PURPOSE</h4>
                <p>The purpose of this Agreement is to establish the terms and conditions under which the Partner will recruit and refer prospective students to {university.name} through the Admission Desk platform.</p>
                
                <h4>2. PARTNER OBLIGATIONS</h4>
                <ol>
                  <li>The Partner agrees to act in good faith and in the best interest of prospective students.</li>
                  <li>The Partner shall provide accurate and truthful information to prospective students about programs, fees, admission requirements, and deadlines.</li>
                  <li>The Partner must comply with all applicable laws, regulations, and ethical standards in their jurisdiction.</li>
                  <li>The Partner shall maintain confidentiality of all student information and institutional data.</li>
                  <li>The Partner shall submit complete and accurate student applications with all required documentation.</li>
                </ol>

                <h4>3. ADMISSION DESK OBLIGATIONS</h4>
                <ol>
                  <li>Admission Desk shall provide the Partner with up-to-date program information, marketing materials, and admission guidelines.</li>
                  <li>Admission Desk shall process student applications in a timely manner and communicate admissions decisions promptly.</li>
                  <li>Admission Desk shall provide training and support to the Partner as needed.</li>
                  <li>Admission Desk shall pay agreed-upon commissions for successfully enrolled students in accordance with the commission structure.</li>
                </ol>

                <h4>4. COMMISSION STRUCTURE</h4>
                <p>Commission rates and payment terms will be communicated separately and are subject to the specific university partnership agreements. Commissions are typically paid after the student has enrolled and paid tuition fees.</p>

                <h4>5. TERM AND TERMINATION</h4>
                <p>This Agreement shall remain in effect for a period of one (1) year from the date of activation and shall automatically renew unless either party provides thirty (30) days written notice of termination.</p>

                <h4>6. DATA PROTECTION</h4>
                <p>Both parties agree to comply with all applicable data protection laws and regulations, including but not limited to GDPR and PIPEDA, when handling personal information of prospective students.</p>

                <h4>7. GOVERNING LAW</h4>
                <p>This Agreement shall be governed by and construed in accordance with internationally accepted business practices and the laws of the jurisdiction where Admission Desk operates.</p>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                <Shield size={14} style={{ color: '#10b981' }} />
                Please read the full agreement before proceeding to sign.
              </div>
            </div>
          )}

          {/* Step 3: Sign & Agree */}
          {step === 3 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem' }}>
                <PenTool size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#3A4391' }} />
                Digital Signature
              </h3>
              <div className="activate-signature-area">
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                  Type your full legal name (<strong style={{ color: '#1e293b' }}>{agentName}</strong>) below to serve as your digital signature acknowledging the Partnership Agreement.
                </p>
                <input
                  className={`activate-signature-input ${signature.trim().length > 0 && !isSignatureValid ? 'invalid' : ''}`}
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder="Type your full name here..."
                />
                {signature.trim().length > 0 && !isSignatureValid && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', textAlign: 'center' }}>
                    Signature must exactly match your real name: <strong>{agentName}</strong>.
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.5rem' }}>
                  Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="activate-checkbox-row">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                />
                <label htmlFor="agree-terms">
                  I have read and agree to the Partnership Agreement terms and conditions. I understand that this activation request will be reviewed by the Admission Desk admin team before becoming effective.
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem' }}>
                <Send size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#3A4391' }} />
                Review & Submit
              </h3>
              <div className="activate-confirm-summary">
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">University</span>
                  <span className="activate-confirm-value">{university.name}</span>
                </div>
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">Contact Name</span>
                  <span className="activate-confirm-value">{form.contact_name}</span>
                </div>
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">Email</span>
                  <span className="activate-confirm-value">{form.contact_email}</span>
                </div>
                {form.contact_phone && (
                  <div className="activate-confirm-row">
                    <span className="activate-confirm-label">Phone</span>
                    <span className="activate-confirm-value">{form.contact_phone}</span>
                  </div>
                )}
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">Company</span>
                  <span className="activate-confirm-value">{form.company_name}</span>
                </div>
                {form.reason && (
                  <div className="activate-confirm-row">
                    <span className="activate-confirm-label">Reason</span>
                    <span className="activate-confirm-value">{form.reason}</span>
                  </div>
                )}
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">Signature</span>
                  <span className="activate-confirm-value" style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.1rem' }}>{signature}</span>
                </div>
                <div className="activate-confirm-row">
                  <span className="activate-confirm-label">Agreement</span>
                  <span className="activate-confirm-value" style={{ color: '#10b981' }}>
                    <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Accepted
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  Your activation request will be reviewed by our admin team. You will be notified once your partnership with {university.name} has been approved.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="activate-modal-footer">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={onClose} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !canGoStep2) ||
                (step === 2 && !canGoStep3) ||
                (step === 3 && !canGoStep4)
              }
              className="btn btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                opacity: (step === 1 && !canGoStep2) || (step === 3 && !canGoStep4) ? 0.5 : 1
              }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              {submitting ? (
                <>Submitting...</>
              ) : (
                <><Send size={16} /> Submit Request</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
