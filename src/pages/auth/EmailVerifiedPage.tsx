import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import './AuthPages.css'

export default function EmailVerifiedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigate('/register/step1'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
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
        <div className="auth-card">
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
        </div>
      </div>
    </div>
  )
}
