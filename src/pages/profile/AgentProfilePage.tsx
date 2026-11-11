import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Camera, Save, User as UserIcon, Building, MapPin, Globe, Phone, Mail,
  Shield, Clock, Lock, Smartphone, LogOut, Trash2, AlertTriangle,
  X, Eye, EyeOff, Image as ImageIcon, Edit2, Plus, CheckCircle2,
  Users as UsersIcon, Link as LinkIcon, Copy, ExternalLink, GraduationCap,
  Facebook, Twitter, Linkedin, Instagram, Youtube, MessageCircle, Navigation, Briefcase,
  Monitor, Tablet, ShieldCheck, ShieldAlert, Key, Download, Info, Check, ChevronDown,
  Activity, RefreshCw, UserX, FileText, Clipboard, Upload, Fingerprint
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getSecureUrl, uploadAvatar, uploadCoverImage, uploadAgentContractDoc } from '../../lib/storageHelpers'
import toast from 'react-hot-toast'
import ImageCropperModal from '../../components/ui/ImageCropperModal'
import VerifiedBadge from '../../components/ui/VerifiedBadge'
import '../dashboard/DashboardPages.css'
import './AgentProfilePage.css'

const KYC_STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string; icon: string }> = {
  pending: { labelKey: 'profile.kycStatus.pending', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  under_review: { labelKey: 'profile.kycStatus.under_review', color: '#3b82f6', bg: '#eff6ff', icon: '🔍' },
  approved: { labelKey: 'profile.kycStatus.approved', color: '#10b981', bg: '#f0fdf4', icon: '✅' },
  rejected: { labelKey: 'profile.kycStatus.rejected', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
}

type TabType = 'profile' | 'security' | 'account'

type Passkey = {
  id: string
  key_name: string
  device_type: string | null
  backed_up: boolean
  created_at: string
  last_used_at: string | null
}

export default function AgentProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, refreshProfile, signOut } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  // Profile form state
  const [loading, setLoading] = useState(false)
  const [kycData, setKycData] = useState<any>(null)
  const [partnerData, setPartnerData] = useState<any[]>([])
  const [partnerUniversities, setPartnerUniversities] = useState<any[]>([])
  const [appCount, setAppCount] = useState(0)
  const [partnerCount, setPartnerCount] = useState(0)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [contractDocs, setContractDocs] = useState<any[]>([])
  const [docLoading, setDocLoading] = useState<string | null>(null)
  const [showDocUploadModal, setShowDocUploadModal] = useState(false)
  const [selectedDocReq, setSelectedDocReq] = useState<any>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docAgentNote, setDocAgentNote] = useState('')
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  // Avatar and cover state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [showCoverCropper, setShowCoverCropper] = useState(false)

  // Form data state
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone: '', bio: '',
    agency_name: '', trading_name: '', website: '',
    country: '', city: '', office_address: '', designation: '',
    company_email: '', office_country: '', office_city: '',
    postal_code: '', account_type: '',
    facebook_url: '', twitter_url: '', linkedin_url: '', instagram_url: '',
    youtube_url: '', tiktok_url: '', whatsapp_number: '', telegram_id: '',
    skype_id: '', founded_year: '', number_of_employees: '', languages_spoken: '', primary_market: ''
  })

  // Real-time save status per field
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 2FA state - Real TOTP via Supabase MFA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [mfaStep, setMfaStep] = useState<1 | 2 | 3>(1)
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaVerifyCode, setMfaVerifyCode] = useState(['', '', '', '', '', ''])
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaChallengeId, setMfaChallengeId] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [passkeysLoading, setPasskeysLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [recoveryGeneratedAt, setRecoveryGeneratedAt] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)

  // Device management state
  const [devices, setDevices] = useState<any[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    login_notifications: true,
    new_device_alerts: true,
    session_timeout_minutes: 1440,
    require_2fa_for_sensitive: false
  })

  // Audit log state
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [auditLogLoading, setAuditLogLoading] = useState(false)
  const [auditLogLimit, setAuditLogLimit] = useState(10)

  // Account management state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteAllDataModal, setShowDeleteAllDataModal] = useState(false)
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteAllDataConfirm, setDeleteAllDataConfirm] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)
  const [closeAccountReason, setCloseAccountReason] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false)
  const [dataExporting, setDataExporting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<string[]>([])
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Initialize form data from profile and KYC
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        agency_name: profile.agency_name || '',
        trading_name: profile.trading_name || '',
        website: profile.website || '',
        country: profile.country || '',
        city: profile.city || '',
        office_address: profile.office_address || '',
        designation: profile.designation || '',
        company_email: profile.company_email || '',
        office_country: profile.office_country || '',
        office_city: profile.office_city || '',
        postal_code: profile.postal_code || '',
        account_type: profile.account_type || '',
        facebook_url: profile.facebook_url || '',
        twitter_url: profile.twitter_url || '',
        linkedin_url: profile.linkedin_url || '',
        instagram_url: profile.instagram_url || '',
        youtube_url: profile.youtube_url || '',
        tiktok_url: profile.tiktok_url || '',
        whatsapp_number: profile.whatsapp_number || '',
        telegram_id: profile.telegram_id || '',
        skype_id: profile.skype_id || '',
        founded_year: profile.founded_year ? String(profile.founded_year) : '',
        number_of_employees: profile.number_of_employees || '',
        languages_spoken: profile.languages_spoken ? profile.languages_spoken.join(', ') : '',
        primary_market: profile.primary_market || ''
      })
      setAvatarPreview(profile.avatar_url || '')
      setCoverPreview(profile.cover_image_url || '')
    }
  }, [profile])

  // Fetch KYC and partner data
  // Memoized fetcher for all profile-related data
  const fetchProfileData = useCallback(async () => {
    if (!user) return
    const effectiveTargetId = (profile as any)?.effective_agency_id || user.id

    try {
      const [kycRes, appsRes, partnerSelectionsRes, teamRes, contractRes] = await Promise.all([
        supabase.from('agent_kyc').select('*').eq('agent_id', effectiveTargetId).maybeSingle(),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('agent_id', effectiveTargetId),
        supabase.from('agent_partner_selections')
          .select('*, universities(*, programs(*))')
          .eq('agent_id', effectiveTargetId),
        supabase.from('team_members')
          .select('*')
          .eq('agency_id', effectiveTargetId),
        (supabase as any).from('contract_document_requests')
          .select('*')
          .eq('agent_id', effectiveTargetId)
          .order('created_at', { ascending: false })
      ])

      if (kycRes.data) {
        setKycData(kycRes.data)
        // Auto-fill form with KYC data if profile fields are empty
        setFormData(prev => ({
          ...prev,
          office_country: (kycRes.data as any)?.registered_country || prev.office_country,
          office_city: (kycRes.data as any)?.registered_city || prev.office_city,
          office_address: (kycRes.data as any)?.registered_address || prev.office_address,
          postal_code: (kycRes.data as any)?.registered_postal_code || prev.postal_code,
        }))
      }

      // Extract partner universities from selections with full data including programs
      const selections = partnerSelectionsRes.data || []
      const partners = selections
        .map((s: any) => s.universities)
        .filter(Boolean)

      setPartnerData(partners)
      setPartnerUniversities(partners)

      // Set team members
      if (teamRes.data) {
        setTeamMembers(teamRes.data)
      }

      setAppCount(appsRes.count || 0)
      setPartnerCount(partners.length)
      setContractDocs(contractRes?.data || [])

    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
  }, [user, (profile as any)?.effective_agency_id])

  useEffect(() => {
    if (!user) return
    const effectiveTargetId = (profile as any)?.effective_agency_id || user.id

    fetchProfileData()

    // Real-time subscription
    const channel = supabase
      .channel('profile-data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        refreshProfile?.()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_kyc', filter: `agent_id=eq.${effectiveTargetId}` }, fetchProfileData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `agency_id=eq.${effectiveTargetId}` }, fetchProfileData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_document_requests', filter: `agent_id=eq.${effectiveTargetId}` }, fetchProfileData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, refreshProfile, (profile as any)?.effective_agency_id, fetchProfileData])

  // Also define fetchProfileData at a higher scope so it can be called manually
  // Actually, it's already inside useEffect. Let's move it out or use the refreshProfile trigger.
  // Given the structure, adding the subscription above is the best way to ensure real-time updates.
  // But let's also make sure handleDocUploadSubmit calls it if needed.
  // Actually, handleDocUploadSubmit is inside the component, it can access fetchProfileData if we move it.

  // Auto-save specific individual field to database on blur
  const handleFieldBlur = async (field: keyof typeof formData, value: string) => {
    if (!profile) return
    const isTeamEditor = (profile as any).id !== (profile as any).effective_agency_id
    const companyFields = ['agency_name', 'trading_name', 'website', 'country', 'city', 'office_address', 'office_country', 'office_city', 'postal_code', 'facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url', 'youtube_url', 'tiktok_url', 'founded_year', 'number_of_employees', 'languages_spoken', 'primary_market']
    if (isTeamEditor && companyFields.includes(field as string)) return

    try {
      setSaveStatus(prev => ({ ...prev, [field]: 'saving' }))
      
      let formattedValue: any = value
      if (value) {
        if (field === 'founded_year') {
           formattedValue = parseInt(value)
           if (isNaN(formattedValue) || formattedValue < 1500 || formattedValue > 2100) {
             throw new Error('invalidYear')
           }
        } else if (field === 'languages_spoken') {
           formattedValue = value.split(',').map(s => s.trim()).filter(Boolean)
        } else {
           // Strict Frontend Regex Validation for Social Media mapping identically to DB Constraints
           const Validators: Record<string, RegExp> = {
             facebook_url: /^https?:\/\/(www\.)?facebook\.com\/.*/i,
             twitter_url: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.*/i,
             linkedin_url: /^https?:\/\/(www\.)?linkedin\.com\/.*/i,
             instagram_url: /^https?:\/\/(www\.)?instagram\.com\/.*/i,
             youtube_url: /^https?:\/\/(www\.)?youtube\.com\/.*/i,
             tiktok_url: /^https?:\/\/(www\.)?tiktok\.com\/.*/i,
             whatsapp_number: /^\+?[0-9]{7,15}$/,
           }
           if (Validators[field as keyof typeof Validators]) {
             if (!Validators[field].test(value)) {
               throw new Error(`Invalid URL format for ${field}`)
             }
           }
        }
      } else {
         formattedValue = null // Convert empty strings to null for DB constraints
      }

      const { error } = await supabase.from('profiles').update({ [field]: formattedValue }).eq('id', profile.id)
      
      if (error) {
        throw error // Caught below, triggers error UI which means validation failed
      }
      
      setSaveStatus(prev => ({ ...prev, [field]: 'saved' }))
      setTimeout(() => setSaveStatus(prev => { const next = {...prev}; delete next[field]; return next; }), 2500)
    } catch (err: any) {
      console.error(err)
      const errorKey = err.message === 'invalidYear' ? 'errors.invalidYear' : 
                       err.message === 'invalidFormat' ? 'errors.invalidFormat' : 
                       'errors.generic'
      toast.error(t(errorKey))
      setSaveStatus(prev => ({ ...prev, [field]: 'error' }))
    }
  }

  // Save profile
  const handleSave = async () => {
    if (!profile) return
    setLoading(true)

    try {
      let avatar_url = profile.avatar_url
      let cover_image_url = profile.cover_image_url

      // Upload avatar if changed
      if (avatarFile) {
        avatar_url = await uploadAvatar(profile.id, avatarFile)
      } else if (avatarPreview === '') {
        avatar_url = null
      }

      // Upload cover image if changed
      if (coverFile) {
        cover_image_url = await uploadCoverImage(profile.id, coverFile)
      } else if (coverPreview === '') {
        cover_image_url = null
      }

      // Format specific fields for database types
      let payload = { ...formData, avatar_url, cover_image_url } as any
      payload.founded_year = payload.founded_year ? parseInt(payload.founded_year) : null
      payload.languages_spoken = payload.languages_spoken ? payload.languages_spoken.split(',').map((s: string) => s.trim()) : null
      
      const isTeamEditor = (profile as any).id !== (profile as any).effective_agency_id
      if (isTeamEditor) {
        // Strip out company fields from the payload to avoid overwriting their personal profile with parent's data
        const { agency_name, trading_name, website, country, city, office_address, office_country, office_city, postal_code, facebook_url, twitter_url, linkedin_url, instagram_url, youtube_url, tiktok_url, founded_year, number_of_employees, languages_spoken, primary_market, ...personalPayload } = payload
        payload = personalPayload
      }

      // Convert all empty strings to null for strict DB constraints
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null
      })

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile?.()
      toast.success(t('profile.profileUpdated'))
      setAvatarFile(null)
      setCoverFile(null)
    } catch (err: any) {
      toast.error(err.message || t('profile.couldNotSave'))
    } finally {
      setLoading(false)
    }
  }

  const handleDocUploadSubmit = async () => {
    if (!docFile || !selectedDocReq || !profile) {
      toast.error('Please select a file to upload')
      return
    }
    setIsUploadingDoc(true)
    try {
      // 1. Upload to storage
      const url = await uploadAgentContractDoc(profile.id, selectedDocReq.id, docFile)
      
      // 2. Update the contract document request row
      const { error } = await (supabase as any).from('contract_document_requests').update({
        is_fulfilled: true,
        fulfilled_at: new Date().toISOString(),
        fulfilled_doc_url: url,
        agent_note: docAgentNote || null
      }).eq('id', selectedDocReq.id)

      if (error) throw error

      // 3. Log activity
      await (supabase as any).from('agent_global_activities').insert({
        agent_id: profile.id,
        activity_type: 'document_uploaded',
        description: `Uploaded document for request: ${selectedDocReq.document_type}`
      })

      toast.success('Document uploaded successfully')
      setShowDocUploadModal(false)
      setDocFile(null)
      setDocAgentNote('')
      setSelectedDocReq(null)
      fetchProfileData() // Refresh the local document list
      refreshProfile?.() // Refresh global profile state
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

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

  const handlePasswordUpdate = async () => {
    if (!passwordForm.currentPassword) {
      toast.error(t('profile.security.password.currentRequired'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.security.password.mismatch'))
      return
    }
    if (passwordStrength.met < 3) {
      toast.error(t('errors.passwordMin'))
      return
    }
    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
        current_password: passwordForm.currentPassword,
      })
      if (error) throw error

      // Log to audit
      await logSecurityEvent('password_change')
      toast.success(t('profile.security.password.success'))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.message || t('profile.security.password.error'))
    } finally {
      setPasswordLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TWO-FACTOR AUTHENTICATION (Supabase MFA TOTP)
  // ═══════════════════════════════════════════════════════════════

  // Check MFA status on mount
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        const totpFactors = data?.totp || []
        const verifiedFactor = totpFactors.find((f: any) => f.status === 'verified')
        if (verifiedFactor) {
          setTwoFactorEnabled(true)
          setMfaFactorId(verifiedFactor.id)
        }
      } catch (err) {
        console.error('MFA status check error:', err)
      }
    }
    if (user) checkMfaStatus()
  }, [user])

  const fetchAdvancedSecurity = useCallback(async () => {
    if (!user) return
    setPasskeysLoading(true)
    try {
      const [passkeyResult, recoveryResult] = await Promise.all([
        supabase.auth.passkeys.list(),
        supabase.auth.mfa.getRecoveryCodes(),
      ])
      if (passkeyResult.error) throw passkeyResult.error
      if (recoveryResult.error) throw recoveryResult.error
      setPasskeys((passkeyResult.data || []) as Passkey[])
      setRecoveryRemaining(recoveryResult.data?.remaining || 0)
      setRecoveryGeneratedAt(recoveryResult.data?.generated_at || null)
    } catch (err) {
      console.error('Advanced security status error:', err)
    } finally {
      setPasskeysLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) fetchAdvancedSecurity()
  }, [user, fetchAdvancedSecurity])

  const handleStartMfaEnroll = async () => {
    setMfaLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' })
      if (error) throw error
      setMfaQrCode(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaFactorId(data.id)
      setMfaStep(1)
      setShow2FASetup(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to start 2FA setup')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaVerifyAndEnable = async () => {
    const code = mfaVerifyCode.join('')
    if (code.length !== 6) return
    setMfaLoading(true)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code
      })
      if (verifyError) throw verifyError

      setTwoFactorEnabled(true)
      setMfaStep(3)
      await logSecurityEvent('2fa_enabled')
      toast.success(t('profile.security.twoFactor.success'))
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaDisable = async () => {
    setMfaLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
      if (error) throw error
      setTwoFactorEnabled(false)
      setShow2FASetup(false)
      setMfaStep(1)
      setMfaVerifyCode(['', '', '', '', '', ''])
      await logSecurityEvent('2fa_disabled')
      toast.success(t('profile.security.twoFactor.disabledSuccess'))
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleAddPasskey = async () => {
    setPasskeyLoading(true)
    try {
      const { data: options, error: optionsError } = await supabase.auth.passkeys.registerOptions()
      if (optionsError || !options) throw optionsError || new Error(t('profile.security.passkeys.error'))
      const { challenge_ticket: ticket, ...optionsJSON } = options
      const response = await startRegistration({ optionsJSON })
      const { error } = await supabase.auth.passkeys.verifyRegistration({
        ticket,
        response,
        name: passkeyName.trim() || 'My passkey',
      })
      if (error) throw error
      setPasskeyName('')
      await Promise.all([fetchAdvancedSecurity(), refreshProfile()])
      await logSecurityEvent('passkey_registered')
      toast.success(t('profile.security.passkeys.addSuccess'))
    } catch (err: any) {
      const message = err?.name === 'NotAllowedError'
        ? t('profile.security.passkeys.cancelled')
        : err?.name === 'SecurityError'
          ? t('profile.security.passkeys.secureContext')
          : err.message || t('profile.security.passkeys.error')
      toast.error(message)
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleRemovePasskey = async (id: string) => {
    setPasskeyLoading(true)
    try {
      const { error } = await supabase.auth.passkeys.remove(id)
      if (error) throw error
      await Promise.all([fetchAdvancedSecurity(), refreshProfile()])
      await logSecurityEvent('passkey_removed')
      toast.success(t('profile.security.passkeys.removeSuccess'))
    } catch (err: any) {
      toast.error(err.message || t('profile.security.passkeys.error'))
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleGenerateRecoveryCodes = async () => {
    setRecoveryLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.generateRecoveryCodes()
      if (error || !data?.codes) throw error || new Error(t('profile.security.recovery.error'))
      setRecoveryCodes(data.codes)
      setRecoveryRemaining(data.remaining)
      setRecoveryGeneratedAt(data.generated_at)
      setShowRecoveryCodes(true)
      await logSecurityEvent('backup_codes_generated')
      toast.success(t('profile.security.recovery.generated'))
    } catch (err: any) {
      toast.error(err.message || t('profile.security.recovery.error'))
    } finally {
      setRecoveryLoading(false)
    }
  }

  const downloadRecoveryCodes = () => {
    const content = `ADMISSION DESK - ${t('profile.security.recovery.title').toUpperCase()}\n${new Date().toLocaleString()}\n\n${t('profile.security.recovery.fileWarning')}\n\n${recoveryCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'admission-desk-recovery-codes.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...mfaVerifyCode]
    newCode[index] = value.slice(-1)
    setMfaVerifyCode(newCode)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaVerifyCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...mfaVerifyCode]
    paste.split('').forEach((ch, i) => { newCode[i] = ch })
    setMfaVerifyCode(newCode)
    otpRefs.current[Math.min(paste.length, 5)]?.focus()
  }

  // ═══════════════════════════════════════════════════════════════
  // DEVICE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const parseUserAgent = useCallback(() => {
    const ua = navigator.userAgent
    let browser = 'Unknown', os = 'Unknown', deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (/Firefox/i.test(ua)) browser = 'Firefox'
    else if (/Edg/i.test(ua)) browser = 'Edge'
    else if (/Chrome/i.test(ua)) browser = 'Chrome'
    else if (/Safari/i.test(ua)) browser = 'Safari'
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera'
    if (/Windows/i.test(ua)) os = 'Windows'
    else if (/Mac/i.test(ua)) os = 'macOS'
    else if (/Linux/i.test(ua)) os = 'Linux'
    else if (/Android/i.test(ua)) { os = 'Android'; deviceType = 'mobile' }
    else if (/iOS|iPhone|iPad/i.test(ua)) { os = 'iOS'; deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile' }
    if (/Mobile/i.test(ua) && deviceType === 'desktop') deviceType = 'mobile'
    if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet'
    return { browser, os, deviceType, user_agent: ua }
  }, [])

  // Register/update current device on mount
  useEffect(() => {
    if (!user) return
    const registerDevice = async () => {
      const { browser, os, deviceType, user_agent } = parseUserAgent()
      const deviceName = `${browser} on ${os}`
      // Check if current device already exists
      const { data: existing } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .eq('user_agent', user_agent)
        .maybeSingle()

      if (existing) {
        await supabase.from('user_devices').update({ last_active_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        // Mark all other devices as not current
        await supabase.from('user_devices').update({ is_current: false }).eq('user_id', user.id)
        await supabase.from('user_devices').insert({
          user_id: user.id,
          device_name: deviceName,
          device_type: deviceType,
          browser, os,
          is_current: true,
          user_agent
        })
      }
    }
    registerDevice()
  }, [user, parseUserAgent])

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    if (!user) return
    setDevicesLoading(true)
    try {
      const { data } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false })
      setDevices(data || [])
    } catch (err) {
      console.error('Failed to fetch devices:', err)
    } finally {
      setDevicesLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'security') { fetchDevices(); fetchAuditLog(); fetchSecuritySettings() }
  }, [activeTab, fetchDevices])

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await supabase.from('user_devices').delete().eq('id', deviceId)
      await logSecurityEvent('device_revoked')
      toast.success(t('profile.security.devices.revokeSuccess'))
      fetchDevices()
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const handleRevokeAllDevices = async () => {
    if (!user) return
    try {
      await supabase.from('user_devices').delete().eq('user_id', user.id).eq('is_current', false)
      await logSecurityEvent('device_revoked', { action: 'revoke_all' })
      toast.success(t('profile.security.devices.revokeAllSuccess'))
      fetchDevices()
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const handleToggleTrust = async (deviceId: string, trusted: boolean) => {
    try {
      await supabase.from('user_devices').update({ is_trusted: !trusted }).eq('id', deviceId)
      if (!trusted) await logSecurityEvent('device_trusted')
      fetchDevices()
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECURITY SETTINGS
  // ═══════════════════════════════════════════════════════════════

  const fetchSecuritySettings = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('user_security_settings').select('*').eq('user_id', user.id).maybeSingle()
    if (data) {
      setSecuritySettings({
        login_notifications: data.login_notifications,
        new_device_alerts: data.new_device_alerts,
        session_timeout_minutes: data.session_timeout_minutes,
        require_2fa_for_sensitive: data.require_2fa_for_sensitive
      })
    }
  }, [user])

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
      toast.success(t('profile.security.settings.saved'))
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECURITY AUDIT LOG
  // ═══════════════════════════════════════════════════════════════

  const logSecurityEvent = async (action: string, metadata: any = {}) => {
    if (!user) return
    try {
      await supabase.from('security_audit_log').insert({
        user_id: user.id,
        action,
        device_info: `${parseUserAgent().browser} on ${parseUserAgent().os}`,
        metadata
      })
    } catch (err) {
      console.error('Audit log error:', err)
    }
  }

  const fetchAuditLog = useCallback(async () => {
    if (!user) return
    setAuditLogLoading(true)
    try {
      const { data } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(auditLogLimit)
      setAuditLog(data || [])
    } catch (err) {
      console.error('Audit log fetch error:', err)
    } finally {
      setAuditLogLoading(false)
    }
  }, [user, auditLogLimit])

  // Security Score
  const securityScore = useMemo(() => {
    let score = 20 // base score for having an account
    if (twoFactorEnabled) score += 30
    if (securitySettings.login_notifications) score += 10
    if (securitySettings.new_device_alerts) score += 10
    if (securitySettings.require_2fa_for_sensitive) score += 15
    if (profile?.phone) score += 5
    if (devices.some(d => d.is_trusted)) score += 10
    return Math.min(score, 100)
  }, [twoFactorEnabled, securitySettings, profile, devices])

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { key: 'scoreExcellent', color: '#10b981' }
    if (score >= 60) return { key: 'scoreGood', color: '#3b82f6' }
    if (score >= 40) return { key: 'scoreFair', color: '#f59e0b' }
    return { key: 'scorePoor', color: '#ef4444' }
  }

  const getAuditIcon = (action: string) => {
    const styles: Record<string, { bg: string; color: string; Icon: any }> = {
      login: { bg: '#eff6ff', color: '#3b82f6', Icon: LogOut },
      logout: { bg: '#f0fdf4', color: '#10b981', Icon: LogOut },
      password_change: { bg: '#eff6ff', color: '#3b82f6', Icon: Key },
      '2fa_enabled': { bg: '#f0fdf4', color: '#10b981', Icon: ShieldCheck },
      '2fa_disabled': { bg: '#fef2f2', color: '#ef4444', Icon: ShieldAlert },
      device_revoked: { bg: '#fef2f2', color: '#ef4444', Icon: Smartphone },
      device_trusted: { bg: '#eff6ff', color: '#3b82f6', Icon: Smartphone },
      account_deactivated: { bg: '#fef2f2', color: '#ef4444', Icon: UserX },
      data_exported: { bg: '#eff6ff', color: '#3b82f6', Icon: Download },
      data_deleted: { bg: '#fef2f2', color: '#ef4444', Icon: Trash2 },
      settings_changed: { bg: '#fffbeb', color: '#f59e0b', Icon: Shield },
      email_changed: { bg: '#eff6ff', color: '#3b82f6', Icon: Mail },
    }
    return styles[action] || { bg: '#f0f2f5', color: '#65676b', Icon: Activity }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone size={22} />
      case 'tablet': return <Tablet size={22} />
      default: return <Monitor size={22} />
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const handleLogout = async () => {
    await logSecurityEvent('logout')
    await signOut()
    navigate('/login')
  }

  const handleLogoutAll = async () => {
    if (!user) return
    setAccountLoading(true)
    try {
      await supabase.from('user_devices').delete().eq('user_id', user.id)
      await logSecurityEvent('logout', { action: 'logout_all' })
      toast.success(t('profile.account.logout.allDevicesSuccess'))
      await signOut()
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleCloseAccount = async () => {
    if (!user || !profile) return
    setAccountLoading(true)
    try {
      await supabase.from('profiles').update({ is_active: false }).eq('id', user.id)
      await logSecurityEvent('account_deactivated', { reason: closeAccountReason })
      toast.success(t('profile.account.closeAccount.success'))
      setShowCloseAccountModal(false)
      setTimeout(() => { signOut(); navigate('/login') }, 2000)
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleDeleteAllData = async () => {
    if (!deleteAllDataConfirm || !user) return
    setAccountLoading(true)
    setDeleteProgress([])
    try {
      setDeleteProgress(prev => [...prev, 'applications'])
      await supabase.from('applications').delete().eq('agent_id', user.id)
      setDeleteProgress(prev => [...prev, 'students'])
      await supabase.from('students').delete().eq('agent_id', user.id)
      setDeleteProgress(prev => [...prev, 'partners'])
      await supabase.from('agent_partner_selections').delete().eq('agent_id', user.id)
      setDeleteProgress(prev => [...prev, 'complete'])
      await logSecurityEvent('data_deleted')
      setShowDeleteAllDataModal(false)
      setDeleteAllDataConfirm(false)
      setAppCount(0)
      setDeleteProgress([])
      toast.success(t('profile.account.deleteAllData.success'))
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !user) return
    setAccountLoading(true)
    try {
      // Clean up all user data
      await supabase.from('user_devices').delete().eq('user_id', user.id)
      await supabase.from('security_audit_log').delete().eq('user_id', user.id)
      await supabase.from('user_security_settings').delete().eq('user_id', user.id)
      await supabase.from('applications').delete().eq('agent_id', user.id)
      await supabase.from('students').delete().eq('agent_id', user.id)
      await supabase.from('agent_partner_selections').delete().eq('agent_id', user.id)
      await supabase.from('agent_kyc').delete().eq('agent_id', user.id)
      await supabase.from('team_members').delete().eq('agency_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)

      setShowDeleteModal(false)
      toast.success(t('profile.account.deleteAccount.success'))
      setTimeout(() => { signOut(); navigate('/login') }, 1500)
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return
    setDataExporting(true)
    try {
      const [profileRes, appsRes, studentsRes, kycRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('applications').select('*').eq('agent_id', user.id),
        supabase.from('students').select('*').eq('agent_id', user.id),
        supabase.from('agent_kyc').select('*').eq('agent_id', user.id).maybeSingle()
      ])
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        applications: appsRes.data,
        students: studentsRes.data,
        kyc: kycRes.data
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `admission-desk-data-${new Date().toISOString().split('T')[0]}.json`
      a.click(); URL.revokeObjectURL(url)
      await logSecurityEvent('data_exported')
      toast.success(t('profile.account.export.success'))
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setDataExporting(false)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail) return
    setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      await logSecurityEvent('email_changed', { new_email: newEmail })
      toast.success(t('profile.account.overview.emailUpdateSuccess'))
      setShowEmailChange(false)
      setNewEmail('')
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setEmailLoading(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const kycStatus = (profile as any)?.kyc_status || 'pending'
  const kycConfig = KYC_STATUS_CONFIG[kycStatus] || KYC_STATUS_CONFIG.pending
  const displayName = formData.first_name || formData.last_name
    ? `${formData.first_name} ${formData.last_name}`
    : user?.email?.split('@')[0] || 'Agent'

  const isTeamEditor = profile && (profile as any).id !== (profile as any).effective_agency_id

  return (
    <div className="profile-page-wrapper">
      {/* Facebook-style Cover Section */}
      <div className="fb-cover-section">
        <div className="fb-cover-container">
          {/* Cover Image - Full Width */}
          <div className="fb-cover-image-wrapper" onClick={() => setShowCoverCropper(true)}>
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Cover" className="fb-cover-image" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(''); }}
                  style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex' }}
                  title="Remove cover photo"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <div className="fb-cover-placeholder">
                <ImageIcon size={48} />
                <span>{t('profile.coverImage.dragDrop')}</span>
              </div>
            )}
            <div className="fb-cover-overlay">
              <button className="fb-cover-upload-btn" type="button">
                <Camera size={16} />
                {coverPreview ? t('profile.coverImage.change') : t('profile.coverImage.upload')}
              </button>
            </div>
          </div>

          {/* Profile Header - Overlapping Cover */}
          <div className="fb-profile-header">
            {/* Avatar */}
            <div className="fb-avatar-wrapper" onClick={() => setShowAvatarCropper(true)}>
              <div className="fb-avatar-container" style={{ position: 'relative' }}>
                {avatarPreview ? (
                  <>
                    <img src={avatarPreview} alt="Avatar" className="fb-avatar-img" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAvatarFile(null); setAvatarPreview(''); }}
                      style={{ position: 'absolute', top: -5, right: -5, zIndex: 20, background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '4px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex' }}
                      title="Remove avatar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <div className="fb-avatar-placeholder">
                    <UserIcon size={48} />
                  </div>
                )}
                <div className="fb-avatar-overlay">
                  <Camera size={20} />
                </div>
              </div>
              <div className="fb-avatar-camera">
                <Camera size={14} />
              </div>
            </div>

            {/* Name and Info */}
            <div className="fb-profile-info">
              <div className="fb-profile-name-section">
                <h1 className="fb-profile-name" style={{ display: 'flex', alignItems: 'center' }}>
                  {displayName}
                  <VerifiedBadge isVerified={kycStatus === 'approved'} size={24} style={{ marginLeft: '12px' }} />
                </h1>
                <div
                  className="fb-kyc-badge"
                  style={{ background: kycConfig.bg, color: kycConfig.color }}
                >
                  <span>{kycConfig.icon}</span>
                  <span>{t(kycConfig.labelKey)}</span>
                </div>
              </div>
              <p className="fb-profile-designation">{formData.designation || t('profile.agent')}</p>
              <p className="fb-profile-agency">{formData.agency_name}</p>
            </div>

            {/* Action Buttons */}
            <div className="fb-profile-actions">
              <button className="fb-btn fb-btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? <span className="spinner" /> : <Edit2 size={16} />}
                {t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="fb-tabs-wrapper">
        <div className="fb-tabs-container">
          <div className="fb-tabs">
            <button
              className={`fb-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserIcon size={16} />
              {t('profile.title')}
            </button>
            <button
              className={`fb-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={16} />
              {t('profile.security.title')}
            </button>
            <button
              className={`fb-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <Lock size={16} />
              {t('profile.account.title')}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="fb-content-wrapper">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="fb-profile-content">
            <div className="fb-content-grid">
              {/* Left Column - About & Info */}
              <div className="fb-left-column">
                {/* Quick Stats */}
                <div className="fb-card">
                  <h3 className="fb-card-title">{t('profile.applications')}</h3>
                  <div className="fb-stats-row">
                    <div className="fb-stat-item">
                      <div className="fb-stat-value">{appCount}</div>
                      <div className="fb-stat-label">{t('profile.applications')}</div>
                    </div>
                    <div className="fb-stat-divider"></div>
                    <div className="fb-stat-item">
                      <div className="fb-stat-value">{partnerCount}</div>
                      <div className="fb-stat-label">{t('profile.partners')}</div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="fb-card">
                  <h3 className="fb-card-title">{t('profile.personalInfo')}</h3>
                  <div className="fb-info-list">
                    <div className="fb-info-item">
                      <Mail size={16} />
                      <span>{user?.email}</span>
                    </div>
                    <div className="fb-info-item">
                      <Phone size={16} />
                      <span>{formData.phone || '—'}</span>
                    </div>
                    <div className="fb-info-item">
                      <MapPin size={16} />
                      <span>{[formData.office_city, formData.office_country].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                    <div className="fb-info-item">
                      <Globe size={16} />
                      <span>{formData.website || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Team Members - Now in left column */}
                <div className="fb-card fb-team-card">
                  <h3 className="fb-card-title">
                    <UsersIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    {t('team.title')}
                    <span className="fb-team-count">{t('team.countBadge', { current: teamMembers.length, max: 2 })}</span>
                  </h3>
                  {teamMembers.length > 0 ? (
                    <div className="fb-team-list">
                      {teamMembers.map((member: any) => (
                        <div key={member.id} className="fb-team-member">
                          <div className="fb-team-avatar">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} />
                            ) : (
                              <div className="fb-team-avatar-initials">
                                {(member.name || 'M')[0]}
                              </div>
                            )}
                            {member.status === 'active' && (
                              <span className="fb-team-status" />
                            )}
                          </div>
                          <div className="fb-team-info">
                            <span className="fb-team-name">{member.name}</span>
                            <span className="fb-team-role">{member.invited_email || member.email}</span>
                          </div>
                          <div className="fb-team-badge">
                            <span className={`fb-badge ${member.status === 'active' ? 'fb-badge-active' : 'fb-badge-pending'}`}>
                              {member.status === 'active' ? t('team.active') : t('team.pending')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="fb-empty-team">
                      <UsersIcon size={32} style={{ opacity: 0.3 }} />
                      <p>{t('team.noMembers')}</p>
                      <p className="fb-empty-team-hint">{t('team.invite.subtitle')}</p>
                    </div>
                  )}
                  <button
                    className="fb-btn fb-btn-primary fb-btn-full mt-3"
                    onClick={() => navigate('/dashboard/team')}
                  >
                    <Plus size={16} />
                    {teamMembers.length === 0 ? 'Add Team Members' : 'Manage Team'}
                  </button>
                </div>

                {/* Business & KYC Documents */}
                <div className="fb-card">
                  <h3 className="fb-card-title">
                    <FileText size={16} style={{ color: '#3A4391' }} />
                    {t('profile.documents.title') || 'Business Documents'}
                  </h3>
                  
                  <div className="fb-docs-list">
                    {/* Primary KYC License */}
                    {kycData?.business_licence_url && (
                      <div className="fb-doc-item">
                        <div className="fb-doc-icon"><FileText size={18} /></div>
                        <div className="fb-doc-info">
                          <span className="fb-doc-name">{t('profile.documents.businessLicense') || 'Business License'}</span>
                          <span className="fb-doc-meta">{t('profile.documents.primaryKyc') || 'Primary KYC'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const url = await getSecureUrl('kyc-documents', kycData.business_licence_url)
                            if (url) window.open(url, '_blank')
                          }}
                          className="fb-doc-view-btn"
                          title={t('profile.documents.viewDocument') || 'View Document'}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    )}

                    {/* Contract Documents */}
                    {contractDocs.map(doc => (
                      <div key={doc.id} className="fb-doc-item">
                        <div className="fb-doc-icon" style={{ color: doc.is_fulfilled ? '#10b981' : '#f59e0b' }}>
                          {doc.is_fulfilled ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div className="fb-doc-info">
                          <span className="fb-doc-name">{doc.document_type}</span>
                          <span className="fb-doc-meta" style={{ color: doc.is_fulfilled ? undefined : '#f59e0b', fontWeight: doc.is_fulfilled ? undefined : 600 }}>
                            {doc.is_fulfilled ? (t('profile.documents.verifiedContractDoc') || 'Verified Contract Doc') : (t('profile.documents.actionRequired') || 'Action Required: Upload Document')}
                          </span>
                        </div>
                        {doc.is_fulfilled ? (
                          <button
                            type="button"
                            disabled={docLoading === doc.id}
                            onClick={async () => {
                              setDocLoading(doc.id)
                              const url = await getSecureUrl('agent-documents', doc.fulfilled_doc_url)
                              setDocLoading(null)
                              if (url) window.open(url, '_blank')
                            }}
                            className="fb-doc-view-btn"
                            title={t('profile.documents.viewDocument') || 'View Document'}
                          >
                            {docLoading === doc.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Eye size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedDocReq(doc); setShowDocUploadModal(true); }}
                            className="fb-doc-view-btn"
                            style={{ color: '#3b82f6', borderColor: '#bfdbfe', background: '#eff6ff' }}
                            title={t('profile.documents.upload') || 'Upload Document'}
                          >
                            <Upload size={16} />
                          </button>
                        )}
                      </div>
                    ))}

                    {!kycData?.business_licence_url && contractDocs.length === 0 && (
                      <div className="fb-docs-empty">
                        <Clipboard size={32} style={{ opacity: 0.3 }} />
                        <p>{t('profile.documents.noDocuments') || 'No business documents available'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* KYC Registration Details */}
                {kycData && (
                  <div className="fb-card">
                    <h3 className="fb-card-title">
                      <Shield size={16} /> {t('common.kycDetails')}
                    </h3>
                    <div className="fb-kyc-info">
                      {kycData.company_registration_number && (
                        <div className="fb-kyc-row">
                          <span className="fb-kyc-label">{t('common.regNumber')}</span>
                          <span className="fb-kyc-value">{kycData.company_registration_number}</span>
                        </div>
                      )}
                      {kycData.incorporation_date && (
                        <div className="fb-kyc-row">
                          <span className="fb-kyc-label">{t('common.incorpDate')}</span>
                          <span className="fb-kyc-value">
                            {new Date(kycData.incorporation_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Edit Forms */}
              <div className="fb-right-column">
                {/* Personal Information */}
                <div className="fb-card">
                  <h3 className="fb-card-title">
                    <UserIcon size={16} style={{ color: 'var(--color-primary)' }} />
                    {t('profile.personalInfo')}
                  </h3>
                  <div className="fb-form-grid">
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.labels.firstName')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.first_name}
                        onChange={e => setFormData(p => ({...p, first_name: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.labels.lastName')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.last_name}
                        onChange={e => setFormData(p => ({...p, last_name: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.phoneNumber')}</label>
                      <input
                        className="fb-form-input"
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.labels.jobTitle')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.designation}
                        onChange={e => setFormData(p => ({...p, designation: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group fb-form-full">
                      <label className="fb-form-label">{t('profile.shortBio')}</label>
                      <textarea
                        className="fb-form-textarea"
                        rows={3}
                        value={formData.bio}
                        onChange={e => setFormData(p => ({...p, bio: e.target.value}))}
                        placeholder={t('profile.bioPlaceholder')}
                      />
                    </div>
                  </div>
                </div>

                {/* Agency Details */}
                <fieldset disabled={isTeamEditor} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="fb-card">
                  <h3 className="fb-card-title">
                    <Building size={16} style={{ color: '#00CCA0' }} />
                    {t('profile.agencyInfo')}
                  </h3>
                  <div className="fb-form-grid">
                    <div className="fb-form-group fb-form-full">
                      <label className="fb-form-label">{t('profile.registeredCompanyName')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.agency_name}
                        disabled
                      />
                      <span className="fb-form-hint">{t('profile.companyNameChanges')}</span>
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.tradingName')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.trading_name}
                        onChange={e => setFormData(p => ({...p, trading_name: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.website')}</label>
                      <input
                        className="fb-form-input"
                        type="url"
                        value={formData.website}
                        onChange={e => setFormData(p => ({...p, website: e.target.value}))}
                        placeholder={t('profile.websitePlaceholder')}
                      />
                    </div>
                    <div className="fb-form-group fb-form-full">
                      <label className="fb-form-label">{t('profile.officeAddress')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.office_address}
                        onChange={e => setFormData(p => ({...p, office_address: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('common.country')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.office_country}
                        onChange={e => setFormData(p => ({...p, office_country: e.target.value}))}
                      />
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('common.city')}</label>
                      <input
                        className="fb-form-input"
                        value={formData.office_city}
                        onChange={e => setFormData(p => ({...p, office_city: e.target.value}))}
                      />
                    </div>
                  </div>
                </div>
                </fieldset>
              </div>

              {/* Full Width Sections */}
              <div className="fb-full-width-sections" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Professional Details Section */}
                <fieldset disabled={isTeamEditor} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="fb-card">
                  <h3 className="fb-card-title">
                    <Briefcase size={16} style={{ color: '#0ea5e9' }} />
                    {t('profile.professionalDetails')}
                  </h3>
                  <div className="fb-form-grid">
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.foundedYear')}</label>
                      <div className="fb-input-with-status" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="fb-form-input"
                          style={{ borderColor: saveStatus['founded_year'] === 'error' ? '#ef4444' : undefined, paddingRight: '30px' }}
                          type="number"
                          placeholder="e.g. 2010"
                          value={formData.founded_year}
                          onChange={e => setFormData(p => ({...p, founded_year: e.target.value}))}
                          onBlur={e => handleFieldBlur('founded_year', e.target.value)}
                        />
                        <div style={{ position: 'absolute', right: '10px', display: 'flex' }}>
                          {saveStatus['founded_year'] === 'saving' && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                          {saveStatus['founded_year'] === 'saved' && <CheckCircle2 size={16} color="#10b981" />}
                          {saveStatus['founded_year'] === 'error' && <AlertTriangle size={16} color="#ef4444" />}
                        </div>
                      </div>
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.numberOfEmployees')}</label>
                      <div className="fb-input-with-status" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="fb-form-input"
                          style={{ paddingRight: '30px' }}
                          placeholder="e.g. 10-50"
                          value={formData.number_of_employees}
                          onChange={e => setFormData(p => ({...p, number_of_employees: e.target.value}))}
                          onBlur={e => handleFieldBlur('number_of_employees', e.target.value)}
                        />
                        <div style={{ position: 'absolute', right: '10px', display: 'flex' }}>
                          {saveStatus['number_of_employees'] === 'saving' && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                          {saveStatus['number_of_employees'] === 'saved' && <CheckCircle2 size={16} color="#10b981" />}
                        </div>
                      </div>
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.primaryMarket')}</label>
                      <div className="fb-input-with-status" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="fb-form-input"
                          style={{ paddingRight: '30px' }}
                          placeholder="e.g. India, Nigeria"
                          value={formData.primary_market}
                          onChange={e => setFormData(p => ({...p, primary_market: e.target.value}))}
                          onBlur={e => handleFieldBlur('primary_market', e.target.value)}
                        />
                        <div style={{ position: 'absolute', right: '10px', display: 'flex' }}>
                          {saveStatus['primary_market'] === 'saving' && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                          {saveStatus['primary_market'] === 'saved' && <CheckCircle2 size={16} color="#10b981" />}
                        </div>
                      </div>
                    </div>
                    <div className="fb-form-group">
                      <label className="fb-form-label">{t('profile.languagesSpoken')}</label>
                      <div className="fb-input-with-status" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="fb-form-input"
                          style={{ paddingRight: '30px' }}
                          placeholder="e.g. English, French, Hindi"
                          value={formData.languages_spoken}
                          onChange={e => setFormData(p => ({...p, languages_spoken: e.target.value}))}
                          onBlur={e => handleFieldBlur('languages_spoken', e.target.value)}
                        />
                        <div style={{ position: 'absolute', right: '10px', display: 'flex' }}>
                          {saveStatus['languages_spoken'] === 'saving' && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                          {saveStatus['languages_spoken'] === 'saved' && <CheckCircle2 size={16} color="#10b981" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </fieldset>

                {/* Social Media Section */}
                <fieldset disabled={isTeamEditor} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="fb-card">
                  <h3 className="fb-card-title">
                    <Globe size={16} style={{ color: '#8b5cf6' }} />
                    {t('profile.socialMediaLinks')}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 'auto' }}>
                      Auto-saves when you click away
                    </span>
                  </h3>
                  <div className="fb-form-grid">
                    {[
                      { id: 'facebook_url', label: t('profile.social.facebookUrl'), icon: <Facebook size={16} />, placeholder: 'https://facebook.com/yourpage' },
                      { id: 'twitter_url', label: t('profile.social.twitterUrl'), icon: <Twitter size={16} />, placeholder: 'https://x.com/yourhandle' },
                      { id: 'linkedin_url', label: t('profile.social.linkedinUrl'), icon: <Linkedin size={16} />, placeholder: 'https://linkedin.com/company/yourpage' },
                      { id: 'instagram_url', label: t('profile.social.instagramUrl'), icon: <Instagram size={16} />, placeholder: 'https://instagram.com/yourhandle' },
                      { id: 'youtube_url', label: t('profile.social.youtubeUrl'), icon: <Youtube size={16} />, placeholder: 'https://youtube.com/c/yourchannel' },
                      { id: 'tiktok_url', label: t('profile.social.tiktokUrl'), icon: <LinkIcon size={16} />, placeholder: 'https://tiktok.com/@yourhandle' },
                      { id: 'whatsapp_number', label: t('profile.social.whatsappNumber'), icon: <MessageCircle size={16} />, placeholder: '+1234567890' },
                      { id: 'telegram_id', label: t('profile.social.telegramId'), icon: <Navigation size={16} />, placeholder: 'https://t.me/yourusername' },
                      { id: 'skype_id', label: t('profile.social.skypeId'), icon: <MessageCircle size={16} />, placeholder: 'live:yourusername' },
                    ].map(social => (
                      <div className="fb-form-group" key={social.id}>
                        <label className="fb-form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#64748b' }}>{social.icon}</span>
                          {social.label}
                        </label>
                        <div className="fb-input-with-status" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            className="fb-form-input"
                            style={{ paddingRight: '30px', borderColor: saveStatus[social.id] === 'error' ? '#ef4444' : undefined }}
                            type="text"
                            placeholder={social.placeholder}
                            value={(formData as any)[social.id]}
                            onChange={e => setFormData(p => ({...p, [social.id]: e.target.value}))}
                            onBlur={e => handleFieldBlur(social.id as any, e.target.value)}
                          />
                          <div style={{ position: 'absolute', right: '10px', display: 'flex' }}>
                            {saveStatus[social.id] === 'saving' && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                            {saveStatus[social.id] === 'saved' && <CheckCircle2 size={18} color="#10b981" />}
                            {saveStatus[social.id] === 'error' && <AlertTriangle size={18} color="#ef4444" />}
                          </div>
                        </div>
                        {saveStatus[social.id] === 'error' && (
                          <span style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '4px' }}>Invalid URL or format.</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                </fieldset>

              </div>

              {/* Partner Universities Full Width Section - Bottom */}
              <div className="fb-partners-section">
                <div className="fb-card">
                  <div className="fb-partners-header">
                    <h3 className="fb-card-title">
                      <GraduationCap size={20} style={{ color: 'var(--color-primary)' }} />
                      {t('dashboard.myPartners') || 'Partner Universities'}
                      <span className="fb-partner-count-badge">{partnerUniversities.length}</span>
                    </h3>
                    <button
                      className="fb-btn fb-btn-outline"
                      onClick={() => navigate('/dashboard/courses')}
                    >
                      {t('dashboard.viewCourses') || 'View Courses'}
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  {partnerUniversities.length > 0 ? (
                    <div className="fb-partners-grid">
                      {partnerUniversities.map((university: any) => (
                        <div
                          key={university.id}
                          className="fb-partner-card"
                          onClick={() => navigate(`/dashboard/university/${university.slug || university.id}`)}
                        >
                          <div className="fb-partner-card-logo">
                            {university.logo_url ? (
                              <img src={university.logo_url} alt={university.name} />
                            ) : (
                              <div className="fb-partner-logo-placeholder">
                                <GraduationCap size={32} />
                              </div>
                            )}
                          </div>
                          <div className="fb-partner-card-content">
                            <h4 className="fb-partner-card-name">{university.name}</h4>
                            <div className="fb-partner-card-meta">
                              <span className="fb-partner-card-country">
                                <MapPin size={12} />
                                {university.country}
                              </span>
                              {university.city && (
                                <span className="fb-partner-card-city">{university.city}</span>
                              )}
                            </div>
                            {university.programs && university.programs.length > 0 && (
                              <div className="fb-partner-card-programs">
                                <span className="fb-partner-programs-count">
                                  {university.programs.length} {university.programs.length === 1 ? 'Program' : 'Programs'} Available
                                </span>
                              </div>
                            )}
                            {university.about && (
                              <p className="fb-partner-card-about">
                                {university.about.length > 120
                                  ? `${university.about.substring(0, 120)}...`
                                  : university.about}
                              </p>
                            )}
                          </div>
                          <div className="fb-partner-card-arrow">
                            <ExternalLink size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="fb-partners-empty">
                      <GraduationCap size={48} style={{ opacity: 0.3 }} />
                      <p>No partner universities yet</p>
                      <p className="fb-empty-hint">Complete your registration to see partner institutions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab — Enterprise */}
        {activeTab === 'security' && (
          <div className="fb-security-content">
            {/* Security Score */}
            <div className="fb-security-score">
              <div className="fb-score-circle">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle className="fb-score-circle-bg" cx="32" cy="32" r="28" fill="none" strokeWidth="6" />
                  <circle className="fb-score-circle-fill" cx="32" cy="32" r="28" fill="none" strokeWidth="6"
                    stroke={getScoreLabel(securityScore).color}
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - securityScore / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="fb-score-value">{securityScore}</div>
              </div>
              <div className="fb-score-info">
                <h4>{t('profile.security.securityScore')}: <span style={{ color: getScoreLabel(securityScore).color }}>{t(`profile.security.${getScoreLabel(securityScore).key}`)}</span></h4>
                <p>{twoFactorEnabled ? t('profile.security.twoFactor.enabled') : t('profile.security.twoFactor.subtitle')}</p>
              </div>
            </div>

            <div className="fb-security-grid">
              {/* Password Update — Enhanced */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Lock size={24} /></div>
                  <div><h3>{t('profile.security.password.title')}</h3><p>{t('profile.security.password.requirements')}</p></div>
                </div>
                <div className="fb-form-stack">
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.current')}</label>
                    <div className="fb-password-input">
                      <input className="fb-form-input" type={showPasswords.current ? 'text' : 'password'} value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))}>
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.new')}</label>
                    <div className="fb-password-input">
                      <input className="fb-form-input" type={showPasswords.new ? 'text' : 'password'} value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({...p, newPassword: e.target.value}))} />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))}>
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Password Strength Meter */}
                    {passwordForm.newPassword && (
                      <div className="fb-password-strength">
                        <div className="fb-strength-bar-track">
                          <div className="fb-strength-bar-fill" style={{ width: `${passwordStrength.percent}%`, background: passwordStrength.color }} />
                        </div>
                        <div className="fb-strength-label">
                          <span>{t('profile.security.password.strength.label')}</span>
                          <span style={{ color: passwordStrength.color }}>{t(`profile.security.password.strength.${passwordStrength.level}`)}</span>
                        </div>
                        <div className="fb-password-rules">
                          {Object.entries(passwordStrength.rules).map(([key, met]) => (
                            <div key={key} className={`fb-rule-item ${met ? 'met' : ''}`}>
                              {met ? <Check size={12} /> : <X size={12} />}
                              <span>{t(`profile.security.password.rules.${key}`)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.confirm')}</label>
                    <div className="fb-password-input">
                      <input className="fb-form-input" type={showPasswords.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, confirm: !p.confirm}))}>
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button className="fb-btn fb-btn-primary" onClick={handlePasswordUpdate}
                  disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>
                  {passwordLoading ? <span className="spinner" /> : <Lock size={16} />}
                  {t('profile.security.password.update')}
                </button>
              </div>

              {/* Two-Factor Authentication — Real TOTP */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: twoFactorEnabled ? '#f0fdf4' : '#fef3c7', color: twoFactorEnabled ? '#10b981' : '#f59e0b' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div className="fb-security-info">
                    <h3>{t('profile.security.twoFactor.title')}</h3>
                    <p>{t('profile.security.twoFactor.subtitle')}</p>
                  </div>
                  <div className="fb-security-badge" style={{ background: twoFactorEnabled ? '#f0fdf4' : '#fef3c7', color: twoFactorEnabled ? '#10b981' : '#f59e0b' }}>
                    {twoFactorEnabled ? t('profile.security.twoFactor.enabled') : t('profile.security.twoFactor.disabled')}
                  </div>
                </div>

                {!show2FASetup && !twoFactorEnabled && (
                  <button className="fb-btn fb-btn-primary" onClick={handleStartMfaEnroll} disabled={mfaLoading}>
                    {mfaLoading ? <span className="spinner" /> : <ShieldCheck size={16} />}
                    {t('profile.security.twoFactor.enable')}
                  </button>
                )}

                {!show2FASetup && twoFactorEnabled && (
                  <button className="fb-btn fb-btn-outline" onClick={handleMfaDisable} disabled={mfaLoading} style={{ color: '#ef4444', borderColor: '#fecaca' }}>
                    {mfaLoading ? <span className="spinner" /> : <ShieldAlert size={16} />}
                    {t('profile.security.twoFactor.disable')}
                  </button>
                )}

                {show2FASetup && (
                  <div className="fb-2fa-wizard">
                    {/* Step Indicator */}
                    <div className="fb-2fa-step-indicator">
                      {[1, 2, 3].map((step, i) => (
                        <>
                          <div key={step} className={`fb-2fa-step ${mfaStep === step ? 'active' : ''} ${mfaStep > step ? 'completed' : ''}`}>
                            <div className="fb-2fa-step-num">{mfaStep > step ? <Check size={14} /> : step}</div>
                            <span className="fb-2fa-step-label">{t(`profile.security.twoFactor.step${step}`)}</span>
                          </div>
                          {i < 2 && <div className={`fb-2fa-step-line ${mfaStep > step ? 'completed' : ''}`} />}
                        </>
                      ))}
                    </div>

                    {/* Step 1: QR Code */}
                    {mfaStep === 1 && (
                      <div className="fb-qr-section">
                        <p style={{ fontSize: '0.85rem', color: '#65676b', textAlign: 'center', margin: 0 }}>
                          {t('profile.security.twoFactor.scanInstructions')}
                        </p>
                        <div className="fb-qr-container">
                          {mfaQrCode ? (
                            <img src={mfaQrCode} alt="2FA QR Code" />
                          ) : (
                            <span className="spinner" />
                          )}
                        </div>
                        {mfaSecret && (
                          <div className="fb-manual-code">
                            <span>{mfaSecret}</span>
                            <button onClick={() => { navigator.clipboard.writeText(mfaSecret); toast.success(t('profile.security.twoFactor.copiedCode')) }}>
                              <Copy size={14} />
                            </button>
                          </div>
                        )}
                        <button className="fb-btn fb-btn-primary" onClick={() => setMfaStep(2)}>
                          {t('common.next')} →
                        </button>
                      </div>
                    )}

                    {/* Step 2: Verify Code */}
                    {mfaStep === 2 && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: '#65676b', margin: '0 0 0.5rem' }}>
                          {t('profile.security.twoFactor.enterCodeDesc')}
                        </p>
                        <div className="fb-otp-group" onPaste={handleOtpPaste}>
                          {mfaVerifyCode.map((digit, i) => (
                            <input key={i} ref={el => { otpRefs.current[i] = el }}
                              className="fb-otp-input" type="text" inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)} />
                          ))}
                        </div>
                        <div className="fb-btn-group" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                          <button className="fb-btn fb-btn-outline" onClick={() => setMfaStep(1)}>
                            ← {t('common.back')}
                          </button>
                          <button className="fb-btn fb-btn-primary" onClick={handleMfaVerifyAndEnable}
                            disabled={mfaVerifyCode.join('').length !== 6 || mfaLoading}>
                            {mfaLoading ? <span className="spinner" /> : <ShieldCheck size={16} />}
                            {t('profile.security.twoFactor.verify')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Done */}
                    {mfaStep === 3 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                          <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                        </div>
                        <h4 style={{ margin: '0 0 0.5rem', color: '#1c1e21' }}>{t('profile.security.twoFactor.success')}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#65676b' }}>{t('profile.security.twoFactor.backupWarning')}</p>
                        <button className="fb-btn fb-btn-primary" onClick={() => { setShow2FASetup(false); setMfaStep(1); setMfaVerifyCode(['', '', '', '', '', '']) }}>
                          {t('common.done')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Passkeys & Security Keys */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: passkeys.length ? '#eef2ff' : '#f8fafc', color: passkeys.length ? '#4f46e5' : '#64748b' }}>
                    <Fingerprint size={24} />
                  </div>
                  <div className="fb-security-info">
                    <h3>{t('profile.security.passkeys.title')}</h3>
                    <p>{t('profile.security.passkeys.subtitle')}</p>
                  </div>
                  {passkeys.length > 0 && (
                    <div className="fb-security-badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      {t('profile.security.passkeys.active', { count: passkeys.length })}
                    </div>
                  )}
                </div>

                {passkeysLoading ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}><span className="spinner" /></div>
                ) : passkeys.length === 0 ? (
                  <div className="fb-no-devices">
                    <Fingerprint size={32} />
                    <p>{t('profile.security.passkeys.empty')}</p>
                  </div>
                ) : (
                  <div className="fb-device-list">
                    {passkeys.map(passkey => (
                      <div key={passkey.id} className="fb-device-card">
                        <div className="fb-device-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}><Key size={20} /></div>
                        <div className="fb-device-info">
                          <div className="fb-device-name">
                            {passkey.key_name}
                            {passkey.backed_up && <span className="fb-trusted-badge">{t('profile.security.passkeys.synced')}</span>}
                          </div>
                          <div className="fb-device-details">
                            <span className="fb-device-detail">{t('profile.security.passkeys.added', { date: new Date(passkey.created_at).toLocaleDateString() })}</span>
                            {passkey.last_used_at && (
                              <span className="fb-device-detail">{t('profile.security.passkeys.lastUsed', { date: new Date(passkey.last_used_at).toLocaleDateString() })}</span>
                            )}
                          </div>
                        </div>
                        <button className="fb-device-btn fb-device-btn-revoke" onClick={() => handleRemovePasskey(passkey.id)} disabled={passkeyLoading} aria-label={`${t('profile.security.passkeys.remove')} ${passkey.key_name}`}>
                          <Trash2 size={12} /> {t('profile.security.passkeys.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form className="fb-passkey-form" onSubmit={event => { event.preventDefault(); handleAddPasskey() }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="agent-passkey-name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#65676b', marginBottom: '0.35rem' }}>
                      {t('profile.security.passkeys.nameLabel')}
                    </label>
                    <input id="agent-passkey-name" className="fb-form-input" value={passkeyName} onChange={event => setPasskeyName(event.target.value)} placeholder={t('profile.security.passkeys.namePlaceholder')} maxLength={80} disabled={passkeyLoading} />
                  </div>
                  <button type="submit" className="fb-btn fb-btn-primary" disabled={passkeyLoading}>
                    {passkeyLoading ? <span className="spinner" /> : <Plus size={16} />}
                    {passkeyLoading ? t('profile.security.passkeys.adding') : t('profile.security.passkeys.add')}
                  </button>
                </form>
                <div className="fb-security-note"><Info size={16} /><p>{t('profile.security.passkeys.note')}</p></div>
              </div>

              {/* Recovery Codes */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: recoveryRemaining ? '#f0fdf4' : '#fffbeb', color: recoveryRemaining ? '#10b981' : '#f59e0b' }}><Key size={24} /></div>
                  <div className="fb-security-info">
                    <h3>{t('profile.security.recovery.title')}</h3>
                    <p>{t('profile.security.recovery.subtitle')}</p>
                  </div>
                  <div className="fb-security-badge" style={{ background: recoveryRemaining ? '#f0fdf4' : '#fffbeb', color: recoveryRemaining ? '#10b981' : '#f59e0b' }}>
                    {recoveryGeneratedAt ? t('profile.security.recovery.remaining', { count: recoveryRemaining }) : t('profile.security.recovery.notGenerated')}
                  </div>
                </div>
                <p className="fb-modal-message">{t('profile.security.recovery.warning')}</p>
                <button className="fb-btn fb-btn-outline" onClick={handleGenerateRecoveryCodes} disabled={recoveryLoading}>
                  {recoveryLoading ? <span className="spinner" /> : <Key size={16} />}
                  {recoveryGeneratedAt ? t('profile.security.recovery.regenerate') : t('profile.security.recovery.generate')}
                </button>
              </div>

              {/* Device Management */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#f0fdf4', color: '#10b981' }}><Monitor size={24} /></div>
                  <div style={{ flex: 1 }}>
                    <h3>{t('profile.security.devices.title')}</h3>
                    <p>{t('profile.security.devices.subtitle')}</p>
                  </div>
                  {devices.filter(d => !d.is_current).length > 0 && (
                    <button className="fb-btn fb-btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={handleRevokeAllDevices}>
                      {t('profile.security.devices.revokeAll')}
                    </button>
                  )}
                </div>
                <div className="fb-device-list">
                  {devicesLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
                  ) : devices.length === 0 ? (
                    <div className="fb-no-devices">
                      <Monitor size={32} />
                      <p>{t('profile.security.devices.noDevices')}</p>
                    </div>
                  ) : (
                    devices.map(device => (
                      <div key={device.id} className={`fb-device-card ${device.is_current ? 'current' : ''}`}>
                        <div className="fb-device-icon" style={{ background: device.is_current ? '#f0fdf4' : '#f8fafc', color: device.is_current ? '#10b981' : '#65676b' }}>
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <div className="fb-device-info">
                          <div className="fb-device-name">
                            {device.device_name || t(`profile.security.devices.${device.device_type}`)}
                            {device.is_current && <span className="fb-current-badge">{t('profile.security.devices.currentDevice')}</span>}
                            {device.is_trusted && <span className="fb-trusted-badge">{t('profile.security.devices.trusted')}</span>}
                          </div>
                          <div className="fb-device-details">
                            {device.browser && <span className="fb-device-detail">{device.browser}</span>}
                            {device.browser && device.os && <span className="fb-device-detail-sep" />}
                            {device.os && <span className="fb-device-detail">{device.os}</span>}
                            <span className="fb-device-detail-sep" />
                            <span className="fb-device-detail"><Clock size={10} /> {formatTimeAgo(device.last_active_at)}</span>
                          </div>
                        </div>
                        {!device.is_current && (
                          <div className="fb-device-actions">
                            <button className="fb-device-btn fb-device-btn-trust" onClick={() => handleToggleTrust(device.id, device.is_trusted)}>
                              <Shield size={12} />
                              {device.is_trusted ? t('profile.security.devices.untrustDevice') : t('profile.security.devices.trustDevice')}
                            </button>
                            <button className="fb-device-btn fb-device-btn-revoke" onClick={() => handleRevokeDevice(device.id)}>
                              <X size={12} />
                              {t('profile.security.devices.revoke')}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Security Settings */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><Shield size={24} /></div>
                  <div><h3>{t('profile.security.settings.title')}</h3><p>{t('profile.security.settings.subtitle')}</p></div>
                </div>
                <div className="fb-security-settings-list">
                  <div className="fb-setting-row">
                    <div className="fb-setting-info">
                      <h4>{t('profile.security.settings.loginNotifications')}</h4>
                      <p>{t('profile.security.settings.loginNotificationsDesc')}</p>
                    </div>
                    <label className="fb-toggle">
                      <input type="checkbox" checked={securitySettings.login_notifications}
                        onChange={e => handleSecuritySettingChange('login_notifications', e.target.checked)} />
                      <span className="fb-toggle-slider" />
                    </label>
                  </div>
                  <div className="fb-setting-row">
                    <div className="fb-setting-info">
                      <h4>{t('profile.security.settings.newDeviceAlerts')}</h4>
                      <p>{t('profile.security.settings.newDeviceAlertsDesc')}</p>
                    </div>
                    <label className="fb-toggle">
                      <input type="checkbox" checked={securitySettings.new_device_alerts}
                        onChange={e => handleSecuritySettingChange('new_device_alerts', e.target.checked)} />
                      <span className="fb-toggle-slider" />
                    </label>
                  </div>
                  <div className="fb-setting-row">
                    <div className="fb-setting-info">
                      <h4>{t('profile.security.settings.sessionTimeout')}</h4>
                      <p>{t('profile.security.settings.sessionTimeoutDesc')}</p>
                    </div>
                    <select className="fb-select-mini" value={securitySettings.session_timeout_minutes}
                      onChange={e => handleSecuritySettingChange('session_timeout_minutes', parseInt(e.target.value))}>
                      <option value={60}>{t('profile.security.settings.timeoutOptions.1h')}</option>
                      <option value={360}>{t('profile.security.settings.timeoutOptions.6h')}</option>
                      <option value={720}>{t('profile.security.settings.timeoutOptions.12h')}</option>
                      <option value={1440}>{t('profile.security.settings.timeoutOptions.24h')}</option>
                      <option value={10080}>{t('profile.security.settings.timeoutOptions.7d')}</option>
                    </select>
                  </div>
                  <div className="fb-setting-row">
                    <div className="fb-setting-info">
                      <h4>{t('profile.security.settings.require2fa')}</h4>
                      <p>{t('profile.security.settings.require2faDesc')}</p>
                    </div>
                    <label className="fb-toggle">
                      <input type="checkbox" checked={securitySettings.require_2fa_for_sensitive}
                        onChange={e => handleSecuritySettingChange('require_2fa_for_sensitive', e.target.checked)} />
                      <span className="fb-toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Security Audit Log */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#f0f2f5', color: '#65676b' }}><Activity size={24} /></div>
                  <div><h3>{t('profile.security.auditLog.title')}</h3><p>{t('profile.security.auditLog.subtitle')}</p></div>
                </div>
                <div className="fb-audit-timeline">
                  {auditLogLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
                  ) : auditLog.length === 0 ? (
                    <div className="fb-no-devices">
                      <Activity size={32} />
                      <p>{t('profile.security.auditLog.noEvents')}</p>
                    </div>
                  ) : (
                    auditLog.map(event => {
                      const style = getAuditIcon(event.action)
                      return (
                        <div key={event.id} className="fb-audit-item">
                          <div className="fb-audit-icon" style={{ background: style.bg, color: style.color }}>
                            <style.Icon size={16} />
                          </div>
                          <div className="fb-audit-content">
                            <div className="fb-audit-action">
                              {t(`profile.security.auditLog.actions.${event.action}`) || event.action}
                            </div>
                            <div className="fb-audit-meta">
                              {event.device_info && <span>{event.device_info}</span>}
                              {event.device_info && <span className="fb-audit-meta-sep" />}
                              <span>{formatTimeAgo(event.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                {auditLog.length >= auditLogLimit && (
                  <button className="fb-btn fb-btn-outline" style={{ marginTop: '0.75rem', width: '100%' }}
                    onClick={() => { setAuditLogLimit(l => l + 10); fetchAuditLog() }}>
                    {t('profile.security.auditLog.loadMore')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Tab — Enhanced */}
        {activeTab === 'account' && (
          <div className="fb-account-content">
            {/* Account Overview */}
            <div className="fb-card" style={{ marginBottom: '1rem' }}>
              <div className="fb-security-header">
                <div className="fb-security-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><UserIcon size={24} /></div>
                <div><h3>{t('profile.account.overview.title')}</h3></div>
              </div>
              <div className="fb-account-overview">
                <div className="fb-account-overview-item">
                  <label>{t('profile.account.overview.accountId')}</label>
                  <span>{user?.id?.slice(0, 8)}...</span>
                </div>
                <div className="fb-account-overview-item">
                  <label>{t('profile.account.overview.email')}</label>
                  <span>{user?.email}</span>
                </div>
                <div className="fb-account-overview-item">
                  <label>{t('profile.account.overview.memberSince')}</label>
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
                </div>
                <div className="fb-account-overview-item">
                  <label>{t('profile.account.overview.accountStatus')}</label>
                  <span className="fb-status-active">{t('profile.account.overview.statusActive')}</span>
                </div>
              </div>
              {/* Email change */}
              {!showEmailChange ? (
                <button className="fb-btn fb-btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setShowEmailChange(true)}>
                  <Mail size={14} /> {t('profile.account.overview.changeEmail')}
                </button>
              ) : (
                <div className="fb-email-change">
                  <input className="fb-form-input" type="email" value={newEmail} placeholder={t('profile.account.overview.newEmail')}
                    onChange={e => setNewEmail(e.target.value)} />
                  <button className="fb-btn fb-btn-primary" onClick={handleEmailChange} disabled={!newEmail || emailLoading} style={{ whiteSpace: 'nowrap' }}>
                    {emailLoading ? <span className="spinner" /> : t('profile.account.overview.updateEmail')}
                  </button>
                  <button className="fb-btn fb-btn-outline" onClick={() => { setShowEmailChange(false); setNewEmail('') }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Export Data */}
            <div className="fb-card fb-export-card" style={{ marginBottom: '1rem', borderRadius: '12px' }}>
              <div className="fb-account-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <Download size={24} />
              </div>
              <div className="fb-account-info" style={{ flex: 1 }}>
                <h3>{t('profile.account.export.title')}</h3>
                <p>{t('profile.account.export.description')}</p>
              </div>
              <button className="fb-btn fb-btn-outline" onClick={handleExportData} disabled={dataExporting}>
                {dataExporting ? <span className="spinner" /> : <Download size={16} />}
                {dataExporting ? t('profile.account.export.downloading') : t('profile.account.export.button')}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="fb-danger-zone">
              <h2 className="fb-danger-title">
                <AlertTriangle size={20} />
                {t('profile.account.dangerZone')}
              </h2>
              <div className="fb-account-cards">
                {/* Logout */}
                <div className="fb-card fb-account-card">
                  <div className="fb-account-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><LogOut size={24} /></div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.logout.title')}</h3>
                    <p>{t('profile.account.logout.description')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutModal(true)}>
                      {t('profile.account.logout.button')}
                    </button>
                    <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutAllModal(true)} style={{ fontSize: '0.75rem' }}>
                      {t('profile.account.logout.allDevices')}
                    </button>
                  </div>
                </div>

                {/* Delete All Data */}
                <div className="fb-card fb-account-card fb-warning">
                  <div className="fb-account-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><Trash2 size={24} /></div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.deleteAllData.title')}</h3>
                    <p>{t('profile.account.deleteAllData.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-warning" onClick={() => setShowDeleteAllDataModal(true)}>
                    {t('profile.account.deleteAllData.button')}
                  </button>
                </div>

                {/* Deactivate Account */}
                <div className="fb-card fb-account-card fb-warning">
                  <div className="fb-account-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><UserX size={24} /></div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.closeAccount.title')}</h3>
                    <p>{t('profile.account.closeAccount.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-danger-outline" onClick={() => setShowCloseAccountModal(true)}>
                    {t('profile.account.closeAccount.button')}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="fb-card fb-account-card fb-danger">
                  <div className="fb-account-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Trash2 size={24} /></div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.deleteAccount.title')}</h3>
                    <p>{t('profile.account.deleteAccount.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-danger" onClick={() => setShowDeleteModal(true)}>
                    {t('profile.account.deleteAccount.button')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      {showRecoveryCodes && (
        <div className="fb-modal-overlay" onClick={() => setShowRecoveryCodes(false)}>
          <div className="fb-modal fb-recovery-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-codes-title" onClick={event => event.stopPropagation()}>
            <div className="fb-modal-header">
              <Key size={24} style={{ color: '#4f46e5' }} />
              <div style={{ flex: 1 }}>
                <h3 id="recovery-codes-title">{t('profile.security.recovery.modalTitle')}</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#65676b' }}>{t('profile.security.recovery.modalDescription')}</p>
              </div>
              <button className="fb-device-btn" onClick={() => setShowRecoveryCodes(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="fb-code-grid">
              {recoveryCodes.map((code, index) => <code className="fb-backup-code" key={code}>{String(index + 1).padStart(2, '0')}. {code}</code>)}
            </div>
            <div className="fb-security-note warning"><ShieldAlert size={18} /><p>{t('profile.security.recovery.showOnce')}</p></div>
            <div className="fb-btn-group">
              <button className="fb-btn fb-btn-outline" onClick={downloadRecoveryCodes}><Download size={16} />{t('profile.security.recovery.download')}</button>
              <button className="fb-btn fb-btn-outline" onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => toast.success(t('profile.security.recovery.copied'))).catch(() => toast.error(t('profile.security.recovery.error')))}><Copy size={16} />{t('profile.security.recovery.copy')}</button>
              <button className="fb-btn fb-btn-primary" onClick={() => setShowRecoveryCodes(false)}><Check size={16} />{t('common.done')}</button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fb-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header"><LogOut size={24} style={{ color: '#3b82f6' }} /><h3>{t('profile.account.logout.confirmTitle')}</h3></div>
            <p className="fb-modal-message">{t('profile.account.logout.confirmMessage')}</p>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutModal(false)}>{t('common.cancel')}</button>
              <button className="fb-btn fb-btn-primary" onClick={handleLogout}>{t('profile.account.logout.button')}</button>
            </div>
          </div>
        </div>
      )}

      {showLogoutAllModal && (
        <div className="fb-modal-overlay" onClick={() => setShowLogoutAllModal(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header"><LogOut size={24} style={{ color: '#ef4444' }} /><h3>{t('profile.account.logout.allDevices')}</h3></div>
            <p className="fb-modal-message">{t('profile.account.logout.allDevicesConfirm')}</p>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutAllModal(false)}>{t('common.cancel')}</button>
              <button className="fb-btn fb-btn-danger" onClick={handleLogoutAll} disabled={accountLoading}>
                {accountLoading ? <span className="spinner" /> : <LogOut size={16} />}
                {t('profile.account.logout.allDevices')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseAccountModal && (
        <div className="fb-modal-overlay" onClick={() => setShowCloseAccountModal(false)}>
          <div className="fb-modal fb-modal-warning" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header"><UserX size={24} style={{ color: '#ef4444' }} /><h3>{t('profile.account.closeAccount.confirmTitle')}</h3></div>
            <p className="fb-modal-message">{t('profile.account.closeAccount.confirmMessage')}</p>
            <div className="fb-reactivate-info">
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>{t('profile.account.closeAccount.reactivateInfo')}</span>
            </div>
            <textarea className="fb-deactivate-reason" value={closeAccountReason} onChange={e => setCloseAccountReason(e.target.value)}
              placeholder={t('profile.account.closeAccount.reasonPlaceholder')} />
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => setShowCloseAccountModal(false)}>{t('common.cancel')}</button>
              <button className="fb-btn fb-btn-danger" onClick={handleCloseAccount} disabled={accountLoading}>
                {accountLoading ? <span className="spinner" /> : <UserX size={16} />}
                {t('profile.account.closeAccount.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllDataModal && (
        <div className="fb-modal-overlay" onClick={() => setShowDeleteAllDataModal(false)}>
          <div className="fb-modal fb-modal-warning" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header"><AlertTriangle size={24} style={{ color: '#f59e0b' }} /><h3>{t('profile.account.deleteAllData.confirmTitle')}</h3></div>
            <p className="fb-modal-message">{t('profile.account.deleteAllData.confirmMessage')}</p>
            {deleteProgress.length > 0 && (
              <div className="fb-delete-progress">
                {['applications', 'students', 'partners', 'complete'].map(step => (
                  <div key={step} className={`fb-delete-progress-item ${deleteProgress.includes(step) ? (step === deleteProgress[deleteProgress.length - 1] ? 'active' : 'done') : ''}`}>
                    {deleteProgress.includes(step) ? (step === 'complete' ? <CheckCircle2 size={14} /> : <RefreshCw size={14} className="spinner" />) : <span style={{ width: 14 }} />}
                    {t(`profile.account.deleteAllData.progress.${step}`)}
                  </div>
                ))}
              </div>
            )}
            <label className="fb-checkbox-confirm">
              <input type="checkbox" checked={deleteAllDataConfirm} onChange={e => setDeleteAllDataConfirm(e.target.checked)} />
              <span>{t('profile.account.deleteAllData.title')}</span>
            </label>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => { setShowDeleteAllDataModal(false); setDeleteAllDataConfirm(false); setDeleteProgress([]) }}>{t('common.cancel')}</button>
              <button className="fb-btn fb-btn-warning" onClick={handleDeleteAllData} disabled={!deleteAllDataConfirm || accountLoading}>
                {accountLoading ? <span className="spinner" /> : <Trash2 size={16} />}
                {t('profile.account.deleteAllData.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fb-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="fb-modal fb-modal-danger" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header"><AlertTriangle size={24} style={{ color: '#ef4444' }} /><h3>{t('profile.account.deleteAccount.confirmTitle')}</h3></div>
            <p className="fb-modal-message">{t('profile.account.deleteAccount.confirmMessage')}</p>
            <div className="fb-form-group">
              <label className="fb-form-label">{t('profile.account.deleteAccount.finalWarning')}</label>
              <input className="fb-form-input" type="text" value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={t('profile.account.deleteAccount.placeholder')} />
            </div>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}>{t('common.cancel')}</button>
              <button className="fb-btn fb-btn-danger" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || accountLoading}>
                {accountLoading ? <span className="spinner" /> : <Trash2 size={16} />}
                {t('profile.account.deleteAccount.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocUploadModal && selectedDocReq && (
        <div className="fb-modal-overlay" onClick={() => setShowDocUploadModal(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}>
                  <Upload size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Upload Document</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{selectedDocReq.document_type}</p>
                </div>
              </div>
              <button onClick={() => setShowDocUploadModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="fb-form-group">
              <label className="fb-form-label">Select File (PDF, JPG, PNG)</label>
              <div 
                style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '12px', 
                  padding: '32px 24px', 
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => document.getElementById('docUploadInput')?.click()}
              >
                <input 
                  id="docUploadInput"
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  style={{ display: 'none' }}
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                />
                {docFile ? (
                  <div>
                    <FileText size={32} style={{ color: '#3b82f6', marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{docFile.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Click to browse files</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Maximum size: 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="fb-form-group">
              <label className="fb-form-label">Note to Contract Manager (Optional)</label>
              <textarea 
                className="fb-form-textarea" 
                rows={3} 
                placeholder="Add any extra details about this document..."
                value={docAgentNote}
                onChange={e => setDocAgentNote(e.target.value)}
              />
            </div>

            <div className="fb-modal-actions" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button className="fb-btn fb-btn-outline" onClick={() => setShowDocUploadModal(false)}>Cancel</button>
              <button 
                className="fb-btn fb-btn-primary" 
                onClick={handleDocUploadSubmit} 
                disabled={isUploadingDoc || !docFile}
              >
                {isUploadingDoc ? <span className="spinner" /> : <Check size={16} />}
                Submit Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Image Cropper Modals */}
      <ImageCropperModal
        isOpen={showAvatarCropper}
        onClose={() => setShowAvatarCropper(false)}
        aspectRatio={1}
        shape="round"
        title="Update Profile Picture"
        onSave={(file) => {
          setAvatarFile(file)
          setAvatarPreview(URL.createObjectURL(file))
        }}
      />
      
      <ImageCropperModal
        isOpen={showCoverCropper}
        onClose={() => setShowCoverCropper(false)}
        aspectRatio={3}
        shape="rect"
        title="Update Cover Photo"
        onSave={(file) => {
          setCoverFile(file)
          setCoverPreview(URL.createObjectURL(file))
        }}
      />
    </div>
  )
}
