import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import MfaChallenge from '../../components/auth/MfaChallenge'
import { supabase, type MfaChallenge as MfaChallengeData } from '../../lib/supabase'
import './AuthPages.css'

export default function EmailVerifiedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [challenge, setChallenge] = useState<MfaChallengeData | null>(null)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    void Promise.all([supabase.auth.getSession(), supabase.auth.getPendingMfaChallenge()]).then(([session, mfa]) => {
      if (!mounted) return
      if (mfa.error) setError(mfa.error.message)
      else if (mfa.data) setChallenge(mfa.data)
      else if (session.data.session) setVerified(true)
      else setError('This verification link is invalid or expired. Please sign in or request a new link.')
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!verified) return
    const timer = setTimeout(() => navigate('/register/step1'), 5000)
    return () => clearTimeout(timer)
  }, [navigate, verified])

  return (
    <div className="auth-center-layout">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-center-topbar">
        <Link to="/" className="auth-center-logo">
          <img
            src="/admission-desk-logo.png"
            alt="Admission Desk — International University Admissions Portal"
            className="auth-center-logo-img"
            width="200"
            height="100"
          />
        </Link>
        <LanguageToggle />
      </div>

      <div className="auth-centered-card">
        <div className="auth-card">
          {challenge ? (
            <MfaChallenge challenge={challenge} firstStep="email" onSuccess={() => navigate('/dashboard', { replace: true })} onCancel={() => {
              supabase.auth.clearPendingMfaChallenge()
              navigate('/login', { replace: true })
            }} />
          ) : error ? (
            <>
              <p role="alert">{error}</p>
              <Link to="/login" className="btn btn-primary btn-full">{t('auth.login.signIn')}</Link>
            </>
          ) : !verified ? (
            <p role="status">{t('common.loading')}</p>
          ) : (
          <>
          <div className="auth-card-icon success">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="auth-card-title">{t('auth.emailVerified.title')}</h2>
          <p className="auth-card-subtitle">{t('auth.emailVerified.subtitle')}</p>
          <p className="auth-card-subtitle">{t('auth.emailVerified.cta')}</p>
          <div className="auth-card-actions">
            <Link to="/register/step1" className="btn btn-primary btn-full btn-lg">
              {t('auth.emailVerified.continue')}
            </Link>
          </div>
          <p className="auth-card-note" style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
            Redirecting automatically in 5 seconds...
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
