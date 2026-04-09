import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignup } from '../../contexts/SignupContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { FileSignature, CheckCircle2 } from 'lucide-react'
import { uploadAgentKycDoc } from '../../lib/storageHelpers'
import './SignupWizard.css'

export default function Step4TermsAndConditions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, updateData, resetSignup } = useSignup()
  const { user } = useAuth()

  const [accepted, setAccepted] = useState(data.acceptedTerms)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!accepted) {
      toast.error(t('errors.generic')) // Optional: specific error for T&C
      return
    }

    setLoading(true)
    updateData({ acceptedTerms: true })

    try {
      // In a real scenario with Supabase:
      // 1. Upload business licence file to Storage
      let licenceUrl = ''
      if (data.businessLicenceFile && user) {
        try {
          licenceUrl = await uploadAgentKycDoc(user.id, data.businessLicenceFile)
        } catch (uploadErr) {
          console.error('KYC upload error:', uploadErr)
          // Continue without blocking registration
        }
      }

      // 2. Update profiles table
      if (user) {
        // @ts-ignore - Bypass Supabase strict inference issue
        const { error: profileError } = await supabase.from('profiles').update({
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'agent' as any,
          is_super_agent: true,
          agency_name: data.registeredCompanyName,
          phone: data.mobileNumber,
          country: data.officeCountry,
          city: data.officeCity,
          kyc_status: 'pending' as any,
        }).eq('id', user.id)

        if (profileError) throw profileError

        const { error: kycError } = await supabase.from('agent_kyc').upsert([{
          agent_id: user.id,
          business_licence_url: licenceUrl,
          company_registration_number: data.companyRegistrationNumber,
          incorporation_date: data.incorporationDate,
          expiry_date: data.doesNotExpire ? null : data.expiryDate,
          does_not_expire: data.doesNotExpire,
          registered_address: data.isAddressSameAsOffice ? data.officeAddress : data.registeredAddress,
          registered_city: data.isAddressSameAsOffice ? data.officeCity : data.registeredCity,
          registered_country: data.isAddressSameAsOffice ? data.officeCountry : data.registeredCountry,
          registered_postal_code: data.isAddressSameAsOffice ? data.postalCode : data.registeredPostalCode,
          is_same_address: data.isAddressSameAsOffice,
          job_roles: data.jobRoles,
          recruitment_regions: data.recruitmentRegions,
          represents_hq: data.representsHQ,
          status: 'pending'
        }] as any)

        if (kycError) throw kycError

        // 4. Insert partner selections
        if (data.selectedUniversities.length > 0) {
          const selections = data.selectedUniversities.map(uniId => ({
            agent_id: user.id,
            university_id: uniId
          }))
          const { error: selectionError } = await supabase.from('agent_partner_selections').insert(selections as any)
          if (selectionError) console.error('Selection Error:', selectionError) // Non-blocking
        }
      }

      setSuccess(true)
      resetSignup()

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)

    } catch (error: any) {
      console.error('Registration Error:', error)
      toast.error(error.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="wizard-card wizard-success">
        <div className="wizard-success-icon">
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
          {t('signup_wizard.success.title')}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: '2rem' }}>
          {t('signup_wizard.success.subtitle')}
        </p>
        <div className="spinner" style={{ borderTopColor: 'var(--color-primary)' }} />
        <p style={{ marginTop: '1rem', fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
          {t('signup_wizard.step4.redirecting')}
        </p>
      </div>
    )
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div className="wizard-card-title">{t('signup_wizard.step4.subtitle')}</div>
        <div className="wizard-step-counter">{t('signup_wizard.step4.step')}</div>
      </div>

      <div className="wizard-card-body">
        <div className="wizard-instructions" style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', padding: 0 }}>
          <div className="wizard-instruction-icon">
            <FileSignature size={22} />
          </div>
          <div>
            <div className="wizard-instruction-title">{t('signup_wizard.step4.instructions.title')}</div>
            <div className="wizard-instruction-text">
              {t('signup_wizard.step4.instructions.text')}
            </div>
          </div>
        </div>

        {/* Scrollable Terms Content */}
        <div className="terms-scroll">
          <h3>1. {t('signup_wizard.step4.terms.section1.title')}</h3>
          <p>{t('signup_wizard.step4.terms.section1.content')}</p>

          <h3>2. {t('signup_wizard.step4.terms.section2.title')}</h3>
          <p>{t('signup_wizard.step4.terms.section2.content')}</p>

          <h3>3. {t('signup_wizard.step4.terms.section3.title')}</h3>
          <p>{t('signup_wizard.step4.terms.section3.content')}</p>

          <h3>4. {t('signup_wizard.step4.terms.section4.title')}</h3>
          <p>{t('signup_wizard.step4.terms.section4.content')}</p>
        </div>

        {/* Acceptance Checkbox */}
        <label className="terms-accept">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <div>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {t('signup_wizard.step4.accept')}
            </span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {t('signup_wizard.step4.acceptDescription')}
            </span>
          </div>
        </label>
      </div>

      <div className="wizard-card-footer">
        <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/register/step3')} disabled={loading}>
          ← {t('common.back')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={!accepted || loading}
        >
          {loading ? (
            <><span className="spinner" /> {t('common.loading')}</>
          ) : (
            t('common.submit')
          )}
        </button>
      </div>
    </div>
  )
}
