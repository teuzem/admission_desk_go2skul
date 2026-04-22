import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { UserRole } from '../../types/database'
import { 
  uploadAdminAvatar, 
  uploadAdminCoverImage, 
  getPublicUrl 
} from '../../lib/storageHelpers'
import { 
  User, 
  Mail, 
  Phone as PhoneIcon, 
  MapPin, 
  Globe, 
  Shield, 
  Lock, 
  Camera, 
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layout,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Calendar,
  Building2,
  Languages,
  Clock,
  Briefcase
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
  useEffect(() => {
    if (profile) {
      setProfileStrength(calculateStrength(profile))
    }
  }, [profile, calculateStrength])

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
                <div className="profile-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Shield size={20} className="text-primary" />
                      Account Security
                    </h3>
                  </div>
                  
                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon-box bg-blue-50 text-blue-600">
                        <Mail size={20} />
                      </div>
                      <div className="security-text">
                        <h4>Two-Factor Authentication</h4>
                        <p>Add an extra layer of security to your account.</p>
                      </div>
                    </div>
                    <button className="text-primary font-semibold text-sm hover:underline">Enable</button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon-box bg-amber-50 text-amber-600">
                        <Lock size={20} />
                      </div>
                      <div className="security-text">
                        <h4>Change Password</h4>
                        <p>Last changed 3 months ago.</p>
                      </div>
                    </div>
                    <button className="text-primary font-semibold text-sm hover:underline">Update</button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon-box bg-purple-50 text-purple-600">
                        <Shield size={20} />
                      </div>
                      <div className="security-text">
                        <h4>Active Sessions</h4>
                        <p>You are currently logged in from 2 devices.</p>
                      </div>
                    </div>
                    <button className="text-primary font-semibold text-sm hover:underline">Manage</button>
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
                  <RefreshCw size={16} className="text-primary" />
                  Recent Activity
                </h4>
                <div className="space-y-4">
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-medium text-slate-700">Updated profile avatar</p>
                      <p className="text-slate-500 text-xs">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-medium text-slate-700">Changed system settings</p>
                      <p className="text-slate-500 text-xs">Yesterday</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-medium text-slate-700">Login from new device</p>
                      <p className="text-slate-500 text-xs">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AdminFooter />
    </div>
  )
}

export default AdminProfilePage
