import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
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
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Form) => {
    setLoading(true)
    const { error } = await signIn(values.email, values.password)
    setLoading(false)

    if (error) {
      toast.error(t('auth.login.invalidCredentials'))
    } else {
      const { supabase } = await import('../../lib/supabase')
      
      // Check for an approved invite and auto-assign role if needed
      const { data: invite } = await supabase
        .from('admin_user_invites').select('id, role, status')
        .eq('email', values.email).eq('status', 'approved').maybeSingle()
      
      if (invite) {
        // Update the user's profile with the invited role
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          await supabase.from('profiles').update({
            role: invite.role as any, is_active: true
          }).eq('id', authUser.id)
          // Mark invite as registered
          await supabase.from('admin_user_invites').update({
            status: 'registered'
          }).eq('id', invite.id)
          const roleLabel = invite.role === 'admin' ? 'Admin' : (invite.role === 'program_manager' ? 'Program Manager' : 'Admission Manager')
          toast.success(`Welcome! You've been assigned as ${roleLabel}.`)
        }
      }
      
      // Check user role and redirect accordingly
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('email', values.email).single()
      
      if (profileData?.role === 'admission_manager') {
        navigate('/admin/admissions')
      } else if (profileData?.role === 'program_manager') {
        navigate('/admin/programs')
      } else if (profileData?.role === 'admin') {
        navigate('/admin')
      } else {
        // Not an admin user - show error
        toast.error('Access denied. This login is for admin staff users only.')
        await supabase.auth.signOut()
      }
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
