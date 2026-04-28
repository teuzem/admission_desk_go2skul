// Contract Management — Agent Detail Side Panel
import { useState, useEffect } from 'react'
import { X, User, ExternalLink, Globe, Phone, MapPin, Calendar, Activity, FileText, MessageSquare, ShieldCheck, Download, Eye, Building2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { getSecureUrl } from '../../../lib/storageHelpers'
import { AgentWithContract, ContractActivity, ContractDocRequest, ContractNote } from './ContractTypes'
import { StatusBadge, CategoryBadge, ComplianceBadge, AgentAvatar } from './ContractUtils'
import ContractActionModal from './ContractActionModal'
import ContractDocRequests from './ContractDocRequests'
import { ActivityLog, TeamNotes } from './ContractActivityLog'

interface Props {
  agent: AgentWithContract
  currentUserId: string
  onClose: () => void
  onRefresh: () => void
}

type PanelTab = 'overview' | 'activity' | 'docs' | 'notes'

export default function AgentDetailPanel({ agent, currentUserId, onClose, onRefresh }: Props) {
  const [panelTab, setPanelTab] = useState<PanelTab>('overview')
  const [showActionModal, setShowActionModal] = useState(false)
  const [activities, setActivities] = useState<ContractActivity[]>([])
  const [docRequests, setDocRequests] = useState<ContractDocRequest[]>([])
  const [notes, setNotes] = useState<ContractNote[]>([])
  const [kycData, setKycData] = useState<any>(null)

  const contractId = agent.contract?.id

  const loadData = async () => {
    if (!contractId) return
    const [actRes, docRes, noteRes, kycRes] = await Promise.all([
      supabase.from('agent_contract_activity' as any).select('*, performer:performed_by(first_name,last_name,email)').eq('contract_id', contractId).order('created_at', { ascending: false }) as any,
      supabase.from('contract_document_requests' as any).select('*').eq('contract_id', contractId).order('created_at', { ascending: false }) as any,
      supabase.from('contract_team_notes' as any).select('*, author:author_id(first_name,last_name,email)').eq('contract_id', contractId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }) as any,
      supabase.from('agent_kyc').select('*').eq('agent_id', agent.id).maybeSingle(),
    ])
    setActivities(actRes.data || [])
    setDocRequests(docRes.data || [])
    setNotes(noteRes.data || [])
    setKycData(kycRes.data || null)
  }

  useEffect(() => { loadData() }, [contractId])

  const TABS: [PanelTab, string, React.ReactNode][] = [
    ['overview', 'Overview', <User size={14} />],
    ['activity', `Activity (${activities.length})`, <Activity size={14} />],
    ['docs', `Documents (${docRequests.length})`, <FileText size={14} />],
    ['notes', `Notes (${notes.length})`, <MessageSquare size={14} />],
  ]

  const status = agent.contract?.status ?? 'pending_review'
  const agentName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'Agent'

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 999 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', maxWidth: '95vw',
        background: 'white', zIndex: 1000, boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideRight 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AgentAvatar agent={agent} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              {agentName}
              {agent.contract?.status === 'approved' && <ShieldCheck size={14} style={{ color: '#10b981' }} />}
            </div>
            {agent.agency_name && <div style={{ fontSize: '0.78rem', color: '#3A4391', fontWeight: 600 }}>{agent.agency_name}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <StatusBadge status={status} />
              {agent.contract?.category && <CategoryBadge category={agent.contract.category} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={() => setShowActionModal(true)}><ShieldCheck size={14} /> Action</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 8 }}><X size={20} /></button>
          </div>
        </div>

        {/* Panel Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
          {TABS.map(([key, label, icon]) => (
            <button key={key} onClick={() => setPanelTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', border: 'none',
              background: 'none', fontSize: '0.75rem', fontWeight: panelTab === key ? 700 : 600,
              color: panelTab === key ? '#3A4391' : '#64748b', cursor: 'pointer',
              borderBottom: `2px solid ${panelTab === key ? '#3A4391' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
          {panelTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Contact Info */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>Contact Info</div>
                {[
                  { icon: <User size={13} />, value: agent.email },
                  agent.phone ? { icon: <Phone size={13} />, value: agent.phone } : null,
                  (agent.city || agent.country) ? { icon: <MapPin size={13} />, value: [agent.city, agent.country].filter(Boolean).join(', ') } : null,
                  agent.website ? { icon: <Globe size={13} />, value: agent.website, href: agent.website } : null,
                  { icon: <Calendar size={13} />, value: `Registered ${new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#475569', marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', flexShrink: 0 }}>{item.icon}</span>
                    {item.href ? <a href={item.href} target="_blank" rel="noreferrer" style={{ color: '#3A4391', textDecoration: 'none' }}>{item.value} <ExternalLink size={10} /></a> : <span>{item.value}</span>}
                  </div>
                ))}
              </div>

              {/* Compliance */}
              {agent.contract && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>Compliance Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ComplianceBadge status={agent.contract.compliance_status} />
                    {agent.contract.has_policy_violation && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, border: '1px solid #fecaca' }}>POLICY VIOLATION</span>
                    )}
                  </div>
                  {agent.contract.violation_type && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: 4, fontWeight: 600 }}>Type: {agent.contract.violation_type}</div>}
                  {agent.contract.compliance_notes && <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>{agent.contract.compliance_notes}</div>}
                </div>
              )}

              {/* Verification Notes */}
              {agent.contract?.verification_notes && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Verification Notes</div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>{agent.contract.verification_notes}</p>
                </div>
              )}

              {/* Action Reason */}
              {agent.contract?.action_reason && (
                <div style={{ background: '#fff7ed', borderRadius: 12, padding: '1rem', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 8 }}>Action Reason</div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f', lineHeight: 1.6 }}>{agent.contract.action_reason}</p>
                  {agent.contract.action_taken_at && (
                    <div style={{ fontSize: '0.68rem', color: '#92400e', marginTop: 6 }}>{new Date(agent.contract.action_taken_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {panelTab === 'activity' && <ActivityLog activities={activities} />}

          {panelTab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* KYC / Primary Documents */}
              {kycData && (
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Building2 size={16} style={{ color: '#3A4391' }} />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Registration Documents</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kycData.business_licence_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={16} style={{ color: '#3b82f6' }} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Business License / Certificate</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Primary KYC Document</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            onClick={async () => {
                              const url = await getSecureUrl('kyc-documents', kycData.business_licence_url)
                              if (url) window.open(url, '_blank')
                            }}
                            className="cm-btn cm-btn-outline cm-btn-sm" title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              const url = await getSecureUrl('kyc-documents', kycData.business_licence_url, true)
                              if (url) {
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('download', '')
                                document.body.appendChild(link)
                                link.click()
                                link.remove()
                              }
                            }}
                            className="cm-btn cm-btn-outline cm-btn-sm" title="Download"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7', fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={14} /> No business license uploaded during registration.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contractId && (
                <ContractDocRequests
                  contractId={contractId} agentId={agent.id}
                  currentUserId={currentUserId} requests={docRequests}
                  onRefresh={loadData}
                />
              )}
            </div>
          )}

          {panelTab === 'notes' && contractId && (
            <TeamNotes
              contractId={contractId} agentId={agent.id}
              currentUserId={currentUserId} notes={notes}
              onRefresh={loadData}
            />
          )}
        </div>
      </div>

      {showActionModal && (
        <ContractActionModal
          agent={agent} currentUserId={currentUserId}
          onClose={() => setShowActionModal(false)}
          onRefresh={() => { onRefresh(); loadData() }}
        />
      )}

      <style>{`
        @keyframes slideRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  )
}
