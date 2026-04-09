import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User, Settings, LogOut, Shield, ChevronDown,
  Users as UsersIcon
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import './ProfileDropdown.css'

export default function ProfileDropdown() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Real-time profile image updates
  useEffect(() => {
    if (profile?.avatar_url) {
      setProfileImage(profile.avatar_url)
    } else {
      setProfileImage(null)
    }
  }, [profile?.avatar_url])

  // Listen for profile updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('profile-image-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const newAvatarUrl = payload.new?.avatar_url
        if (newAvatarUrl !== profileImage) {
          setProfileImage(newAvatarUrl)
        }
        refreshProfile?.()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, profileImage])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        navigate('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || t('profileDropdown.defaultName')

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : user?.email?.[0]?.toUpperCase() || 'U'

  const roleDisplay = profile?.role === 'admin' ? t('profileDropdown.roles.admin')
    : profile?.role === 'editor' ? t('profileDropdown.roles.editor')
    : profile?.designation || profile?.agency_name || t('profileDropdown.roles.agent')

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="profile-trigger-avatar">
          {profileImage ? (
            <img
              src={profileImage}
              alt={fullName}
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-initials">{initials}</div>
          )}
          <span className="profile-avatar-online" />
        </div>
        <div className="profile-trigger-info">
          <span className="profile-trigger-name">{fullName}</span>
          <span className="profile-trigger-role">{roleDisplay}</span>
        </div>
        <ChevronDown
          size={18}
          className={`profile-trigger-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu">
          {/* Header Section */}
          <div className="dropdown-header">
            <div className="dropdown-header-avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={fullName}
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-initials">{initials}</div>
              )}
            </div>
            <div className="dropdown-header-info">
              <span className="dropdown-header-name">{fullName}</span>
              <span className="dropdown-header-email">{user?.email}</span>
              <span className="dropdown-header-role">{roleDisplay}</span>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Profile Links */}
          <div className="dropdown-menu-items">
            <Link
              to="/dashboard/profile"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <User size={18} />
              <span>{t('profileDropdown.myProfile')}</span>
            </Link>

            <Link
              to="/dashboard/profile?tab=security"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <Shield size={18} />
              <span>{t('profileDropdown.security')}</span>
            </Link>

            <Link
              to="/dashboard/profile?tab=account"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={18} />
              <span>{t('profileDropdown.accountSettings')}</span>
            </Link>

            <Link
              to="/dashboard/team"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <UsersIcon size={18} />
              <span>{t('profileDropdown.teamMembers')}</span>
            </Link>
          </div>

          <div className="dropdown-divider" />

          {/* Logout */}
          <div className="dropdown-menu-items">
            <button
              className="dropdown-menu-item dropdown-menu-item-danger"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
