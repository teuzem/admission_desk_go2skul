import { useState, useEffect } from 'react'
import { X, User, Mail, Shield, Copy, Check, Link as LinkIcon, Search, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './TeamMemberModal.css'

interface TeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, name: string) => Promise<string | null | void>
  loading?: boolean
  existingMemberCount: number
}

export default function TeamMemberModal({
  isOpen,
  onClose,
  onInvite,
  loading = false,
  existingMemberCount
}: TeamMemberModalProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const [invitationSent, setInvitationSent] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  
  // Search state
  const [activeField, setActiveField] = useState<'email' | 'name' | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const searchQuery = activeField === 'email' ? email : activeField === 'name' ? name : ''

  useEffect(() => {
    if (!activeField || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, agency_name, avatar_url, is_active')
          .eq('role', 'agent')
          .neq('id', profile?.id || '')
          .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,agency_name.ilike.%${searchQuery}%`)
          .limit(10)

        if (error) throw error

        if (data && data.length > 0) {
          const activeData = data.filter(p => p.is_active !== false)
          
          if (activeData.length > 0) {
            const agentIds = activeData.map(p => p.id)
            const { data: apps } = await supabase
              .from('applications')
              .select('agent_id')
              .in('agent_id', agentIds)

            const agentsWithApps = new Set(apps?.map(a => a.agent_id) || [])
            const eligible = activeData.filter(p => !agentsWithApps.has(p.id))
            
            setSearchResults(eligible)
          } else {
            setSearchResults([])
          }
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Error searching agents:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, activeField, profile?.id])

  const selectUser = (user: any) => {
    setEmail(user.email)
    setName(`${user.first_name || ''} ${user.last_name || ''}`.trim())
    setActiveField(null)
    setShowResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('team.invite.emailRequired'))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t('errors.invalidEmail'))
      return
    }

    try {
      const pwd = await onInvite(email, name || 'Team Member')
      if (typeof pwd === 'string' && pwd.length > 0) {
        setGeneratedPassword(pwd)
      } else {
        // Generate a mock invitation link for demo purposes for existing users
        const mockToken = btoa(`${email}-${Date.now()}`)
        setGeneratedLink(`${window.location.origin}/invite/${mockToken}`)
      }
      
      setInvitationSent(true)
    } catch (error: any) {
      toast.error(error.message || t('errors.generic'))
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success(t('team.invite.linkCopied'))
  }

  const handleClose = () => {
    setEmail('')
    setName('')
    setActiveField(null)
    setSearchResults([])
    setShowResults(false)
    setInvitationSent(false)
    setGeneratedLink('')
    setGeneratedPassword(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="team-modal-overlay" onClick={handleClose}>
      <div className="team-modal" onClick={e => e.stopPropagation()}>
        <div className="team-modal-header">
          <div className="team-modal-icon">
            <User size={24} />
          </div>
          <div className="team-modal-title-area">
            <h3 className="team-modal-title">
              {invitationSent
                ? t('team.invite.sentTitle')
                : t('team.invite.title')
              }
            </h3>
            <p className="team-modal-subtitle">
              {invitationSent
                ? t('team.invite.sentSubtitle')
                : t('team.invite.subtitle')
              }
            </p>
          </div>
          <button className="team-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {!invitationSent ? (
          <form onSubmit={handleSubmit} className="team-modal-form">
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">
                <User size={14} />
                {t('team.invite.name')}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t('team.invite.namePlaceholder')}
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  setActiveField('name')
                  setShowResults(true)
                }}
                onFocus={() => {
                  setActiveField('name')
                  if (name.length >= 2) setShowResults(true)
                }}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              
              {showResults && activeField === 'name' && searchQuery.length >= 2 && (
                <div className="team-search-dropdown" style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: 'white', border: '1px solid #e2e8f0', 
                  borderRadius: '6px', zIndex: 10, marginTop: '4px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  maxHeight: '200px', overflowY: 'auto'
                }}>
                  {isSearching ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={16} className="spinner" style={{ display: 'inline', marginRight: '8px' }} />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div 
                        key={user.id}
                        onMouseDown={() => selectUser(user)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                          {user.first_name?.[0] || 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{user.email}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                      No eligible active agents found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">
                <Mail size={14} />
                {t('team.invite.email')} *
              </label>
              <input
                type="email"
                className="form-input"
                placeholder={t('team.invite.emailPlaceholder')}
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setActiveField('email')
                  setShowResults(true)
                }}
                onFocus={() => {
                  setActiveField('email')
                  if (email.length >= 2) setShowResults(true)
                }}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                required
              />
              
              {showResults && activeField === 'email' && searchQuery.length >= 2 && (
                <div className="team-search-dropdown" style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: 'white', border: '1px solid #e2e8f0', 
                  borderRadius: '6px', zIndex: 10, marginTop: '4px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  maxHeight: '200px', overflowY: 'auto'
                }}>
                  {isSearching ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={16} className="spinner" style={{ display: 'inline', marginRight: '8px' }} />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div 
                        key={user.id}
                        onMouseDown={() => selectUser(user)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                          {user.first_name?.[0] || 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{user.email}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                      No eligible active agents found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="team-modal-info">
              <Shield size={16} />
              <span>{t('team.invite.roleInfo')}</span>
            </div>

            <div className="team-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !email || existingMemberCount >= 2}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Mail size={16} />
                    {t('team.invite.sendInvite')}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="team-modal-success">
            {generatedPassword ? (
              <div className="invitation-link-section" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#10b981', fontWeight: 600 }}>
                  <Check size={18} />
                  Account Auto-Created!
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                  We've securely created an editor account linked to your agency. Please share these precise credentials with your team member:
                </p>
                
                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email Address</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1e293b' }}>{email}</div>
                </div>

                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Temporary Password</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>{generatedPassword}</div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success('Password copied!') }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="invitation-link-section">
                <label className="form-label">
                  <LinkIcon size={14} />
                  {t('team.invite.invitationLink')}
                </label>
                <div className="invitation-link-input">
                  <input
                    type="text"
                    className="form-input"
                    value={generatedLink}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="invitation-link-hint">
                  {t('team.invite.linkHint')}
                </p>
              </div>
            )}

            <div className="invitation-details">
              <div className="invitation-detail-item">
                <span className="invitation-detail-label">{t('team.invite.invitedEmail')}:</span>
                <span className="invitation-detail-value">{email}</span>
              </div>
              {name && (
                <div className="invitation-detail-item">
                  <span className="invitation-detail-label">{t('team.invite.nameLabel')}:</span>
                  <span className="invitation-detail-value">{name}</span>
                </div>
              )}
              <div className="invitation-detail-item">
                <span className="invitation-detail-label">{t('team.invite.role')}:</span>
                <span className="invitation-detail-value">{t('team.editor')}</span>
              </div>
            </div>

            <div className="team-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
              >
                {t('common.done')}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setInvitationSent(false)
                  setEmail('')
                  setName('')
                  setGeneratedLink('')
                  setGeneratedPassword(null)
                }}
              >
                <Mail size={16} />
                {t('team.invite.inviteAnother')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
