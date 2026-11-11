import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, Shield, AlertTriangle } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import MfaChallenge, { PasskeySignInButton } from '../../components/auth/MfaChallenge'
import type { MfaChallenge as MfaChallengeData, Session } from '../../lib/supabase'
import '../auth/AuthPages.css'
import './AdminPages.css'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
type Form = z.infer<typeof schema>

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const { signIn, completeSignIn, refreshProfile } = useAuth()
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

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const finishAdminLogin = async (signInProfile: any) => {
    const { data: inviteResult } = await supabase.auth.acceptAdminInvite()
    if (inviteResult?.profile?.role) {
      const roleLabels: Record<string, string> = {
        admin: 'Admin', admission_manager: 'Admission Manager', program_manager: 'Program Manager',
        technical_team: 'Technical Team', contract_manager: 'Contract Manager',
      }
      toast.success(`Welcome! You've been assigned as ${roleLabels[inviteResult.profile.role] || inviteResult.profile.role}.`)
    }
    const updatedProfile = await refreshProfile()
    const finalProfile = updatedProfile || signInProfile
    if (!finalProfile) {
      toast.error('Unable to load your profile. Please check your connection and try again.')
      await supabase.auth.signOut()
      return
    }
    if (finalProfile.is_active === false) {
      toast.error('Your account has been suspended or blocked. Please contact the administrator.')
      await supabase.auth.signOut()
      return
    }
    switch (finalProfile.role) {
      case 'admission_manager': return navigate('/admin/admissions', { replace: true })
      case 'program_manager': return navigate('/admin/programs', { replace: true })
      case 'technical_team': return navigate('/admin/support', { replace: true })
      case 'contract_manager': return navigate('/admin/contracts', { replace: true })
      case 'admin': return navigate('/admin', { replace: true })
      default:
        toast.error('Access denied. This login is for admin staff users only.')
        await supabase.auth.signOut()
    }
  }

  const finishMfaLogin = async (session: Session) => {
    setLoading(true)
    try {
      await finishAdminLogin(await completeSignIn(session))
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: Form) => {
    setLoading(true)
    try {
      const { error, profile, mfa } = await signIn(values.email, values.password)
      if (error) {
        toast.error(t('auth.login.invalidCredentials'))
        return
      }
      if (mfa) {
        setMfaChallenge(mfa)
        return
      }
      await finishAdminLogin(profile)
    } catch (err) {
      console.error('[AdminLogin] Error during login flow:', err)
      toast.error('An error occurred during login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-center-layout admin-login">
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
        <div className="auth-card admin-card">
          {mfaChallenge ? (
            <MfaChallenge challenge={mfaChallenge} onSuccess={finishMfaLogin} onCancel={cancelMfa} />
          ) : (
          <>
          {/* Admin Badge */}
          <div className="admin-badge">
            <Shield size={12} />
            {t('auth.adminLogin.badge')}
          </div>

          <h2 className="auth-card-title">{t('auth.adminLogin.title')}</h2>
          <p className="auth-card-subtitle">{t('auth.adminLogin.subtitle')}</p>

          {/* Warning */}
          <div className="admin-warning">
            <AlertTriangle size={16} />
            <span>Unauthorized access attempts are logged and prosecuted.</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">{t('auth.login.emailLabel')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left">
                <span className="input-icon-left"><Mail size={16} /></span>
                <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="admin@admissiondesk.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.login.passwordLabel')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••" />
                <span className="input-icon-right">
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" />{t('common.loading')}</> : <><Shield size={16} /> Sign In as Admin</>}
            </button>

            <PasskeySignInButton admin onSuccess={finishMfaLogin} />

            <Link to="/login" className="btn btn-ghost btn-full" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', marginTop:'0.5rem' }}>
              ← Back to Agent Login
            </Link>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
