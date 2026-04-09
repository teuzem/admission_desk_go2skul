import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, GraduationCap, Clock, Shield } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import SEOHead from '../../components/seo/SEOHead'
import './AuthPages.css'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  })

  const onSubmit = async (values: SignupForm) => {
    setLoading(true)
    const { error } = await signUp(values.email, values.password)
    setLoading(false)

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        toast.error("Email rate limit exceeded! To fix this in development, please go to your Supabase Dashboard -> Authentication -> Providers -> Email, and disable 'Confirm email'.", { duration: 8000 })
      } else {
        toast.error(error.message || t('errors.generic'))
      }
    } else {
      navigate('/auth/verify-email', { state: { email: values.email } })
    }
  }

  const features = [
    { icon: <GraduationCap size={22} />, title: t('auth.login.features.universities.title'), desc: t('auth.login.features.universities.desc') },
    { icon: <Clock size={22} />, title: t('auth.login.features.realtime.title'), desc: t('auth.login.features.realtime.desc') },
    { icon: <Shield size={22} />, title: t('auth.login.features.secure.title'), desc: t('auth.login.features.secure.desc') }
  ]

  return (
    <>
      <SEOHead
        title={t('auth.signup.title')}
        description={t('auth.signup.subtitle')}
        canonicalUrl="https://admission-desk.netlify.app/signup"
      />
      <div className="auth-split-layout">
      {/* Left Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-overlay" />
        <div className="auth-brand-content">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.15)"/>
                <path d="M14 24L22 16L30 24L22 32L14 24Z" fill="#00CCA0"/>
                <path d="M22 16L30 24L38 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="auth-logo-name">Admission<span>Desk</span></span>
          </div>
          <div className="auth-hero">
            <h1 className="auth-hero-title">{t('auth.signup.title')}</h1>
            <p className="auth-hero-subtitle">{t('auth.signup.subtitle')}</p>
          </div>
          <div className="auth-features">
            {features.map((feat, i) => (
              <div key={i} className="auth-feature-card">
                <div className="auth-feature-icon">{feat.icon}</div>
                <div>
                  <div className="auth-feature-title">{feat.title}</div>
                  <div className="auth-feature-desc">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-topbar">
          <LanguageToggle />
        </div>

        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">{t('auth.signup.title')}</h2>
            <p className="auth-form-subtitle">{t('auth.signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Email */}
            <div className="form-group">
              <label className="form-label">{t('auth.signup.emailLabel')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left">
                <span className="input-icon-left"><Mail size={16} /></span>
                <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder={t('auth.signup.emailPlaceholder')} autoComplete="email" />
              </div>
              {errors.email && <span className="form-error">{t('errors.invalidEmail')}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">{t('auth.signup.passwordLabel')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className={`form-input ${errors.password ? 'error' : ''}`} placeholder="••••••••" autoComplete="new-password" />
                <span className="input-icon-right">
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </div>
              {errors.password && <span className="form-error">{errors.password.message || t('errors.passwordMin')}</span>}
              <span className="form-hint">{t('auth.signup.passwordHint')}</span>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">{t('auth.signup.confirmPasswordLabel')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="••••••••" autoComplete="new-password" />
                <span className="input-icon-right">
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </div>
              {errors.confirmPassword && <span className="form-error">{t('errors.passwordsMismatch')}</span>}
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-primary btn-full btn-lg auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" />{t('common.loading')}</> : t('auth.signup.createAccount')}
            </button>

            <p className="auth-switch-text">
              {t('auth.signup.alreadyAccount')}{' '}
              <Link to="/login" className="auth-link-accent">{t('auth.signup.signIn')}</Link>
            </p>
          </form>
        </div>
      </div>
     </div>
    </>
  )
}
