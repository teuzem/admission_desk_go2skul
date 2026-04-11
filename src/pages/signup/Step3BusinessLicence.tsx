import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignup } from '../../contexts/SignupContext'
import { useForm } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, X } from 'lucide-react'
import './SignupWizard.css'

interface FormData {
  companyRegistrationNumber: string
  incorporationDate: string
  expiryDate: string
  isAddressSameAsOffice: string
  registeredAddress: string
  registeredCountry: string
  registeredCity: string
  registeredPostalCode: string
}

export default function Step3BusinessLicence() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, updateData } = useSignup()
  const [doesNotExpire, setDoesNotExpire] = useState(data.doesNotExpire)
  const [file, setFile] = useState<File | null>(data.businessLicenceFile || null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      companyRegistrationNumber: data.companyRegistrationNumber,
      incorporationDate: data.incorporationDate,
      expiryDate: data.expiryDate,
      isAddressSameAsOffice: data.isAddressSameAsOffice ? 'yes' : 'no',
      registeredAddress: data.registeredAddress,
      registeredCountry: data.registeredCountry,
      registeredCity: data.registeredCity,
      registeredPostalCode: data.registeredPostalCode,
    }
  })

  const isAddressSame = watch('isAddressSameAsOffice') === 'yes'

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false
  })

  const onSubmit = (values: FormData) => {
    // We ideally want a file to be uploaded
    updateData({
      ...values,
      isAddressSameAsOffice: values.isAddressSameAsOffice === 'yes',
      doesNotExpire,
      businessLicenceFile: file || undefined
    })
    navigate('/register/step4')
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div className="wizard-card-title">{t('signup_wizard.step3.subtitle')}</div>
        <div className="wizard-step-counter">{t('signup_wizard.step3.step')}</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="wizard-card-body">
          {/* File Upload Zone */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">{t('signup_wizard.step3.fields.uploadLicence')} <span className="required">({t('common.optional')})</span></label>
            
            {!file ? (
              <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <div className="upload-icon">
                  <UploadCloud size={24} />
                </div>
                <div className="upload-text">
                  <span className="upload-link">{t('signup_wizard.step3.upload.dragText').split(' ')[0]}</span>{' '}
                  {t('signup_wizard.step3.upload.dragText').substring(t('signup_wizard.step3.upload.dragText').indexOf(' ') + 1)}
                </div>
                <div className="upload-meta">{t('signup_wizard.step3.upload.types')} • {t('signup_wizard.step3.upload.maxSize')}</div>
              </div>
            ) : (
              <div className="upload-zone has-file" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="upload-icon" style={{ margin: 0, width: '40px', height: '40px', background: 'white' }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{file.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)} className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--color-error)' }}>
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step3.fields.registrationNumber')} <span className="required">*</span></label>
              <input {...register('companyRegistrationNumber', { required: true })} className={`form-input ${errors.companyRegistrationNumber ? 'error' : ''}`} />
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step3.fields.incorporationDate')} <span className="required">*</span></label>
              <input {...register('incorporationDate', { required: true })} type="date" className={`form-input ${errors.incorporationDate ? 'error' : ''}`} />
            </div>

            <div className="form-group">
              <label className="form-label">{t('signup_wizard.step3.fields.expiryDate')}</label>
              <input 
                {...register('expiryDate', { required: !doesNotExpire })} 
                type="date" 
                className={`form-input ${errors.expiryDate && !doesNotExpire ? 'error' : ''}`}
                disabled={doesNotExpire}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                <input 
                  type="checkbox" 
                  checked={doesNotExpire} 
                  onChange={(e) => setDoesNotExpire(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                {t('signup_wizard.step3.fields.doesNotExpire')}
              </label>
            </div>
          </div>

          {/* Address Question */}
          <div className="form-group form-grid-full" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--color-bg-page)', borderRadius: 'var(--radius-lg)' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem' }}>{t('signup_wizard.step3.fields.sameAddress')}</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-ui)' }}>
                <input type="radio" {...register('isAddressSameAsOffice')} value="yes" />
                {t('common.yes')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'var(--font-ui)' }}>
                <input type="radio" {...register('isAddressSameAsOffice')} value="no" />
                {t('common.no')}
              </label>
            </div>
          </div>

          {/* Conditional Address Fields */}
          {!isAddressSame && (
            <div className="form-grid">
              <div className="form-group form-grid-full">
                <label className="form-label">{t('signup_wizard.step3.fields.registeredAddress')} <span className="required">*</span></label>
                <input {...register('registeredAddress', { required: !isAddressSame })} className={`form-input ${errors.registeredAddress ? 'error' : ''}`} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('signup_wizard.step3.fields.registeredCountry')} <span className="required">*</span></label>
                <input {...register('registeredCountry', { required: !isAddressSame })} className={`form-input ${errors.registeredCountry ? 'error' : ''}`} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('signup_wizard.step3.fields.registeredCity')} <span className="required">*</span></label>
                <input {...register('registeredCity', { required: !isAddressSame })} className={`form-input ${errors.registeredCity ? 'error' : ''}`} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('signup_wizard.step3.fields.registeredPostalCode')} <span className="required">*</span></label>
                <input {...register('registeredPostalCode', { required: !isAddressSame })} className={`form-input ${errors.registeredPostalCode ? 'error' : ''}`} />
              </div>
            </div>
          )}
        </div>

        <div className="wizard-card-footer">
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/register/step2')}>
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
