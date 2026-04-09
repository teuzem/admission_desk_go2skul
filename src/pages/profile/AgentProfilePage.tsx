import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Camera, Save, User as UserIcon, Building, MapPin, Globe, Phone, Mail,
  Shield, Clock, Lock, Smartphone, LogOut, Trash2, AlertTriangle,
  X, Eye, EyeOff, Image as ImageIcon, Edit2, Plus, CheckCircle2,
  Users as UsersIcon, Link as LinkIcon, Copy, ExternalLink, GraduationCap,
  Facebook, Twitter, Linkedin, Instagram, Youtube, MessageCircle, Navigation, Briefcase
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getSecureUrl, uploadAvatar, uploadCoverImage } from '../../lib/storageHelpers'
import toast from 'react-hot-toast'
import ImageCropperModal from '../../components/ui/ImageCropperModal'
import '../dashboard/DashboardPages.css'
import './AgentProfilePage.css'

const KYC_STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string; icon: string }> = {
  pending: { labelKey: 'profile.kycStatus.pending', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  under_review: { labelKey: 'profile.kycStatus.under_review', color: '#3b82f6', bg: '#eff6ff', icon: '🔍' },
  approved: { labelKey: 'profile.kycStatus.approved', color: '#10b981', bg: '#f0fdf4', icon: '✅' },
  rejected: { labelKey: 'profile.kycStatus.rejected', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
}

type TabType = 'profile' | 'security' | 'account'

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

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteAllDataModal, setShowDeleteAllDataModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteAllDataConfirm, setDeleteAllDataConfirm] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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
  useEffect(() => {
    if (!user) return
    const effectiveTargetId = (profile as any)?.effective_agency_id || user.id

    const fetchProfileData = async () => {
      try {
        const [kycRes, appsRes, partnerSelectionsRes, teamRes] = await Promise.all([
          supabase.from('agent_kyc').select('*').eq('agent_id', effectiveTargetId).maybeSingle(),
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('agent_id', effectiveTargetId),
          supabase.from('agent_partner_selections')
            .select('*, universities(*, programs(*))')
            .eq('agent_id', effectiveTargetId),
          supabase.from('team_members')
            .select('*')
            .eq('agency_id', effectiveTargetId)
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

      } catch (error) {
        console.error('Error fetching profile data:', error)
      }
    }

    fetchProfileData()

    // Real-time subscription
    const channel = supabase
      .channel('profile-data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        refreshProfile?.()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_kyc', filter: `agent_id=eq.${effectiveTargetId}` }, fetchProfileData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `agency_id=eq.${effectiveTargetId}` }, fetchProfileData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, refreshProfile, (profile as any)?.effective_agency_id])

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

  // Update password
  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.security.password.mismatch'))
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error(t('errors.passwordMin'))
      return
    }

    setPasswordLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast.success(t('profile.security.password.success'))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.message || t('profile.security.password.error'))
    } finally {
      setPasswordLoading(false)
    }
  }

  // Toggle 2FA
  const handle2FAToggle = async () => {
    if (!twoFactorEnabled) {
      setShow2FASetup(true)
    } else {
      setTwoFactorEnabled(false)
      toast.success(t('profile.security.twoFactor.disabledSuccess'))
    }
  }

  // Confirm 2FA setup
  const handle2FAConfirm = () => {
    setTwoFactorEnabled(true)
    setShow2FASetup(false)
    toast.success(t('profile.security.twoFactor.success'))
  }

  // Logout
  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Delete all data
  const handleDeleteAllData = async () => {
    if (!deleteAllDataConfirm || !user) return

    setAccountLoading(true)

    try {
      await supabase.from('applications').delete().eq('agent_id', user.id)
      await supabase.from('students').delete().eq('agent_id', user.id)
      await supabase.from('agent_partner_selections').delete().eq('agent_id', user.id)

      setShowDeleteAllDataModal(false)
      setDeleteAllDataConfirm(false)
      setAppCount(0)
      toast.success(t('profile.account.deleteAllData.success') || 'All data deleted successfully')
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !user) return

    setAccountLoading(true)

    try {
      await supabase.from('applications').delete().eq('agent_id', user.id)
      await supabase.from('students').delete().eq('agent_id', user.id)
      await supabase.from('agent_partner_selections').delete().eq('agent_id', user.id)
      await supabase.from('agent_kyc').delete().eq('agent_id', user.id)
      await supabase.from('team_members').delete().eq('agency_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)

      const { error } = await supabase.auth.admin.deleteUser(user.id)

      if (error) {
        console.error('Auth delete error:', error)
      }

      setShowDeleteModal(false)
      toast.success('Account deleted successfully')

      setTimeout(() => {
        signOut()
        navigate('/login')
      }, 1500)
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setAccountLoading(false)
    }
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
                <h1 className="fb-profile-name">{displayName}</h1>
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

                {/* KYC Details */}
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
                      {kycData.business_licence_url && (
                        <button
                          type="button"
                          onClick={async () => {
                            const url = await getSecureUrl('kyc-documents', kycData.business_licence_url)
                            if (url) window.open(url, '_blank')
                          }}
                          className="fb-btn fb-btn-outline"
                        >
                          <Eye size={14} />
                          {t('profile.documents.viewDocument')}
                        </button>
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
                          onClick={() => navigate(`/dashboard/university/${university.id}`)}
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

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="fb-security-content">
            <div className="fb-security-grid">
              {/* Password Update */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3>{t('profile.security.password.title')}</h3>
                    <p>{t('profile.security.password.requirements')}</p>
                  </div>
                </div>
                <div className="fb-form-stack">
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.current')}</label>
                    <div className="fb-password-input">
                      <input
                        className="fb-form-input"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm(p => ({...p, currentPassword: e.target.value}))}
                      />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, current: !p.current}))}>
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.new')}</label>
                    <div className="fb-password-input">
                      <input
                        className="fb-form-input"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({...p, newPassword: e.target.value}))}
                      />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, new: !p.new}))}>
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="fb-form-group">
                    <label className="fb-form-label">{t('profile.security.password.confirm')}</label>
                    <div className="fb-password-input">
                      <input
                        className="fb-form-input"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))}
                      />
                      <button type="button" className="fb-password-toggle" onClick={() => setShowPasswords(p => ({...p, confirm: !p.confirm}))}>
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className="fb-btn fb-btn-primary"
                  onClick={handlePasswordUpdate}
                  disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                  {passwordLoading ? <span className="spinner" /> : <Lock size={16} />}
                  {t('profile.security.password.update')}
                </button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: twoFactorEnabled ? '#f0fdf4' : '#fef3c7', color: twoFactorEnabled ? '#10b981' : '#f59e0b' }}>
                    <Smartphone size={24} />
                  </div>
                  <div className="fb-security-info">
                    <h3>{t('profile.security.twoFactor.title')}</h3>
                    <p>{t('profile.security.twoFactor.subtitle')}</p>
                  </div>
                  <div className="fb-security-badge" style={{ background: twoFactorEnabled ? '#f0fdf4' : '#fef3c7', color: twoFactorEnabled ? '#10b981' : '#f59e0b' }}>
                    {twoFactorEnabled ? t('profile.security.twoFactor.enabled') : t('profile.security.twoFactor.disabled')}
                  </div>
                </div>

                {!show2FASetup ? (
                  <button
                    className={`fb-btn ${twoFactorEnabled ? 'fb-btn-outline' : 'fb-btn-primary'}`}
                    onClick={handle2FAToggle}
                  >
                    <Smartphone size={16} />
                    {twoFactorEnabled ? t('profile.security.twoFactor.disable') : t('profile.security.twoFactor.enable')}
                  </button>
                ) : (
                  <div className="fb-2fa-setup">
                    <div className="fb-qr-placeholder">
                      <Shield size={48} />
                      <p>{t('profile.security.twoFactor.scanQR')}</p>
                    </div>
                    <div className="fb-backup-codes">
                      <h4>{t('profile.security.twoFactor.backupCode')}</h4>
                      <div className="fb-code-grid">
                        {['ABCD', 'EFGH', 'IJKL', 'MNOP', 'QRST', 'UVWX'].map(code => (
                          <span key={code} className="fb-backup-code">{code}</span>
                        ))}
                      </div>
                    </div>
                    <div className="fb-btn-group">
                      <button className="fb-btn fb-btn-outline" onClick={() => setShow2FASetup(false)}>
                        {t('common.cancel')}
                      </button>
                      <button className="fb-btn fb-btn-primary" onClick={handle2FAConfirm}>
                        {t('profile.security.twoFactor.confirm')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Sessions */}
              <div className="fb-card fb-security-card">
                <div className="fb-security-header">
                  <div className="fb-security-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3>{t('profile.security.activeSessions.title')}</h3>
                    <p>{t('profile.security.activeSessions.devices')}</p>
                  </div>
                </div>
                <div className="fb-session-list">
                  <div className="fb-session-item">
                    <div className="fb-session-device">
                      <Smartphone size={16} />
                      <span>Current Device</span>
                    </div>
                    <span className="fb-session-badge">{t('profile.security.activeSessions.current')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="fb-account-content">
            <div className="fb-danger-zone">
              <h2 className="fb-danger-title">
                <AlertTriangle size={20} />
                {t('profile.account.dangerZone')}
              </h2>

              <div className="fb-account-cards">
                {/* Logout */}
                <div className="fb-card fb-account-card">
                  <div className="fb-account-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <LogOut size={24} />
                  </div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.logout.title')}</h3>
                    <p>{t('profile.account.logout.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutModal(true)}>
                    {t('profile.account.logout.button')}
                  </button>
                </div>

                {/* Delete All Data */}
                <div className="fb-card fb-account-card fb-warning">
                  <div className="fb-account-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                    <Trash2 size={24} />
                  </div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.deleteAllData.title')}</h3>
                    <p>{t('profile.account.deleteAllData.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-warning" onClick={() => setShowDeleteAllDataModal(true)}>
                    {t('profile.account.deleteAllData.button')}
                  </button>
                </div>

                {/* Close Account */}
                <div className="fb-card fb-account-card fb-warning">
                  <div className="fb-account-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                    <X size={24} />
                  </div>
                  <div className="fb-account-info">
                    <h3>{t('profile.account.closeAccount.title')}</h3>
                    <p>{t('profile.account.closeAccount.description')}</p>
                  </div>
                  <button className="fb-btn fb-btn-danger-outline">
                    {t('profile.account.closeAccount.button')}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="fb-card fb-account-card fb-danger">
                  <div className="fb-account-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                    <Trash2 size={24} />
                  </div>
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

      {/* Modals */}
      {showLogoutModal && (
        <div className="fb-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header">
              <LogOut size={24} style={{ color: '#3b82f6' }} />
              <h3>{t('profile.account.logout.confirmTitle')}</h3>
            </div>
            <p className="fb-modal-message">{t('profile.account.logout.confirmMessage')}</p>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => setShowLogoutModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="fb-btn fb-btn-primary" onClick={handleLogout}>
                {t('profile.account.logout.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllDataModal && (
        <div className="fb-modal-overlay" onClick={() => setShowDeleteAllDataModal(false)}>
          <div className="fb-modal fb-modal-warning" onClick={e => e.stopPropagation()}>
            <div className="fb-modal-header">
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              <h3>{t('profile.account.deleteAllData.confirmTitle')}</h3>
            </div>
            <p className="fb-modal-message">{t('profile.account.deleteAllData.confirmMessage')}</p>
            <label className="fb-checkbox-confirm">
              <input type="checkbox" checked={deleteAllDataConfirm} onChange={e => setDeleteAllDataConfirm(e.target.checked)} />
              <span>{t('profile.account.deleteAllData.title')}</span>
            </label>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => { setShowDeleteAllDataModal(false); setDeleteAllDataConfirm(false) }}>
                {t('common.cancel')}
              </button>
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
            <div className="fb-modal-header">
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              <h3>{t('profile.account.deleteAccount.confirmTitle')}</h3>
            </div>
            <p className="fb-modal-message">{t('profile.account.deleteAccount.confirmMessage')}</p>
            <div className="fb-form-group">
              <label className="fb-form-label">{t('profile.account.deleteAccount.finalWarning')}</label>
              <input
                className="fb-form-input"
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={t('profile.account.deleteAccount.placeholder')}
              />
            </div>
            <div className="fb-modal-actions">
              <button className="fb-btn fb-btn-outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}>
                {t('common.cancel')}
              </button>
              <button className="fb-btn fb-btn-danger" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || accountLoading}>
                {accountLoading ? <span className="spinner" /> : <Trash2 size={16} />}
                {t('profile.account.deleteAccount.button')}
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
