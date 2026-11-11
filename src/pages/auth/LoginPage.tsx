import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, GraduationCap, Clock, Shield, Globe } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import SEOHead from '../../components/seo/SEOHead'
import MfaChallenge, { PasskeySignInButton } from '../../components/auth/MfaChallenge'
import { supabase, type MfaChallenge as MfaChallengeData, type Session } from '../../lib/supabase'
import './AuthPages.css'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { signIn, completeSignIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallengeData | null>(null)

  useEffect(() => {
    let mounted = true
    void supabase.auth.getPendingMfaChallenge().then(({ data }) => {
      if (mounted && data) setMfaChallenge(data)
    })
    return () => { mounted = false }
  }, [])

  const cancelMfa = () => {
    supabase.auth.clearPendingMfaChallenge()
    setMfaChallenge(null)
  }

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })

  const redirectAfterLogin = (profile: any) => {
    if (profile?.role && profile.role !== 'agent' && profile.role !== 'editor') {
      switch (profile.role) {
        case 'admin': return navigate('/admin', { replace: true })
        case 'admission_manager': return navigate('/admin/admissions', { replace: true })
        case 'program_manager': return navigate('/admin/programs', { replace: true })
        case 'technical_team': return navigate('/admin/support', { replace: true })
        case 'contract_manager': return navigate('/admin/contracts', { replace: true })
        default: return navigate('/admin', { replace: true })
      }
    }
    navigate('/dashboard', { replace: true })
  }

  const finishLogin = async (session: Session) => {
    setLoading(true)
    try {
      redirectAfterLogin(await completeSignIn(session))
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: LoginForm) => {
    setLoading(true)
    const { error, profile, mfa } = await signIn(values.email, values.password)
    setLoading(false)
    if (error) return toast.error(t('auth.login.invalidCredentials'))
    if (mfa) {
      setMfaChallenge(mfa)
      return
    }
    redirectAfterLogin(profile)
  }

  const features = [
    {
      icon: <GraduationCap size={22} />,
      title: t('auth.login.features.universities.title'),
      desc: t('auth.login.features.universities.desc')
    },
    {
      icon: <Clock size={22} />,
      title: t('auth.login.features.realtime.title'),
      desc: t('auth.login.features.realtime.desc')
    },
    {
      icon: <Shield size={22} />,
      title: t('auth.login.features.secure.title'),
      desc: t('auth.login.features.secure.desc')
    }
  ]

  return (
    <>
      <SEOHead
        title={t('auth.login.title')}
        description={t('auth.login.subtitle')}
        canonicalUrl="https://admission-desk.netlify.app/login"
      />
      <div className="auth-split-layout">
      {/* Left Panel — Brand */}
      <div className="auth-brand-panel">
        <div className="auth-brand-overlay" />

        <div className="auth-brand-content">
          {/* Logo */}
          <div className="auth-logo">
            <img
              src="/admission-desk-logo.png"
              alt="Admission Desk — International University Admissions Portal"
              className="auth-logo-img"
              width="260"
              height="140"
            />
          </div>

          {/* Tagline */}
          <div className="auth-hero">
            <h1 className="auth-hero-title">{t('common.appName')}</h1>
            <p className="auth-hero-subtitle">{t('common.tagline')}</p>
          </div>

          {/* Features */}
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

        {/* Decorative blobs */}
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        {/* Top Bar */}
        <div className="auth-topbar">
          <LanguageToggle />
        </div>

        <div className="auth-form-container">
          {mfaChallenge ? (
            <MfaChallenge challenge={mfaChallenge} onSuccess={finishLogin} onCancel={cancelMfa} />
          ) : (
          <>
          <div className="auth-form-header">
            <h2 className="auth-form-title">{t('auth.login.title')}</h2>
            <p className="auth-form-subtitle">{t('auth.login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                {t('auth.login.emailLabel')} <span className="required">*</span>
              </label>
              <div className="input-wrapper input-with-icon-left">
                <span className="input-icon-left"><Mail size={16} /></span>
                <input
                  {...register('email')}
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder={t('auth.login.emailPlaceholder')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{t('errors.invalidEmail')}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">
                {t('auth.login.passwordLabel')} <span className="required">*</span>
              </label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <span className="input-icon-right">
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="auth-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" {...register('rememberMe')} className="auth-checkbox" />
                <span>{t('auth.login.rememberMe')}</span>
              </label>
              <Link to="/auth/forgot-password" className="auth-link-accent">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  {t('auth.login.signIn')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>

            <PasskeySignInButton onSuccess={finishLogin} />

            {/* Divider */}
            <div className="divider">{t('common.or')}</div>

            {/* Social Buttons */}
            <button type="button" className="auth-social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t('auth.login.continueWithGoogle')}
            </button>

            <button type="button" className="auth-social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              {t('auth.login.continueWithFacebook')}
            </button>

            {/* Signup link */}
            <p className="auth-switch-text">
              {t('auth.login.noAccount')}{' '}
              <Link to="/signup" className="auth-link-accent">{t('auth.login.createAccount')}</Link>
            </p>
          </form>
          </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
