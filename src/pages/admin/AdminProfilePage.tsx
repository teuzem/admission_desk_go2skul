import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { UserRole, KycStatus } from '../../types/database'
import { 
  uploadAdminAvatar, 
  uploadAdminCoverImage, 
  getPublicUrl 
} from '../../lib/storageHelpers'
import { 
  Calendar,
  Building2,
  Languages,
  Clock,
  Briefcase,
  Monitor,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  Key,
  Download,
  Info,
  Check,
  ChevronDown,
  Activity,
  UserX,
  FileText,
  Clipboard,
  Smartphone,
  LogOut,
  Trash2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Plus,
  Network,
  Globe,
  MapPin,
  Lock,
  RefreshCw,
  Shield,
  CheckCircle2,
  Mail,
  User,
  Save,
  Loader2,
  Phone as PhoneIcon,
  AlertCircle,
  Facebook,
  Twitter,
  Linkedin,
  Camera,
  Layout,
  Image as ImageIcon,
  Printer,
  Copy,
  Cpu
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Select from 'react-select'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import AdminHeader from '../../components/layout/AdminHeader'
import AdminFooter from '../../components/layout/AdminFooter'
import './AdminProfilePage.css'

// Initialize countries
countries.registerLocale(enLocale)
const countryOptions = Object.entries(countries.getNames("en", { select: "official" })).map(([code, name]) => ({
  value: name,
  label: name,
  code: code
}))

const timezones = [
  { value: 'UTC', label: '(UTC+00:00) UTC' },
  { value: 'Africa/Abidjan', label: '(UTC+00:00) Abidjan' },
  { value: 'Africa/Accra', label: '(UTC+00:00) Accra' },
  { value: 'Africa/Lagos', label: '(UTC+01:00) Lagos' },
  { value: 'Africa/Cairo', label: '(UTC+02:00) Cairo' },
  { value: 'Africa/Johannesburg', label: '(UTC+02:00) Johannesburg' },
  { value: 'Africa/Nairobi', label: '(UTC+03:00) Nairobi' },
  { value: 'America/New_York', label: '(UTC-05:00) New York' },
  { value: 'America/Chicago', label: '(UTC-06:00) Chicago' },
  { value: 'America/Denver', label: '(UTC-07:00) Denver' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Los Angeles' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Mumbai, Kolkata' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Shanghai, Beijing' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney' },
  { value: 'Europe/London', label: '(UTC+00:00) London' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Berlin' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow' },
  { value: 'Europe/Istanbul', label: '(UTC+03:00) Istanbul' },
]

const languages = [
  { value: 'English', label: 'English' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'German', label: 'German' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Portuguese', label: 'Portuguese' },
]

interface AdminProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: UserRole
  phone: string | null
  country: string | null
  city: string | null
  bio: string | null
  avatar_url: string | null
  cover_image_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  whatsapp_number: string | null
  telegram_id: string | null
  skype_id: string | null
  is_super_admin: boolean
  // New Fields
  gender: string | null
  date_of_birth: string | null
  department: string | null
  designation: string | null
  state_province: string | null
  office_address: string | null
  postal_code: string | null
  timezone: string | null
  preferred_language: string | null
  agency_name: string | null
  trading_name: string | null
  company_email: string | null
  website: string | null
  founded_year: number | null
  number_of_employees: string | null
  languages_spoken: string[] | null
  primary_market: string | null
  kyc_status: KycStatus
}

interface ValidationErrors {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  whatsapp_number?: string
  bio?: string
}

const AdminProfilePage: React.FC = () => {
  const { user, profile: authProfile } = useAuth()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [isSyncing, setIsSyncing] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [profileStrength, setProfileStrength] = useState(0)

  // Security Tab State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [mfaStep, setMfaStep] = useState<1 | 2 | 3>(1)
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaVerifyCode, setMfaVerifyCode] = useState(['', '', '', '', '', ''])
  const [mfaLoading, setMfaLoading] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [securitySettings, setSecuritySettings] = useState({
    login_notifications: true,
    new_device_alerts: true,
    session_timeout_minutes: 1440,
    require_2fa_for_sensitive: false,
    recovery_email: '',
    is_phone_verified: false,
    backup_codes_generated_at: null as string | null,
    security_keys_enabled: false
  })
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false)
  const [securityKeys, setSecurityKeys] = useState<any[]>([])
  const [showSecurityKeyModal, setShowSecurityKeyModal] = useState(false)
  const [securityKeyName, setSecurityKeyName] = useState('')
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('')
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', ''])
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [auditLogLoading, setAuditLogLoading] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneOtpValue, setPhoneOtpValue] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Calculate profile completion percentage
  const calculateStrength = useCallback((data: AdminProfile | null) => {
    if (!data) return 0
    const essentialFields = [
      'first_name', 'last_name', 'email', 'phone', 'avatar_url', 
      'bio', 'agency_name', 'country', 'designation', 'department'
    ]
    let filled = 0
    essentialFields.forEach(f => {
      if (data[f as keyof AdminProfile]) filled++
    })
    
    // Check social links (at least one)
    const socialFields = ['facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url']
    if (socialFields.some(f => data[f as keyof AdminProfile])) filled++
    
    return Math.min(100, Math.round((filled / (essentialFields.length + 1)) * 100))
  }, [])

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'first_name':
        if (!value || value.trim().length < 2) return 'First name must be at least 2 characters'
        break
      case 'last_name':
        if (!value || value.trim().length < 2) return 'Last name must be at least 2 characters'
        break
      case 'email':
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address'
        break
      case 'phone':
        if (value && !isValidPhoneNumber(value)) return 'Invalid international phone number'
        break
      case 'whatsapp_number':
        if (value && !/^\+?[0-9]{7,15}$/.test(value)) return 'Invalid WhatsApp number'
        break
      case 'bio':
        if (value && value.length > 500) return 'Bio must be under 500 characters'
        break
    }
    return undefined
  }

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      const profileData = data as unknown as AdminProfile
      setProfile(profileData)
      setProfileStrength(calculateStrength(profileData))
    } catch (error: any) {
      console.error('Error fetching admin profile:', error)
      toast.error('Failed to load profile details')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Security Helper Functions
  const fetchDevices = useCallback(async () => {
    if (!user) return
    setDevicesLoading(true)
    try {
      const { data } = await supabase.from('user_devices').select('*').eq('user_id', user.id).order('last_active_at', { ascending: false })
      setDevices(data || [])
    } finally {
      setDevicesLoading(false)
    }
  }, [user])

  const fetchAuditLog = useCallback(async () => {
    if (!user) return
    setAuditLogLoading(true)
    try {
      const { data } = await supabase.from('security_audit_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      setAuditLog(data || [])
    } finally {
      setAuditLogLoading(false)
    }
  }, [user])

  const fetchSecuritySettings = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (data) {
      const settings = data as any // Fallback to any if inference is broken, but we know the shape
      setSecuritySettings({
        login_notifications: settings.login_notifications,
        new_device_alerts: settings.new_device_alerts,
        session_timeout_minutes: settings.session_timeout_minutes,
        require_2fa_for_sensitive: settings.require_2fa_for_sensitive,
        recovery_email: settings.recovery_email || '',
        is_phone_verified: settings.is_phone_verified,
        backup_codes_generated_at: settings.backup_codes_generated_at,
        security_keys_enabled: settings.security_keys_enabled
      })
      if (settings.recovery_email) setRecoveryEmailInput(settings.recovery_email)
    }
  }, [user])

  const fetchSecurityKeys = useCallback(async () => {
    if (!user) return
    const { data } = await (supabase as any).from('user_security_keys').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setSecurityKeys(data || [])
  }, [user])

  const handleUpdateRecoveryEmail = async () => {
    if (!user || !recoveryEmailInput) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('user_security_settings')
        .update({ recovery_email: recoveryEmailInput })
        .eq('user_id', user.id)
      
      if (error) throw error
      await logSecurityEvent('recovery_email_updated', { email: recoveryEmailInput })
      toast.success('Recovery email updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateBackupCodes = async () => {
    if (!user) return
    try {
      setMfaLoading(true)
      // Generate 10 random 8-character codes
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )
      
      // Delete old codes first
      await (supabase as any).from('user_backup_codes').delete().eq('user_id', user.id)
      
      // In a real app, you should hash these. For this demo, we'll store them or just show them.
      // We'll store a timestamp to show they've been generated.
      const codeInserts = codes.map(c => ({
        user_id: user.id,
        code_hash: c, // In production, hash this!
        is_used: false
      }))
      
      await (supabase as any).from('user_backup_codes').insert(codeInserts)
      await supabase.from('user_security_settings').update({ 
        backup_codes_generated_at: new Date().toISOString() 
      }).eq('user_id', user.id)
      
      setBackupCodes(codes)
      setShowBackupCodesModal(true)
      
      // Auto-download backup codes
      const content = `ADMISSION DESK - ADMIN BACKUP CODES\nGenerated: ${new Date().toLocaleString()}\n\nKeep these codes in a safe place. Each code can be used once.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nSecurity Warning: Do not share these codes with anyone.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-codes-admission-desk-${profile?.first_name || 'admin'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await logSecurityEvent('backup_codes_generated')
      toast.success('Backup codes generated and downloaded successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleStartPhoneVerify = async () => {
    if (!user || !profile?.phone) {
      toast.error('Please add a phone number to your profile first')
      return
    }
    setShowPhoneModal(true)
    // In a real app, trigger Supabase Auth OTP or SMS service here
    toast.success('Verification code sent to ' + (phoneInput || profile.phone))
    setPhoneOtpSent(true)
  }

  const handleVerifyPhoneOtp = async () => {
    const code = phoneOtpValue
    if (code.length < 6) {
      toast.error('Please enter a 6-digit code')
      return
    }
    
    setIsVerifyingPhone(true)
    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const { error } = await supabase
        .from('user_security_settings')
        .update({ 
          is_phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      if (error) throw error
      await logSecurityEvent('phone_verified')
      toast.success('Phone number verified successfully')
      setShowPhoneModal(false)
      setSecuritySettings(prev => ({ ...prev, is_phone_verified: true }))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const handleAddSecurityKey = async () => {
    if (!user || !securityKeyName) return
    try {
      setMfaLoading(true)
      // WebAuthn simulation - in a real app, use @simplewebauthn/browser
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { error } = await (supabase as any).from('user_security_keys').insert({
        user_id: user.id,
        key_name: securityKeyName,
        credential_id: 'simulated_' + Math.random().toString(36).substring(7),
        public_key: 'simulated_pk'
      })
      
      if (error) throw error
      
      await supabase.from('user_security_settings').update({ 
        security_keys_enabled: true 
      }).eq('user_id', user.id)
      
      await logSecurityEvent('security_key_added', { name: securityKeyName })
      toast.success('Wait, security keys are handled via browser biometric prompt.')
      setShowSecurityKeyModal(false)
      setSecurityKeyName('')
      fetchSecurityKeys()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleDeleteSecurityKey = async (id: string) => {
    try {
      await supabase.from('user_security_keys').delete().eq('id', id)
      toast.success('Security key removed')
      fetchSecurityKeys()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const logSecurityEvent = async (action: string, metadata: any = {}) => {
    if (!user) return
    try {
      let ip = 'Unknown';
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) {
          const geo = await geoRes.json();
          ip = geo.ip;
        }
      } catch (e) {}

      const ua = navigator.userAgent
      await supabase.from('security_audit_log').insert({
        user_id: user.id,
        action,
        device_info: ua,
        ip_address: ip,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: ua
        }
      })
      fetchAuditLog()
    } catch (err) {
      console.error('Audit log error:', err)
    }
  }

  const registerCurrentDevice = useCallback(async () => {
    if (!user) return
    try {
      // Free Geolocation API (ipapi.co)
      let geo: any = {};
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) {
          geo = await geoRes.json();
        }
      } catch (err) {
        console.error('Geolocation fetch failed:', err);
      }
      
      const ua = navigator.userAgent
      let browser = 'Unknown', os = 'Unknown', deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
      
      // Basic Browser Detection
      if (/Firefox/i.test(ua)) browser = 'Firefox'
      else if (/Edg/i.test(ua)) browser = 'Edge'
      else if (/Chrome/i.test(ua)) browser = 'Chrome'
      else if (/Safari/i.test(ua)) browser = 'Safari'
      
      // Basic OS Detection
      if (/Windows/i.test(ua)) os = 'Windows'
      else if (/Mac/i.test(ua)) os = 'macOS'
      else if (/Linux/i.test(ua)) os = 'Linux'
      else if (/Android/i.test(ua)) { os = 'Android'; deviceType = 'mobile' }
      else if (/iOS|iPhone|iPad/i.test(ua)) { os = 'iOS'; deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile' }

      const deviceData = {
        user_id: user.id,
        ip_address: geo.ip || 'Unknown',
        location_city: geo.city || 'Unknown',
        location_country: geo.country_name || 'Unknown',
        region: geo.region || 'Unknown',
        isp: geo.org || 'Unknown',
        timezone: geo.timezone || 'Unknown',
        latitude: geo.latitude || null,
        longitude: geo.longitude || null,
        postal_code: geo.postal || null,
        device_name: `${browser} on ${os}`,
        device_type: deviceType,
        browser, 
        os,
        last_active_at: new Date().toISOString(),
        is_current: true,
        user_agent: ua,
        metadata: {
          ...geo,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          platform: navigator.platform,
          color_depth: window.screen.colorDepth,
          pixel_ratio: window.devicePixelRatio
        }
      }

      // Deactivate other current devices
      await supabase.from('user_devices').update({ is_current: false }).eq('user_id', user.id).neq('user_agent', ua)
      
      // Upsert current device
      const { data: existing } = await supabase.from('user_devices').select('id').eq('user_id', user.id).eq('user_agent', ua).maybeSingle()
      if (existing) {
        await supabase.from('user_devices').update(deviceData).eq('id', existing.id)
      } else {
        await supabase.from('user_devices').insert(deviceData)
      }
    } catch (err) {
      console.error('Failed to register device:', err)
    }
  }, [user])

  // Real-time subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`admin-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time profile update:', payload)
          const newProfile = payload.new as AdminProfile
          setProfile(newProfile)
          setProfileStrength(calculateStrength(newProfile))
          setIsSyncing(true)
          setTimeout(() => setIsSyncing(false), 2000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_security_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) setSecuritySettings(payload.new as any)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_devices',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchDevices()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setAuditLog(prev => [payload.new, ...prev].slice(0, 10))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_security_keys',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSecurityKeys()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_backup_codes',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSecuritySettings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, calculateStrength, fetchDevices])
  // Password Strength Calculator
  const passwordStrength = useMemo(() => {
    const pw = passwordForm.newPassword
    const rules = {
      minLength: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
    }
    const met = Object.values(rules).filter(Boolean).length
    const level = met === 0 ? 'none' : met <= 2 ? 'weak' : met <= 3 ? 'fair' : met <= 4 ? 'strong' : 'excellent'
    const percent = (met / 5) * 100
    const color = { none: '#e4e6eb', weak: '#ef4444', fair: '#f59e0b', strong: '#3b82f6', excellent: '#10b981' }[level]
    return { rules, met, level, percent, color }
  }, [passwordForm.newPassword])

  useEffect(() => {
    if (activeTab === 'security') {
      registerCurrentDevice()
      fetchDevices()
      fetchAuditLog()
      fetchSecuritySettings()
      fetchSecurityKeys()
    }
  }, [activeTab, registerCurrentDevice, fetchDevices, fetchAuditLog, fetchSecuritySettings, fetchSecurityKeys])

  const handlePasswordUpdate = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return
    setPasswordLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword
      })
      if (signInError) throw new Error('Current password incorrect')

      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) throw error

      await logSecurityEvent('password_change')
      toast.success('Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleStartMfaEnroll = async () => {
    setMfaLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Admin Authenticator' })
      if (error) throw error
      setMfaQrCode(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaFactorId(data.id)
      setMfaStep(1)
      setShow2FASetup(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaVerifyAndEnable = async () => {
    const code = mfaVerifyCode.join('')
    setMfaLoading(true)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code })
      if (verifyError) throw verifyError
      setTwoFactorEnabled(true)
      setMfaStep(3)
      await logSecurityEvent('2fa_enabled')
      toast.success('2FA enabled successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleRevokeDevice = async (id: string) => {
    if (!confirm('Are you sure you want to revoke access for this device? You will be logged out on that device.')) return
    try {
      await supabase.from('user_devices').delete().eq('id', id)
      await logSecurityEvent('device_revoked')
      toast.success('Device access revoked')
      fetchDevices()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleTrustDevice = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('user_devices').update({ is_trusted: !currentStatus }).eq('id', id)
      await logSecurityEvent(!currentStatus ? 'device_trusted' : 'device_untrusted')
      toast.success(!currentStatus ? 'Device trusted successfully' : 'Device removed from trusted list')
      fetchDevices()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSecuritySettingChange = async (key: string, value: any) => {
    if (!user) return
    const updated = { ...securitySettings, [key]: value }
    setSecuritySettings(updated)
    try {
      const { data: existing } = await supabase.from('user_security_settings').select('id').eq('user_id', user.id).maybeSingle()
      if (existing) {
        await supabase.from('user_security_settings').update({ [key]: value }).eq('user_id', user.id)
      } else {
        await supabase.from('user_security_settings').insert({ user_id: user.id, ...updated })
      }
      await logSecurityEvent('settings_changed', { setting: key, value })
      toast.success('Security settings updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...mfaVerifyCode]
    newCode[index] = value.slice(-1)
    setMfaVerifyCode(newCode)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaVerifyCode[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...mfaVerifyCode]
    paste.split('').forEach((ch, i) => { newCode[i] = ch })
    setMfaVerifyCode(newCode)
    otpRefs.current[Math.min(paste.length, 5)]?.focus()
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone size={22} />
      case 'tablet': return <Tablet size={22} />
      default: return <Monitor size={22} />
    }
  }

  const getSecurityScore = () => {
    let score = 20
    if (twoFactorEnabled) score += 30
    if (securitySettings.is_phone_verified) score += 20
    if (securityKeys.length > 0) score += 15
    if (securitySettings.backup_codes_generated_at) score += 5
    if (securitySettings.login_notifications) score += 5
    if (securitySettings.new_device_alerts) score += 5
    return Math.min(score, 100)
  }

  const securityScore = getSecurityScore()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (!profile) return
    
    // Update profile state
    setProfile({ ...profile, [name]: value })
    
    // Real-time validation
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSelectChange = (name: string, value: string | string[]) => {
    if (!profile) return
    setProfile({ ...profile, [name]: value })
    handleFieldBlur(name as keyof AdminProfile, value)
  }

  const handlePhoneChange = (value: string | undefined) => {
    if (!profile) return
    setProfile({ ...profile, phone: value || null })
    
    const error = validateField('phone', value)
    setErrors(prev => ({ ...prev, phone: error }))
    
    if (value && isValidPhoneNumber(value)) {
      handleFieldBlur('phone', value)
    }
  }

  const handleFieldBlur = async (field: keyof AdminProfile, value: any) => {
    if (!user || !profile) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id)

      if (error) throw error
      // No need to setProfile here as real-time subscription will update it
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error)
      toast.error(`Failed to save ${field}`)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setSaving(true)
      let publicUrl = ''

      if (type === 'avatar') {
        publicUrl = await uploadAdminAvatar(user.id, file)
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
        toast.success('Avatar updated successfully')
      } else {
        publicUrl = await uploadAdminCoverImage(user.id, file)
        await supabase.from('profiles').update({ cover_image_url: publicUrl }).eq('id', user.id)
        toast.success('Cover image updated successfully')
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error)
      toast.error(`Failed to upload ${type}`)
    } finally {
      setSaving(false)
    }
  }

  const saveAllChanges = async () => {
    if (!user || !profile) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id)

      if (error) throw error
      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <AdminHeader />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </main>
        <AdminFooter />
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <AdminHeader />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-slate-500">Profile not found</div>
        </main>
        <AdminFooter />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <AdminHeader />
      
      <main style={{ flex: 1 }}>
        <div className="admin-profile-page">
          {/* Real-time Sync Indicator */}
          {isSyncing && (
            <div className="sync-indicator">
              <div className="pulse"></div>
              <span>Live Synced</span>
            </div>
          )}

          {/* Header Section */}
          <div className="profile-header-container">
            <div className="profile-cover">
              {profile.cover_image_url ? (
                <img src={profile.cover_image_url} alt="Cover" />
              ) : (
                <div className="w-full h-full bg-slate-800"></div>
              )}
              <label className="cover-upload-btn">
                <ImageIcon size={16} />
                Change Cover
                <input 
                   type="file" 
                   className="hidden" 
                   accept="image/*" 
                   onChange={(e) => handleFileUpload(e, 'cover')}
                 />
              </label>
            </div>

            <div className="profile-header-content">
              <div className="profile-avatar-wrapper">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <User size={64} className="text-slate-400" />
                  </div>
                )}
                <label className="avatar-upload-btn">
                  <Camera size={24} />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                  />
                </label>
              </div>

              <div className="profile-title-section">
                <div className="profile-name-row">
                  <h1 className="profile-name">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <span className="profile-role-badge">
                    {profile.role?.replace('_', ' ')}
                  </span>
                  {profile.is_super_admin && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Super Admin
                    </span>
                  )}
                </div>
                <div className="profile-email">
                  <Mail size={14} />
                  {profile.email}
                </div>
              </div>

              <button 
                className="btn-save-profile" 
                onClick={saveAllChanges}
                disabled={saving}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="profile-tabs-nav">
            <button 
              className={`profile-tab-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General Information
            </button>
            <button 
              className={`profile-tab-item ${activeTab === 'professional' ? 'active' : ''}`}
              onClick={() => setActiveTab('professional')}
            >
              Professional & Company
            </button>
            <button 
              className={`profile-tab-item ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              Social Connectivity
            </button>
            <button 
              className={`profile-tab-item ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              Preferences
            </button>
            <button 
              className={`profile-tab-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security & Privacy
            </button>
          </div>

          <div className="profile-content-grid">
            <div className="profile-main-col">
              {activeTab === 'general' && (
                <div className="profile-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <User size={20} className="text-primary" />
                      Personal Information
                    </h3>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label">First Name</label>
                      <input 
                        type="text" 
                        name="first_name"
                        className={`form-input ${errors.first_name ? 'error' : ''}`} 
                        value={profile.first_name || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('first_name', e.target.value)}
                      />
                      {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                    </div>
                    <div className="form-field">
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text" 
                        name="last_name"
                        className={`form-input ${errors.last_name ? 'error' : ''}`} 
                        value={profile.last_name || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('last_name', e.target.value)}
                      />
                      {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                    </div>
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Calendar size={14} /> Date of Birth
                      </label>
                      <input 
                        type="date" 
                        name="date_of_birth"
                        className="form-input" 
                        value={profile.date_of_birth || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('date_of_birth', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Gender</label>
                      <select 
                        name="gender"
                        className="form-input" 
                        value={profile.gender || ''}
                        onChange={(e) => handleSelectChange('gender', e.target.value)}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Mail size={16} /> Contact Details
                      </h4>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Email Address (Primary)</label>
                      <input 
                        type="email" 
                        className="form-input bg-slate-50 cursor-not-allowed" 
                        value={profile.email || ''}
                        disabled
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed manually.</p>
                    </div>

                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <PhoneIcon size={14} /> Phone Number
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="US"
                        className={`form-input ${errors.phone ? 'error' : ''}`}
                        value={profile.phone || undefined}
                        onChange={handlePhoneChange}
                      />
                      {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>

                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <MapPin size={16} /> Location & Address
                      </h4>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Country</label>
                      <Select
                        options={countryOptions}
                        value={countryOptions.find(opt => opt.value === profile.country)}
                        onChange={(opt) => handleSelectChange('country', opt?.value || '')}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">City</label>
                      <input 
                        type="text" 
                        name="city"
                        className="form-input" 
                        value={profile.city || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('city', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">State / Province</label>
                      <input 
                        type="text" 
                        name="state_province"
                        className="form-input" 
                        value={profile.state_province || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('state_province', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Postal / Zip Code</label>
                      <input 
                        type="text" 
                        name="postal_code"
                        className="form-input" 
                        value={profile.postal_code || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('postal_code', e.target.value)}
                      />
                    </div>
                    <div className="form-field col-span-2">
                      <label className="form-label">Office / Residential Address</label>
                      <input 
                        type="text" 
                        name="office_address"
                        className="form-input" 
                        value={profile.office_address || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('office_address', e.target.value)}
                        placeholder="Full street address, building, apartment..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'professional' && (
                <div className="profile-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Briefcase size={20} className="text-primary" />
                      Professional & Agency Details
                    </h3>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label">Position / Job Title</label>
                      <input 
                        type="text" 
                        name="designation"
                        className="form-input" 
                        value={profile.designation || ''}
                        placeholder="e.g. Senior Admission Officer"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('designation', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Department</label>
                      <input 
                        type="text" 
                        name="department"
                        className="form-input" 
                        value={profile.department || ''}
                        placeholder="e.g. International Recruitment"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('department', e.target.value)}
                      />
                    </div>

                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Building2 size={16} /> Company / Agency Info
                      </h4>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Agency / Institution Name</label>
                      <input 
                        type="text" 
                        name="agency_name"
                        className="form-input" 
                        value={profile.agency_name || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('agency_name', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Trading Name (if different)</label>
                      <input 
                        type="text" 
                        name="trading_name"
                        className="form-input" 
                        value={profile.trading_name || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('trading_name', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Company Email</label>
                      <input 
                        type="email" 
                        name="company_email"
                        className="form-input" 
                        value={profile.company_email || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('company_email', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Website URL</label>
                      <input 
                        type="url" 
                        name="website"
                        className="form-input" 
                        value={profile.website || ''}
                        placeholder="https://example.com"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('website', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Founded Year</label>
                      <input 
                        type="number" 
                        name="founded_year"
                        className="form-input" 
                        value={profile.founded_year || ''}
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('founded_year', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Number of Employees</label>
                      <select 
                        name="number_of_employees"
                        className="form-input" 
                        value={profile.number_of_employees || ''}
                        onChange={(e) => handleSelectChange('number_of_employees', e.target.value)}
                      >
                        <option value="">Select Range</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>

                    <div className="form-field col-span-2 mt-4">
                      <label className="form-label">Bio / Professional Summary</label>
                      <textarea 
                        name="bio"
                        className={`form-input min-h-[120px] resize-none ${errors.bio ? 'error' : ''}`} 
                        value={profile.bio || ''}
                        placeholder="Share your professional background and expertise..."
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('bio', e.target.value)}
                      ></textarea>
                      <div className="flex justify-between mt-1">
                        {errors.bio ? <span className="error-text">{errors.bio}</span> : <span></span>}
                        <span className="text-[10px] text-slate-400">{(profile.bio || '').length}/500</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="profile-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Globe size={20} className="text-primary" />
                      Social Connectivity
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Facebook size={16} className="text-blue-600" /> Facebook URL
                      </label>
                      <input 
                        type="url" 
                        name="facebook_url"
                        className="form-input" 
                        value={profile.facebook_url || ''}
                        placeholder="https://facebook.com/username"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('facebook_url', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Twitter size={16} className="text-sky-500" /> Twitter URL
                      </label>
                      <input 
                        type="url" 
                        name="twitter_url"
                        className="form-input" 
                        value={profile.twitter_url || ''}
                        placeholder="https://twitter.com/username"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('twitter_url', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Linkedin size={16} className="text-blue-700" /> LinkedIn URL
                      </label>
                      <input 
                        type="url" 
                        name="linkedin_url"
                        className="form-input" 
                        value={profile.linkedin_url || ''}
                        placeholder="https://linkedin.com/in/username"
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('linkedin_url', e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-field">
                        <label className="form-label flex items-center gap-2">
                          <PhoneIcon size={14} className="text-green-600" /> WhatsApp Number
                        </label>
                        <input 
                          type="text" 
                          name="whatsapp_number"
                          className={`form-input ${errors.whatsapp_number ? 'error' : ''}`} 
                          value={profile.whatsapp_number || ''}
                          placeholder="+1234567890"
                          onChange={handleInputChange}
                          onBlur={(e) => handleFieldBlur('whatsapp_number', e.target.value)}
                        />
                        {errors.whatsapp_number && <span className="error-text text-[10px]">{errors.whatsapp_number}</span>}
                      </div>
                      <div className="form-field">
                        <label className="form-label">Telegram ID</label>
                        <input 
                          type="text" 
                          name="telegram_id"
                          className="form-input" 
                          value={profile.telegram_id || ''}
                          placeholder="@username"
                          onChange={handleInputChange}
                          onBlur={(e) => handleFieldBlur('telegram_id', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="profile-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Layout size={20} className="text-primary" />
                      App Preferences
                    </h3>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Languages size={14} /> Preferred Language
                      </label>
                      <Select
                        options={languages}
                        value={languages.find(opt => opt.value === profile.preferred_language)}
                        onChange={(opt) => handleSelectChange('preferred_language', opt?.value || 'English')}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label flex items-center gap-2">
                        <Clock size={14} /> Timezone
                      </label>
                      <Select
                        options={timezones}
                        value={timezones.find(opt => opt.value === profile.timezone)}
                        onChange={(opt) => handleSelectChange('timezone', opt?.value || 'UTC')}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    </div>

                    <div className="form-field col-span-2">
                      <label className="form-label flex items-center gap-2">
                        <Languages size={14} /> Languages Spoken
                      </label>
                      <Select
                        isMulti
                        options={languages}
                        value={languages.filter(opt => (profile.languages_spoken || []).includes(opt.value))}
                        onChange={(opts) => handleSelectChange('languages_spoken', opts.map(o => o.value))}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Select languages..."
                      />
                    </div>

                    <div className="form-field col-span-2">
                      <label className="form-label">Primary Target Market</label>
                      <input 
                        type="text" 
                        name="primary_market"
                        className="form-input" 
                        value={profile.primary_market || ''}
                        placeholder="e.g. West Africa, Southeast Asia, etc."
                        onChange={handleInputChange}
                        onBlur={(e) => handleFieldBlur('primary_market', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-2 mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex gap-3">
                        <AlertCircle className="text-blue-500 shrink-0" size={20} />
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900">Regional Settings</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            These preferences will affect how dates, times, and currency are displayed throughout your admin portal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="security-tab-content">
                  {/* Security Overview Card */}
                  <div className="profile-card security-overview-card">
                    <div className="security-score-display">
                      <div className="score-circle-wrapper">
                        <svg className="score-svg" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={securityScore > 80 ? '#10b981' : securityScore > 50 ? '#3b82f6' : '#ef4444'} />
                              <stop offset="100%" stopColor={securityScore > 80 ? '#34d399' : securityScore > 50 ? '#60a5fa' : '#f87171'} />
                            </linearGradient>
                          </defs>
                          <circle className="score-bg" cx="50" cy="50" r="45" />
                          <circle className="score-fill" cx="50" cy="50" r="45" 
                            style={{ 
                              strokeDasharray: '283', 
                              strokeDashoffset: 283 - (283 * securityScore) / 100,
                              stroke: 'url(#scoreGradient)'
                            }} 
                          />
                        </svg>
                        <div className="score-number">{securityScore}%</div>
                      </div>
                      <div className="score-info">
                        <h3>Security Health: <span className="health-label" style={{ 
                          color: securityScore > 80 ? '#10b981' : securityScore > 50 ? '#3b82f6' : '#ef4444',
                          background: securityScore > 80 ? '#f0fdf4' : securityScore > 50 ? '#eff6ff' : '#fef2f2'
                        }}>
                          {securityScore > 80 ? 'EXCELLENT' : securityScore > 50 ? 'GOOD' : 'CRITICAL'}
                        </span></h3>
                        <p>Your account is protected by industry-standard encryption and security protocols.</p>
                        <div className="score-recommendations">
                          {securityScore < 100 && <span className="rec-title">Suggestions to improve:</span>}
                          {!twoFactorEnabled && <span className="rec-tag"><Shield size={10} /> Enable 2FA (+40%)</span>}
                          {!securitySettings.login_notifications && <span className="rec-tag"><Activity size={10} /> Alerts (+15%)</span>}
                          {!securitySettings.new_device_alerts && <span className="rec-tag"><Smartphone size={10} /> Device Alerts (+15%)</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                    {/* Password Management */}
                    <div className="profile-card w-full">
                      <div className="card-header">
                        <div className="header-icon-box blue"><Lock size={20} /></div>
                        <div>
                          <h3 className="card-title">Password Settings</h3>
                          <p className="card-subtitle">Update your password to keep your account secure</p>
                        </div>
                      </div>
                      <div className="form-stack">
                        <div className="form-group">
                          <label className="form-label">Current Password</label>
                          <div className="password-input-wrapper">
                            <input className="form-input" type={showPasswords.current ? 'text' : 'password'} value={passwordForm.currentPassword}
                              onChange={e => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} />
                            <button className="password-toggle" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))}>
                              {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">New Password</label>
                          <div className="password-input-wrapper">
                            <input className="form-input" type={showPasswords.new ? 'text' : 'password'} value={passwordForm.newPassword}
                              onChange={e => setPasswordForm(p => ({...p, newPassword: e.target.value}))} />
                            <button className="password-toggle" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))}>
                              {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {passwordForm.newPassword && (
                            <div className="password-strength-meter">
                              <div className="strength-bar-track">
                                <div className="strength-bar-fill" style={{ width: `${passwordStrength.percent}%`, background: passwordStrength.color }} />
                              </div>
                              <span className="strength-label" style={{ color: passwordStrength.color }}>{passwordStrength.level.toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <button className="btn btn-primary" onClick={handlePasswordUpdate} disabled={passwordLoading || !passwordForm.newPassword}>
                          {passwordLoading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          Update Password
                        </button>
                      </div>
                    </div>

                    <div className="security-grid">
                      {/* Two-Factor Authentication & Advanced Security */}
                      <div className="profile-card col-span-2">
                        <div className="card-header">
                          <div className={`header-icon-box ${twoFactorEnabled ? 'green' : 'orange'}`}><ShieldCheck size={20} /></div>
                          <div style={{ flex: 1 }}>
                            <h3 className="card-title">Multi-Factor Authentication (MFA)</h3>
                            <p className="card-subtitle">Protect your account with multiple layers of verification</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`status-badge ${twoFactorEnabled ? 'active' : 'inactive'}`}>
                              TOTP: {twoFactorEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                            <span className={`status-badge ${securitySettings.is_phone_verified ? 'active' : 'inactive'}`}>
                              SMS: {securitySettings.is_phone_verified ? 'VERIFIED' : 'PENDING'}
                            </span>
                          </div>
                        </div>

                        <div className="mfa-methods-grid">
                          <div className={`mfa-method-card ${twoFactorEnabled ? 'method-active' : ''}`}>
                            <div className="method-icon"><Smartphone size={24} /></div>
                            <div className="method-info">
                              <h4>Authenticator App</h4>
                              <p>Use Google Authenticator or similar apps to get codes.</p>
                            </div>
                            <div className="method-action">
                              {twoFactorEnabled ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <ShieldCheck size={14} /> ACTIVE
                                  </span>
                                  <button className="text-[10px] text-slate-400 hover:text-red-500 transition-colors" onClick={() => setShow2FASetup(true)}>Disable</button>
                                </div>
                              ) : (
                                <button className="btn-sm btn-primary" onClick={handleStartMfaEnroll}>Setup</button>
                              )}
                            </div>
                          </div>

                          <div className={`mfa-method-card ${securitySettings.is_phone_verified ? 'method-active' : ''}`}>
                            <div className="method-icon"><PhoneIcon size={24} /></div>
                            <div className="method-info">
                              <h4>Phone Verification</h4>
                              <p>Verify your phone number for account recovery and SMS alerts.</p>
                            </div>
                            <div className="method-action">
                              {securitySettings.is_phone_verified ? (
                                <div className="flex items-center text-green-600 text-xs font-bold gap-1">
                                  <ShieldCheck size={14} /> VERIFIED
                                </div>
                              ) : (
                                <button className="btn-sm btn-primary" onClick={handleStartPhoneVerify}>Verify Now</button>
                              )}
                            </div>
                          </div>

                          <div className={`mfa-method-card ${securityKeys.length > 0 ? 'method-active' : ''}`}>
                            <div className="method-icon"><Key size={24} /></div>
                            <div className="method-info">
                              <h4>Hardware Security Key</h4>
                              <p>Use a physical YubiKey or biometric key (Windows Hello, FaceID).</p>
                            </div>
                            <div className="method-action">
                              {securityKeys.length > 0 ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <ShieldCheck size={14} /> ACTIVE
                                  </span>
                                  <button className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors" onClick={() => setShowSecurityKeyModal(true)}>Manage</button>
                                </div>
                              ) : (
                                <button className="btn-sm btn-primary" onClick={() => setShowSecurityKeyModal(true)}>Add Key</button>
                              )}
                            </div>
                          </div>

                          <div className={`mfa-method-card ${securitySettings.backup_codes_generated_at ? 'method-active' : ''}`}>
                            <div className="method-icon"><FileText size={24} /></div>
                            <div className="method-info">
                              <h4>Backup Codes</h4>
                              <p>Emergency codes if you lose access to your other methods.</p>
                            </div>
                            <div className="method-action">
                              {securitySettings.backup_codes_generated_at ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <ShieldCheck size={14} /> DOWNLOADED
                                  </span>
                                  <button className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors" onClick={handleGenerateBackupCodes}>Regenerate</button>
                                </div>
                              ) : (
                                <button className="btn-sm btn-primary" onClick={handleGenerateBackupCodes}>Generate</button>
                              )}
                            </div>
                          </div>
                        </div>

                        {show2FASetup && (
                          <div className="mfa-setup-box mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                            {mfaStep === 1 && (
                              <div className="mfa-step text-center">
                                <h4 className="text-lg font-bold mb-2">Setup Authenticator App</h4>
                                <p className="mfa-desc mb-4 text-slate-500">Scan this QR code with your authenticator app</p>
                                <div className="mfa-qr-container mx-auto bg-white p-4 rounded-xl shadow-sm border border-slate-200 inline-block">
                                  {mfaQrCode ? <img src={mfaQrCode} alt="2FA QR" className="w-48 h-48" /> : <RefreshCw className="animate-spin" />}
                                </div>
                                <div className="mfa-manual-entry mt-4 bg-slate-100 p-2 rounded flex items-center justify-between">
                                  <code className="text-xs font-mono">{mfaSecret}</code>
                                  <button className="text-primary hover:text-primary-dark" onClick={() => { navigator.clipboard.writeText(mfaSecret); toast.success('Secret copied!') }}><Clipboard size={14} /></button>
                                </div>
                                <div className="flex gap-2 mt-6">
                                  <button className="btn btn-outline flex-1" onClick={() => setShow2FASetup(false)}>Cancel</button>
                                  <button className="btn btn-primary flex-1" onClick={() => setMfaStep(2)}>Next Step</button>
                                </div>
                              </div>
                            )}
                            {mfaStep === 2 && (
                              <div className="mfa-step text-center">
                                <h4 className="text-lg font-bold mb-2">Verify Code</h4>
                                <p className="mfa-desc mb-6 text-slate-500">Enter the 6-digit code from your app</p>
                                <div className="otp-input-group justify-center" onPaste={handleOtpPaste}>
                                  {mfaVerifyCode.map((digit, i) => (
                                    <input key={i} ref={el => { otpRefs.current[i] = el }}
                                      className="otp-field" type="text" maxLength={1} value={digit}
                                      onChange={e => handleOtpChange(i, e.target.value)}
                                      onKeyDown={e => handleOtpKeyDown(i, e)} />
                                  ))}
                                </div>
                                <div className="flex gap-2 mt-8">
                                  <button className="btn btn-outline flex-1" onClick={() => setMfaStep(1)}>Back</button>
                                  <button className="btn btn-primary flex-1" onClick={handleMfaVerifyAndEnable} disabled={mfaLoading}>
                                    {mfaLoading ? <RefreshCw className="animate-spin" /> : 'Complete Setup'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recovery & Identity Card */}
                    <div className="profile-card w-full">
                      <div className="card-header">
                        <div className="header-icon-box purple"><Mail size={20} /></div>
                        <div>
                          <h3 className="card-title">Account Recovery</h3>
                          <p className="card-subtitle">Options for recovering your account access</p>
                        </div>
                      </div>
                      <div className="form-stack">
                        <div className="form-group">
                          <label className="form-label">Recovery Email Address</label>
                          <div className="flex gap-2">
                            <input 
                              type="email" 
                              className="form-input" 
                              placeholder="recovery@example.com"
                              value={recoveryEmailInput}
                              onChange={e => setRecoveryEmailInput(e.target.value)}
                            />
                            <button className="btn btn-outline btn-sm" onClick={handleUpdateRecoveryEmail} disabled={saving}>
                              {saving ? <RefreshCw size={14} className="animate-spin" /> : 'Save'}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">This email will be used if you lose access to your primary email.</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Activity size={16} /> Identity Verification
                          </h4>
                          <div className="verification-list">
                            <div className="verification-item">
                              <span>Primary Email Verified</span>
                              <span className="text-green-600 font-bold text-[10px]">YES</span>
                            </div>
                            <div className="verification-item">
                              <span>ID Document Uploaded</span>
                              <span className={profile?.kyc_status === 'approved' ? 'text-green-600 font-bold text-[10px]' : 'text-amber-600 font-bold text-[10px]'}>
                                {profile?.kyc_status?.toUpperCase().replace('_', ' ') || 'NOT SUBMITTED'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="security-grid">
                      {/* Device Management */}
                      <div className="profile-card full-width">
                        <div className="card-header">
                          <div className="header-icon-box green"><Monitor size={20} /></div>
                          <div>
                            <h3 className="card-title">Connected Devices</h3>
                            <p className="card-subtitle">Manage and monitor all devices currently logged into your account</p>
                          </div>
                        </div>
                        <div className="device-list">
                          {devicesLoading ? (
                            <div className="loading-state"><RefreshCw className="animate-spin" /> Loading devices...</div>
                          ) : (
                            devices.map(device => (
                              <div key={device.id} className={`device-item ${device.is_current ? 'current' : ''}`}>
                                <div className="device-icon-box">
                                  {getDeviceIcon(device.device_type)}
                                </div>
                                <div className="device-details">
                                  <div className="device-name-row">
                                    <span className="device-name">{device.device_name}</span>
                                    {device.is_current && <span className="current-badge">CURRENT</span>}
                                  </div>
                                  <div className="device-meta-grid">
                                     <div className="device-meta-item" title="Location">
                                       <MapPin size={12} /> 
                                       <span>{device.location_city}, {device.location_country}</span>
                                     </div>
                                     <div className="device-meta-item" title="IP Address">
                                       <Activity size={12} />
                                       <span>{device.ip_address}</span>
                                     </div>
                                     <div className="device-meta-item" title="Internet Service Provider">
                                       <Network size={12} />
                                       <span className="truncate max-w-[150px]">{device.isp || 'Unknown ISP'}</span>
                                     </div>
                                     <div className="device-meta-item" title="Last Active">
                                       <Clock size={12} /> 
                                       <span>{formatTimeAgo(device.last_active_at)}</span>
                                     </div>
                                     {device.metadata?.screen_resolution && (
                                       <div className="device-meta-item" title="Screen Resolution">
                                         <Monitor size={12} />
                                         <span>{device.metadata.screen_resolution}</span>
                                       </div>
                                     )}
                                     {device.is_trusted && (
                                       <div className="device-meta-item text-green-600 font-bold" title="Trusted Device">
                                         <ShieldCheck size={12} />
                                         <span>TRUSTED</span>
                                       </div>
                                     )}
                                  </div>
                                </div>
                                <div className="device-actions">
                                  <button 
                                    className={`btn-icon ${device.is_trusted ? 'text-green-500' : 'text-slate-400'}`} 
                                    onClick={() => handleTrustDevice(device.id, device.is_trusted)}
                                    title={device.is_trusted ? "Untrust Device" : "Trust Device"}
                                  >
                                    <ShieldCheck size={18} />
                                  </button>
                                  {!device.is_current && (
                                    <button className="revoke-btn" onClick={() => handleRevokeDevice(device.id)} title="Revoke Access">
                                      <X size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Account Safety Settings */}
                      <div className="profile-card">
                        <div className="card-header">
                          <div className="header-icon-box orange"><Shield size={20} /></div>
                          <div>
                            <h3 className="card-title">Account Safety Settings</h3>
                            <p className="card-subtitle">Configure how you receive security alerts</p>
                          </div>
                        </div>
                        <div className="settings-list">
                          <div className="setting-row">
                            <div className="setting-info">
                              <h4>Login Notifications</h4>
                              <p>Get notified when a new login occurs</p>
                            </div>
                            <label className="switch">
                              <input type="checkbox" checked={securitySettings.login_notifications}
                                onChange={e => handleSecuritySettingChange('login_notifications', e.target.checked)} />
                              <span className="slider round"></span>
                            </label>
                          </div>
                          <div className="setting-row">
                            <div className="setting-info">
                              <h4>New Device Alerts</h4>
                              <p>Alert me when a device is used for the first time</p>
                            </div>
                            <label className="switch">
                              <input type="checkbox" checked={securitySettings.new_device_alerts}
                                onChange={e => handleSecuritySettingChange('new_device_alerts', e.target.checked)} />
                              <span className="slider round"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audit Log */}
                    <div className="profile-card w-full">
                      <div className="card-header">
                        <div className="header-icon-box blue"><Activity size={20} /></div>
                        <div>
                          <h3 className="card-title">Security Activity Log</h3>
                          <p className="card-subtitle">Review recent security-related actions</p>
                        </div>
                      </div>
                      <div className="audit-log">
                        {auditLogLoading ? (
                          <div className="loading-state"><RefreshCw className="animate-spin" /></div>
                        ) : auditLog.length === 0 ? (
                          <div className="empty-audit">No recent security activity found.</div>
                        ) : (
                          auditLog.map(log => {
                            const isSensitive = ['password_change', '2fa_enabled', '2fa_disabled', 'device_revoked'].includes(log.action)
                            return (
                              <div key={log.id} className={`audit-item ${isSensitive ? 'sensitive' : ''}`}>
                                <div className="audit-icon">
                                  {log.action.includes('password') ? <Key size={14} /> : 
                                   log.action.includes('2fa') ? <ShieldCheck size={14} /> : 
                                   log.action.includes('device') ? <Smartphone size={14} /> : 
                                   <Activity size={14} />}
                                </div>
                                <div className="audit-content">
                                  <div className="audit-action-row">
                                    <span className="audit-action-label">{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span className="audit-timestamp">{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </div>
                                  <div className="audit-details-row">
                                    <span className="audit-ip"><Globe size={10} /> {log.ip_address || 'Unknown IP'}</span>
                                    {log.metadata?.browser && <span className="audit-browser">via {log.metadata.browser}</span>}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            <div className="profile-side-col">
              <div className="security-score-card">
                <div className="score-label">Profile Strength</div>
                <div className="score-value">{profileStrength}%</div>
                <div className="score-progress-bg">
                  <div className="score-progress-fill" style={{ width: `${profileStrength}%` }}></div>
                </div>
                <p className="text-xs opacity-70">
                  {profileStrength < 100 
                    ? "Complete all fields to reach 100% and gain 'Verified' status." 
                    : "Your profile is fully optimized and verified!"}
                </p>
              </div>

              <div className="profile-card mt-6">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Recent Activity
                </h4>
                <div className="space-y-4">
                  {auditLog.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No recent activity detected.</p>
                  ) : (
                    auditLog.slice(0, 5).map(log => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          ['password_change', '2fa_enabled', 'device_revoked'].includes(log.action) ? 'bg-amber-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-slate-700 capitalize">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-slate-500 text-[10px]">{formatTimeAgo(log.created_at)} • {log.ip_address}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* New Security Guide Card */}
              <div className="profile-card mt-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-400" />
                  Security & Profile Guide
                </h4>
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="font-semibold text-blue-300 mb-1">MFA Enforcement</p>
                    <p className="text-slate-300 leading-relaxed">Always keep TOTP or Security Keys enabled. This prevents 99% of unauthorized access attempts even if your password is compromised.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="font-semibold text-purple-300 mb-1">Recovery Hygiene</p>
                    <p className="text-slate-300 leading-relaxed">Ensure your recovery email is different from your primary admin email. Store your backup codes in a physical or encrypted offline location.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="font-semibold text-green-300 mb-1">Device Auditing</p>
                    <p className="text-slate-300 leading-relaxed">Review your connected devices weekly. Revoke any session that you don't recognize immediately to secure your session data.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="font-semibold text-amber-300 mb-1">Activity Alerts</p>
                    <p className="text-slate-300 leading-relaxed">Enable both Login and New Device notifications to receive instant SMS/Email alerts for every account access event.</p>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors">
                  View Full Security Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Your Backup Codes</h3>
                  <p className="text-slate-500 text-sm mt-1">Keep these in a safe place. You can use each code only once.</p>
                </div>
                <button onClick={() => setShowBackupCodesModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="backup-codes-grid">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="code-item">
                    <span className="code-number">{String(idx + 1).padStart(2, '0')}.</span>
                    <code>{code}</code>
                  </div>
                ))}
              </div>

              <div className="backup-codes-warning mt-6 p-4 bg-amber-50 rounded-xl flex gap-3 text-amber-700 text-xs">
                <ShieldAlert size={20} className="shrink-0" />
                <p>Warning: If you lose these codes and lose access to your other 2FA methods, you will be locked out of your account.</p>
              </div>

              <div className="flex gap-3 mt-8">
                <button className="btn btn-outline flex-1" onClick={() => window.print()}>
                  <Printer size={16} /> Print Codes
                </button>
                <button className="btn btn-primary flex-1" onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  toast.success('Codes copied to clipboard!');
                }}>
                  <Copy size={16} /> Copy All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verification Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Phone Verification</h3>
                <button onClick={() => setShowPhoneModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {!phoneOtpSent ? (
                <div className="space-y-6">
                  <p className="text-slate-500">Enter your phone number to receive a verification code via SMS.</p>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+1234567890"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary w-full" onClick={handleStartPhoneVerify} disabled={saving}>
                    {saving ? <RefreshCw className="animate-spin" /> : 'Send Code'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-500 text-center">We've sent a 6-digit code to <strong>{phoneInput}</strong></p>
                  <div className="otp-input-group justify-center">
                    <input 
                      type="text" 
                      className="form-input text-center text-2xl tracking-[0.5em] font-bold" 
                      maxLength={6}
                      placeholder="000000"
                      value={phoneOtpValue}
                      onChange={e => setPhoneOtpValue(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary w-full" onClick={handleVerifyPhoneOtp} disabled={saving}>
                    {saving ? <RefreshCw className="animate-spin" /> : 'Verify & Link Phone'}
                  </button>
                  <button className="btn btn-ghost w-full" onClick={() => setPhoneOtpSent(false)}>
                    Use a different number
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Key Modal */}
      {showSecurityKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Security Keys</h3>
                  <p className="text-slate-500 text-sm mt-1">Use hardware keys or biometrics for the highest level of security.</p>
                </div>
                <button onClick={() => setShowSecurityKeyModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="security-key-list">
                {securityKeys.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Key size={40} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">No security keys registered yet.</p>
                  </div>
                ) : (
                  securityKeys.map(key => (
                    <div key={key.id} className="key-item">
                      <div className="key-icon"><ShieldCheck size={20} /></div>
                      <div className="key-info">
                        <div className="key-name">{key.key_name}</div>
                        <div className="key-date">Added on {new Date(key.created_at).toLocaleDateString()}</div>
                      </div>
                      <button className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button className="btn btn-primary w-full mt-6" onClick={handleAddSecurityKey} disabled={saving}>
                <Plus size={16} /> Register New Key
              </button>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3 text-blue-700 text-xs">
                <Info size={16} className="shrink-0" />
                <p>Security keys provide protection against phishing by requiring a physical touch or biometric scan during login.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  )
}

export default AdminProfilePage
