import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import SEOHead from '../../components/seo/SEOHead'
import './AuthPages.css'

const schema = z.object({ email: z.string().email() })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async ({ email }: Form) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    setLoading(false)
    if (error) {
      toast.error(t('errors.generic'))
    } else {
      setSent(true)
    }
  }

  return (
    <>
      <SEOHead
        title={t('auth.forgotPassword.title')}
        description={t('auth.forgotPassword.subtitle')}
        canonicalUrl="https://admission-desk.netlify.app/auth/forgot-password"
      />
      <div className="auth-center-layout">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />

        <div className="auth-center-topbar">
          <Link to="/" className="auth-center-logo">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.15)"/>
              <path d="M14 24L22 16L30 24L22 32L14 24Z" fill="#00CCA0"/>
            </svg>
            <span className="auth-center-logo-text">Admission<span>Desk</span></span>
          </Link>
          <LanguageToggle />
        </div>

        <div className="auth-centered-card">
          <div className="auth-card" style={{ maxWidth: '440px' }}>
            {sent ? (
              <>
                <div className="auth-card-icon success"><CheckCircle2 size={48} /></div>
                <h2 className="auth-card-title">{t('auth.forgotPassword.success').split('!')[0]}!</h2>
                <p className="auth-card-subtitle">{t('auth.forgotPassword.success')}</p>
                <div className="auth-email-badge">{getValues('email')}</div>
                <div className="auth-card-actions">
                  <Link to="/login" className="btn btn-primary btn-full">{t('auth.forgotPassword.backToLogin')}</Link>
                </div>
              </>
            ) : (
              <>
                <div className="auth-card-icon email"><Mail size={36} /></div>
                <h2 className="auth-card-title">{t('auth.forgotPassword.title')}</h2>
                <p className="auth-card-subtitle">{t('auth.forgotPassword.subtitle')}</p>
                <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">{t('auth.forgotPassword.emailLabel')} <span className="required">*</span></label>
                    <div className="input-wrapper input-with-icon-left">
                      <span className="input-icon-left"><Mail size={16} /></span>
                      <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="agent@agency.com" />
                    </div>
                    {errors.email && <span className="form-error">{t('errors.invalidEmail')}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary btn-full auth-submit" disabled={loading}>
                    {loading ? <><span className="spinner" />{t('common.loading')}</> : t('auth.forgotPassword.sendLink')}
                  </button>
                  <Link to="/login" className="btn btn-ghost btn-full" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} />{t('auth.forgotPassword.backToLogin')}
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
