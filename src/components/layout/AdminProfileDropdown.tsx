import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Shield, LogOut, ChevronDown,
  Layout, Settings, Bell, Mail,
  Activity, ExternalLink
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import './ProfileDropdown.css'

export default function AdminProfileDropdown() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    await signOut()
    navigate('/login')
  }

  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Administrator'

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'A'
    : user?.email?.[0]?.toUpperCase() || 'A'

  const roleDisplay = profile?.role?.replace('_', ' ') || 'Admin'

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{ minWidth: '180px' }}
      >
        <div className="profile-trigger-avatar">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-initials" style={{ background: '#3A4391' }}>{initials}</div>
          )}
          <span className="profile-avatar-online" />
        </div>
        <div className="profile-trigger-info">
          <span className="profile-trigger-name">{fullName}</span>
          <span className="profile-trigger-role" style={{ textTransform: 'capitalize' }}>{roleDisplay}</span>
        </div>
        <ChevronDown
          size={16}
          className={`profile-trigger-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu" style={{ width: '280px' }}>
          {/* Header Section */}
          <div className="dropdown-header" style={{ background: 'linear-gradient(135deg, rgba(58, 67, 145, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)' }}>
            <div className="dropdown-header-avatar" style={{ width: '48px', height: '48px' }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={fullName}
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-initials" style={{ background: '#3A4391', fontSize: '0.8rem' }}>{initials}</div>
              )}
            </div>
            <div className="dropdown-header-info">
              <span className="dropdown-header-name" style={{ fontSize: '0.9rem' }}>{fullName}</span>
              <span className="dropdown-header-email" style={{ fontSize: '0.75rem' }}>{user?.email}</span>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Quick Stats / Info */}
          <div className="dropdown-menu-items">
             <div style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                   <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
                   <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Active</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                   <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Security</div>
                   <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700 }}>Level 4</div>
                </div>
             </div>
          </div>

          <div className="dropdown-divider" />

          {/* Profile Links */}
          <div className="dropdown-menu-items">
            <Link
              to="/admin/profile"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <User size={18} />
              <span>My Profile</span>
            </Link>

            <Link
              to="/admin/profile?tab=security"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <Shield size={18} />
              <span>Security Settings</span>
            </Link>

            <Link
              to="/admin"
              className="dropdown-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <Layout size={18} />
              <span>Admin Dashboard</span>
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
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
