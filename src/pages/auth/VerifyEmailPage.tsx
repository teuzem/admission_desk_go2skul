import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, RefreshCw } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import './AuthPages.css'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const email = location.state?.email || ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (!error) {
      setResent(true)
      toast.success(t('auth.verifyEmail.resendSuccess'))
    } else {
      toast.error(t('errors.generic'))
    }
  }

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
          <div className="auth-card-icon email">
            <Mail size={36} />
          </div>
          <h2 className="auth-card-title">{t('auth.verifyEmail.title')}</h2>
          <p className="auth-card-subtitle">{t('auth.verifyEmail.subtitle')}</p>
          {email && <div className="auth-email-badge">{email}</div>}
          <p className="auth-card-subtitle">{t('auth.verifyEmail.instructions')}</p>

          <div className="auth-card-actions">
            <button
              onClick={handleResend}
              className="btn btn-outline btn-full"
              disabled={resending || resent}
            >
              {resending ? (
                <><span className="spinner" />{t('common.loading')}</>
              ) : (
                <><RefreshCw size={16} />{resent ? t('auth.verifyEmail.resendSuccess') : t('auth.verifyEmail.resend')}</>
              )}
            </button>
            <Link to="/login" className="btn btn-ghost btn-full">{t('auth.verifyEmail.backToLogin')}</Link>
          </div>

          <p className="auth-card-note">{t('auth.verifyEmail.spam')}</p>
        </div>
      </div>
    </div>
  )
}
