import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, CheckCircle2, Mail, Crown, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import TeamMemberModal from './TeamMemberModal'
import './TeamMemberModal.css'
import '../dashboard/DashboardPages.css'

export default function TeamMembersPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const [members, setMembers] = useState<any[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<any[]>([])

  useEffect(() => {
    if (!profile?.id) return
    const fetchMembers = async () => {
      const { data } = await supabase.from('team_members').select('*').eq('agency_id', profile.id)
      if (data && data.length > 0) {
        // Fetch full profiles to get avatars and metadata
        const emails = data.map(m => m.invited_email)
        const { data: memberProfiles } = await supabase.from('profiles').select('email, avatar_url, phone, country, city').in('email', emails)
        
        const enriched = data.map(m => {
          const p = memberProfiles?.find(p => p.email === m.invited_email)
          return { ...m, profileData: p }
        })
        setMembers(enriched)
      } else {
        setMembers([])
      }
    }
    
    const fetchReceived = async () => {
      if (!profile?.email) return
      const { data } = await supabase.from('team_members').select('*').eq('invited_email', profile.email).eq('status', 'pending')
      if (data && data.length > 0) {
        const agencyIds = data.map(d => d.agency_id)
        const { data: agencies } = await supabase.from('profiles').select('id, agency_name').in('id', agencyIds)
        const enriched = data.map(d => ({
          ...d,
          agency_name: agencies?.find(a => a.id === d.agency_id)?.agency_name || 'An Agency'
        }))
        setReceivedInvitations(enriched)
      } else {
        setReceivedInvitations([])
      }
    }
    
    fetchMembers()
    fetchReceived()

    // Realtime sync
    const channel = supabase.channel('public:team_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `agency_id=eq.${profile.id}` }, () => {
        fetchMembers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `invited_email=eq.${profile.email}` }, () => {
        fetchReceived()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, profile?.email])

  const handleInvite = async (email: string, name: string) => {
    if (members.length >= 2) {
      toast.error(t('team.messages.maxReached', { max: 2 }))
      throw new Error(t('team.messages.maxReached', { max: 2 }))
    }

    const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()

    let generatedPassword = null
    let finalStatus = 'pending'

    if (!existingUser) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
      
      generatedPassword = `Agent${Math.floor(Math.random() * 900000) + 100000}!`
      
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email,
        password: generatedPassword,
        options: {
          data: {
            first_name: name.split(' ')[0] || '',
            last_name: name.split(' ').slice(1).join(' ') || '',
            agency_name: profile?.agency_name || '',
            country: profile?.country || '',
            city: profile?.city || '',
            phone: profile?.phone || '',
            role: 'editor',
            parent_agency_id: profile?.id
          }
        }
      })
      if (authError) throw authError
      
      if (authData?.user) {
        await tempClient.from('profiles').update({
          agency_name: profile?.agency_name || '',
          country: profile?.country || '',
          city: profile?.city || '',
          office_address: profile?.office_address || '',
          office_country: profile?.office_country || '',
          office_city: profile?.office_city || '',
          website: profile?.website || '',
          role: 'editor',
          is_active: true
        }).eq('id', authData.user.id)
      }
      finalStatus = 'active'
    }

    const { error } = await supabase.from('team_members').insert({
      agency_id: profile?.id,
      invited_email: email,
      name: name || 'Team Member',
      role: 'editor',
      status: finalStatus
    } as any)

    if (error) throw error;
    
    // Log activity
    (supabase as any).from('agent_global_activities').insert({
      agent_id: profile?.id,
      activity_type: 'team_member_added',
      description: `Invited new team member: ${email}`
    }).then()
    
    toast.success(t('team.messages.inviteSent', { email }))
    
    return generatedPassword
  }

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw error;
      toast.success(t('team.messages.memberRemoved'))
    } catch (error: any) {
      toast.error(error.message || t('errors.generic'))
    }
  }

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      const { data: inviteData } = await supabase.from('team_members').select('agency_id').eq('id', invitationId).single()
      if (inviteData?.agency_id) {
         await supabase.auth.updateUser({ data: { parent_agency_id: inviteData.agency_id } })
         await supabase.from('profiles').update({ role: 'editor' }).eq('id', profile?.id)
      }
      const { error } = await supabase.from('team_members').update({ status: 'active' }).eq('id', invitationId)
      if (error) throw error
      toast.success(t('team.messages.inviteAccepted', 'Invitation accepted!'))
      setReceivedInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const handleDeclineInvite = async (invitationId: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', invitationId)
      if (error) throw error
      toast.success(t('team.messages.inviteDeclined', 'Invitation declined.'))
      setReceivedInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch (err: any) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('team.title')}</h1>
          <p className="page-subtitle">{t('team.subtitle')}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
          disabled={members.length >= 2}
        >
          <Plus size={18} />
          {t('team.inviteMember')}
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Left Col: Member List */}
        <div className="dashboard-col-main">
          
          {/* Received Invitations */}
          {receivedInvitations.length > 0 && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '1px solid #10b981' }}>
              <div className="team-section-header">
                <div className="team-section-title">
                  <Mail size={20} className="text-primary" />
                  <h3>Received Invitations</h3>
                </div>
                <span className="team-count-badge">{receivedInvitations.length}</span>
              </div>
              
              <div className="member-group" style={{ marginTop: '1rem' }}>
                {receivedInvitations.map(invitation => (
                  <div key={invitation.id} className="team-member-card pending">
                    <div className="member-avatar pending-avatar">
                      <Users size={16} />
                    </div>
                    <div className="member-info">
                      <div className="member-name">{invitation.agency_name}</div>
                      <div className="member-email" style={{ fontSize: '0.75rem' }}>Invited you to join their team</div>
                    </div>
                    <div className="member-role-badge">{t('team.editor')}</div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', paddingRight: '1rem' }}>
                      <button 
                        onClick={() => handleAcceptInvite(invitation.id)}
                        className="btn btn-sm"
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        <CheckCircle2 size={14} /> Accept
                      </button>
                      <button 
                        onClick={() => handleDeclineInvite(invitation.id)}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        <XCircle size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-panel">
            <div className="team-section-header">
              <div className="team-section-title">
                <Crown size={20} className="text-primary" />
                <h3>{t('team.yourTeam')}</h3>
              </div>
              <span className="team-count-badge">{t('team.countBadge', { current: members.length, max: 2 })}</span>
            </div>

            {/* Agent Card */}
            <div className="team-member-card owner-card">
              <div className="member-avatar owner-avatar" style={{ overflow: 'hidden' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile?.agency_name?.charAt(0) || profile?.first_name?.charAt(0) || 'A'
                )}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {profile?.agency_name || t('team.agencyOwner')}
                  <span className="owner-badge">{profile?.is_super_agent ? t('team.superAgent', 'Super Agent') : t('team.owner')}</span>
                </div>
                <div className="member-email">{profile?.email}</div>
                {(profile?.phone || profile?.country) && (
                  <div className="member-email" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {profile?.country}{profile?.city ? `, ${profile.city}` : ''} {profile?.phone && `• ${profile.phone}`}
                  </div>
                )}
              </div>
              <div className="member-status active">
                <CheckCircle2 size={14} />
                {t('team.active')}
              </div>
            </div>

            {members.length === 0 ? (
              <div className="empty-team-state">
                <Users size={48} strokeWidth={1} />
                <h4>{t('team.noMembers')}</h4>
                <p>{t('team.noMembersDesc')}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus size={16} />
                  {t('team.inviteFirst')}
                </button>
              </div>
            ) : (
              <>
                {/* Active Members */}
                {activeMembers.length > 0 && (
                  <div className="member-group">
                    <div className="member-group-label">{t('team.activeMembers')}</div>
                    {activeMembers.map(m => (
                      <div key={m.id} className="team-member-card">
                        <div className="member-avatar" style={{ overflow: 'hidden' }}>
                          {m.profileData?.avatar_url ? (
                            <img src={m.profileData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            m.name?.charAt(0) || 'E'
                          )}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{m.name}</div>
                          <div className="member-email">{m.invited_email || m.email}</div>
                          {(m.profileData?.phone || m.profileData?.country) && (
                            <div className="member-email" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              {m.profileData?.country}{m.profileData?.city ? `, ${m.profileData.city}` : ''} {m.profileData?.phone && `• ${m.profileData.phone}`}
                            </div>
                          )}
                        </div>
                        <div className="member-role-badge">{t('team.editor')}</div>
                        <div className="member-status active">
                          <CheckCircle2 size={14} />
                          {t('team.active')}
                        </div>
                        <button
                          className="member-remove-btn"
                          onClick={() => handleRemove(m.id)}
                          title={t('team.removeMember')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Members */}
                {pendingMembers.length > 0 && (
                  <div className="member-group">
                    <div className="member-group-label">{t('team.pendingInvitations')}</div>
                    {pendingMembers.map(m => (
                      <div key={m.id} className="team-member-card pending">
                        <div className="member-avatar pending-avatar" style={{ overflow: 'hidden' }}>
                          {m.profileData?.avatar_url ? (
                            <img src={m.profileData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                          ) : (
                            m.name?.charAt(0) || 'E'
                          )}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{m.name}</div>
                          <div className="member-email">{m.invited_email}</div>
                          {(m.profileData?.phone || m.profileData?.country) && (
                            <div className="member-email" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              {m.profileData?.country}{m.profileData?.city ? `, ${m.profileData.city}` : ''} {m.profileData?.phone && `• ${m.profileData.phone}`}
                            </div>
                          )}
                        </div>
                        <div className="member-role-badge">{t('team.editor')}</div>
                        <div className="member-status pending">
                          <Mail size={14} />
                          {t('team.pending')}
                        </div>
                        <button
                          className="member-remove-btn"
                          onClick={() => handleRemove(m.id)}
                          title={t('team.cancelInvitation')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="team-usage-info">
              <div className="usage-bar">
                <div
                  className="usage-fill"
                  style={{ width: `${(members.length / 2) * 100}%` }}
                />
              </div>
              <span className="usage-text">
                {t('team.usage', { current: members.length, max: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Info Card */}
        <div className="dashboard-col-side">
          <div className="card-panel info-card">
            <div className="info-icon-wrapper">
              <Users size={24} />
            </div>
            <h3>{t('team.aboutRoles')}</h3>
            <p>{t('team.aboutRolesDesc')}</p>

            <div className="role-list">
              <div className="role-item">
                <div className="role-icon owner">
                  <Crown size={14} />
                </div>
                <div className="role-details">
                  <strong>{t('team.owner')}</strong>
                  <span>{t('team.ownerRoleDesc')}</span>
                </div>
              </div>
              <div className="role-item">
                <div className="role-icon editor">
                  <Users size={14} />
                </div>
                <div className="role-details">
                  <strong>{t('team.editor')}</strong>
                  <span>{t('team.editorRoleDesc')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-panel quick-tips">
            <h4>{t('team.quickTips')}</h4>
            <ul>
              <li>{t('team.tips.expire')}</li>
              <li>{t('team.tips.remove')}</li>
              <li>{t('team.tips.logs')}</li>
              <li>{t('team.tips.upgrade')}</li>
            </ul>
          </div>
        </div>
      </div>

      <TeamMemberModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvite={handleInvite}
        loading={loading}
        existingMemberCount={members.length}
      />
    </div>
  )
}
