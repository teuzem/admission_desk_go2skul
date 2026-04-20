import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import './AuthPages.css'

const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, { message: 'Mismatch', path: ['confirmPassword'] })

type Form = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password }: Form) => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(t('errors.generic'))
    } else {
      toast.success(t('auth.resetPassword.success'))
      setTimeout(() => navigate('/login'), 1500)
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
          <div className="auth-card-icon email"><Lock size={36} /></div>
          <h2 className="auth-card-title">{t('auth.resetPassword.title')}</h2>
          <p className="auth-card-subtitle">{t('auth.resetPassword.subtitle')}</p>
          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">{t('auth.resetPassword.newPassword')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input {...register('password')} type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••" />
                <span className="input-icon-right"><button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
              </div>
              {errors.password && <span className="form-error">{t('errors.passwordMin')}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.resetPassword.confirmPassword')} <span className="required">*</span></label>
              <div className="input-wrapper input-with-icon-left input-with-icon-right">
                <span className="input-icon-left"><Lock size={16} /></span>
                <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="••••••••" />
                <span className="input-icon-right"><button type="button" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
              </div>
              {errors.confirmPassword && <span className="form-error">{t('errors.passwordsMismatch')}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-full auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" />{t('common.loading')}</> : t('auth.resetPassword.setPassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
