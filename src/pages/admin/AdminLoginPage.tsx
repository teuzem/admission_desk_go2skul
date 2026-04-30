import { useState } from 'react'
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
import '../auth/AuthPages.css'
import './AdminPages.css'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
type Form = z.infer<typeof schema>

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const { signIn, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Form) => {
    setLoading(true)

    try {
      // Step 1: Sign in — this also triggers self-healing profile creation
      const { error, profile: signInProfile } = await signIn(values.email, values.password)

      if (error) {
        setLoading(false)
        toast.error(t('auth.login.invalidCredentials'))
        return
      }

      // Step 2: Check for pending admin invite and auto-assign role
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        toast.error('Authentication failed. Please try again.')
        return
      }

      const { data: invite } = await supabase
        .from('admin_user_invites').select('id, role, status')
        .eq('email', values.email.toLowerCase()).eq('status', 'approved').maybeSingle()

      if (invite) {
        const isTech = invite.role === 'technical_team'
        const { error: updateErr } = await supabase.from('profiles').update({
          role: invite.role as any,
          is_active: true,
          is_technical_team: isTech,
        }).eq('id', authUser.id)

        if (!updateErr) {
          await supabase.from('admin_user_invites').update({
            status: 'registered'
          }).eq('id', invite.id)
          const roleLabels: Record<string, string> = {
            admin: 'Admin',
            admission_manager: 'Admission Manager',
            program_manager: 'Program Manager',
            technical_team: 'Technical Team',
            contract_manager: 'Contract Manager',
          }
          toast.success(`Welcome! You've been assigned as ${roleLabels[invite.role] || invite.role}.`)
        }
      }

      // Step 3: Refresh profile to pick up any invite-based role changes
      const updatedProfile = await refreshProfile()

      // Use whichever profile we have — refreshed takes priority, then signIn result
      const finalProfile = updatedProfile || signInProfile

      setLoading(false)

      if (!finalProfile) {
        // This should almost never happen now with self-healing + cache + synthetic fallback
        toast.error('Unable to load your profile. Please check your connection and try again.')
        await supabase.auth.signOut()
        return
      }

      if (finalProfile.is_active === false) {
        toast.error('Your account has been suspended or blocked. Please contact the administrator.')
        await supabase.auth.signOut()
        return
      }

      // Step 4: Redirect based on role
      switch (finalProfile.role) {
        case 'admission_manager':
          navigate('/admin/admissions', { replace: true })
          break
        case 'program_manager':
          navigate('/admin/programs', { replace: true })
          break
        case 'technical_team':
          navigate('/admin/support', { replace: true })
          break
        case 'contract_manager':
          navigate('/admin/contracts', { replace: true })
          break
        case 'admin':
          navigate('/admin', { replace: true })
          break
        default:
          toast.error('Access denied. This login is for admin staff users only.')
          await supabase.auth.signOut()
      }
    } catch (err) {
      setLoading(false)
      console.error('[AdminLogin] Error during login flow:', err)
      toast.error('An error occurred during login. Please try again.')
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

            <Link to="/login" className="btn btn-ghost btn-full" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', marginTop:'0.5rem' }}>
              ← Back to Agent Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
