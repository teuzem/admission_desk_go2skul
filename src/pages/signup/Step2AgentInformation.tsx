import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignup } from '../../contexts/SignupContext'
import { useForm, Controller } from 'react-hook-form'
import './SignupWizard.css'

const JOB_ROLES = ['Business Owner', 'Contract Signer', 'Admissions', 'Finance', 'IT', 'Legal', 'Marketing', 'Sales', 'Executive Leadership', 'Operations', 'Administrator', 'Partnerships Manager']
const RECRUITMENT_REGIONS = ['Africa', 'ANZ', 'Brazil', 'Caribbean', 'China', 'CIS', 'East Asia', 'Europe', 'India', 'LATAM', 'Middle East', 'North Africa', 'North America', 'Pakistan', 'Philippines', 'SEA', 'South Asia', 'Turkey', 'Vietnam', 'Bangladesh', 'Sri Lanka']
const COUNTRIES = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Chad', "Côte d'Ivoire", 'China', 'Colombia', 'Comoros', 'Congo', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'DR Congo', 'Denmark', 'Djibouti', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea', 'Haiti', 'Honduras', 'Hungary', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Mongolia', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe']
const ACCOUNT_TYPES = ['Direct Agent', 'Counsellor', 'Sub-Agent', 'IELTS Centre', 'Education Consultant', 'Overseas Education Agency']

interface FormData {
  firstName: string
  lastName: string
  emailId: string
  mobileNumber: string
  registeredCompanyName: string
  tradingName: string
  companyEmail: string
  officeAddress: string
  officeCountry: string
  officeCity: string
  postalCode: string
  accountType: string
  website: string
  designation: string
  representsHQ: string
}

export default function Step2AgentInformation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, updateData } = useSignup()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      firstName: data.firstName,
      lastName: data.lastName,
      emailId: data.emailId,
      mobileNumber: data.mobileNumber,
      registeredCompanyName: data.registeredCompanyName,
      tradingName: data.tradingName,
      companyEmail: data.companyEmail,
      officeAddress: data.officeAddress,
      officeCountry: data.officeCountry,
      officeCity: data.officeCity,
      postalCode: data.postalCode,
      accountType: data.accountType,
      website: data.website,
      designation: data.designation,
      representsHQ: data.representsHQ ? 'yes' : 'no',
    }
  })

  const toggleJobRole = (role: string) => {
    const current = data.jobRoles
    updateData({ jobRoles: current.includes(role) ? current.filter(r => r !== role) : [...current, role] })
  }

  const toggleRegion = (region: string) => {
    const current = data.recruitmentRegions
    updateData({ recruitmentRegions: current.includes(region) ? current.filter(r => r !== region) : [...current, region] })
  }

  const onSubmit = (values: FormData) => {
    updateData({
      ...values,
      representsHQ: values.representsHQ === 'yes'
    })
    navigate('/register/step3')
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div className="wizard-card-title">{t('signup_wizard.step2.subtitle')}</div>
        <div className="wizard-step-counter">{t('signup_wizard.step2.step')}</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="wizard-card-body">
          {/* Personal Info */}
          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.firstName')} <span className="required">*</span></label>
              <input {...register('firstName', { required: true })} className={`form-input ${errors.firstName ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.lastName')} <span className="required">*</span></label>
              <input {...register('lastName', { required: true })} className={`form-input ${errors.lastName ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.emailId')} <span className="required">*</span></label>
              <input {...register('emailId', { required: true })} type="email" className={`form-input ${errors.emailId ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.mobileNumber')} <span className="required">*</span></label>
              <input {...register('mobileNumber', { required: true })} type="tel" className={`form-input ${errors.mobileNumber ? 'error' : ''}`} />
            </div>
          </div>

          {/* Company Info */}
          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.registeredCompanyName')} <span className="required">*</span></label>
              <input {...register('registeredCompanyName', { required: true })} className={`form-input ${errors.registeredCompanyName ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.tradingName')} <span className="required">*</span></label>
              <input {...register('tradingName', { required: true })} className={`form-input ${errors.tradingName ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.companyEmail')} <span className="required">*</span></label>
              <input {...register('companyEmail', { required: true })} type="email" className={`form-input ${errors.companyEmail ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.officeAddress')} <span className="required">*</span></label>
              <input {...register('officeAddress', { required: true })} className={`form-input ${errors.officeAddress ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.officeCountry')} <span className="required">*</span></label>
              <select {...register('officeCountry', { required: true })} className={`form-input ${errors.officeCountry ? 'error' : ''}`}>
                <option value="">Select an option</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.officeCity')} <span className="required">*</span></label>
              <input {...register('officeCity', { required: true })} className={`form-input ${errors.officeCity ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.postalCode')} <span className="required">*</span></label>
              <input {...register('postalCode', { required: true })} className={`form-input ${errors.postalCode ? 'error' : ''}`} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.accountType')} <span className="required">*</span></label>
              <select {...register('accountType', { required: true })} className={`form-input ${errors.accountType ? 'error' : ''}`}>
                <option value="">Select an option</option>
                {ACCOUNT_TYPES.map(at => <option key={at} value={at}>{at}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.website')} <span className="required">*</span></label>
              <input {...register('website')} type="url" className="form-input" placeholder="https://yourcompany.com" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step2.fields.role')} <span className="required">*</span></label>
              <input {...register('designation', { required: true })} className={`form-input ${errors.designation ? 'error' : ''}`} />
            </div>
          </div>

          {/* Job Roles */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{t('signup_wizard.step2.fields.jobRole')}</label>
            <div className="job-roles-grid">
              {JOB_ROLES.map(role => (
                <label key={role} className={`role-chip ${data.jobRoles.includes(role) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={data.jobRoles.includes(role)}
                    onChange={() => toggleJobRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>

          {/* Recruitment Regions */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{t('signup_wizard.step2.fields.recruitmentRegion')}</label>
            <div className="regions-grid">
              {RECRUITMENT_REGIONS.map(region => (
                <label key={region} className={`role-chip ${data.recruitmentRegions.includes(region) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={data.recruitmentRegions.includes(region)}
                    onChange={() => toggleRegion(region)}
                  />
                  {region}
                </label>
              ))}
            </div>
          </div>

          {/* Represents HQ */}
          <div className="form-group">
            <label className="form-label">{t('signup_wizard.step2.fields.representsHQ')}</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-ui)' }}>
                <input type="radio" {...register('representsHQ')} value="yes" defaultChecked={data.representsHQ} />
                {t('common.yes')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-ui)' }}>
                <input type="radio" {...register('representsHQ')} value="no" defaultChecked={!data.representsHQ} />
                {t('common.no')}
              </label>
            </div>
          </div>
        </div>

        <div className="wizard-card-footer">
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/register/step1')}>
            ← {t('common.back')}
          </button>
          <button type="submit" className="btn btn-primary btn-lg">
            {t('common.next')} →
          </button>
        </div>
      </form>
    </div>
  )
}
