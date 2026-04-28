// Contract Management — Agent Action Modal
import { useState } from 'react'
import { X, ShieldCheck, ShieldX, ShieldOff, AlertTriangle, Clock, Ban, CheckCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { KycStatus } from '../../../types/database'
import toast from 'react-hot-toast'
import { AgentWithContract, ContractStatus, ContractCategory, CATEGORY_CONFIG } from './ContractTypes'
import { StatusBadge, CategoryBadge, AgentAvatar, Spinner } from './ContractUtils'

interface Props {
  agent: AgentWithContract
  currentUserId: string
  onClose: () => void
  onRefresh: () => void
}

const ACTIONS: { key: ContractStatus; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { key: 'approved',              label: 'Approve',           icon: <CheckCircle size={16} />,  color: '#10b981', desc: 'Approve this agent — they can access the portal.' },
  { key: 'under_verification',   label: 'Mark Under Review',  icon: <Clock size={16} />,         color: '#3b82f6', desc: 'Begin verification process for this agent.' },
  { key: 'information_requested',label: 'Request Info',       icon: <AlertTriangle size={16} />, color: '#8b5cf6', desc: 'Request more information or documents.' },
  { key: 'suspended',            label: 'Suspend',            icon: <ShieldOff size={16} />,     color: '#f97316', desc: 'Temporarily suspend this agent\'s access.' },
  { key: 'revoked',              label: 'Revoke',             icon: <ShieldX size={16} />,       color: '#ef4444', desc: 'Revoke this agent\'s partner status.' },
  { key: 'blocked',              label: 'Block',              icon: <Ban size={16} />,            color: '#dc2626', desc: 'Permanently block this agent from the platform.' },
  { key: 'rejected',             label: 'Reject',             icon: <ShieldX size={16} />,       color: '#64748b', desc: 'Reject this agent registration entirely.' },
]

export default function ContractActionModal({ agent, currentUserId, onClose, onRefresh }: Props) {
  const [selectedAction, setSelectedAction] = useState<ContractStatus | null>(agent.contract?.status ?? null)
  const [selectedCategory, setSelectedCategory] = useState<ContractCategory>(agent.contract?.category ?? 'pending_classification')
  const [reason, setReason] = useState(agent.contract?.action_reason ?? '')
  const [verificationNotes, setVerificationNotes] = useState(agent.contract?.verification_notes ?? '')
  const [complianceNotes, setComplianceNotes] = useState(agent.contract?.compliance_notes ?? '')
  const [violationDesc, setViolationDesc] = useState(agent.contract?.violation_description ?? '')
  const [violationType, setViolationType] = useState(agent.contract?.violation_type ?? '')
  const [hasViolation, setHasViolation] = useState(agent.contract?.has_policy_violation ?? false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedAction) { toast.error('Select an action'); return }
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const prevStatus = agent.contract?.status ?? 'pending_review'
      const contractPayload: any = {
        agent_id: agent.id,
        status: selectedAction,
        category: selectedCategory,
        verification_notes: verificationNotes || null,
        compliance_notes: complianceNotes || null,
        action_reason: reason || null,
        action_taken_by: currentUserId,
        action_taken_at: now,
        reviewed_by: currentUserId,
        reviewed_at: now,
        has_policy_violation: hasViolation,
        violation_type: hasViolation ? violationType || null : null,
        violation_description: hasViolation ? violationDesc || null : null,
        violation_reported_at: hasViolation ? now : null,
        violation_reported_by: hasViolation ? currentUserId : null,
        updated_at: now,
      }
      if (selectedAction === 'approved') {
        contractPayload.approved_by = currentUserId
        contractPayload.approved_at = now
      }

      let contractId = agent.contract?.id
      if (agent.contract?.id) {
        await supabase.from('agent_contracts' as any).update(contractPayload).eq('id', agent.contract.id)
      } else {
        const { data } = await supabase.from('agent_contracts' as any).insert(contractPayload).select('id').single() as any
        contractId = data?.id
      }

      // Update agent KYC status to match
      const kycMap: Partial<Record<ContractStatus, KycStatus>> = {
        approved: 'approved', rejected: 'rejected', revoked: 'rejected', blocked: 'rejected'
      }
      if (kycMap[selectedAction]) {
        await supabase.from('profiles').update({ kyc_status: kycMap[selectedAction], is_active: selectedAction === 'approved' }).eq('id', agent.id)
      } else if (selectedAction === 'suspended' || selectedAction === 'blocked') {
        await supabase.from('profiles').update({ is_active: false }).eq('id', agent.id)
      }

      // Log activity
      if (contractId) {
        await supabase.from('agent_contract_activity' as any).insert({
          contract_id: contractId, agent_id: agent.id,
          action: `Status changed to "${selectedAction}"`,
          previous_status: prevStatus, new_status: selectedAction,
          reason: reason || null, notes: verificationNotes || null,
          performed_by: currentUserId,
        })
      }

      toast.success(`Agent ${selectedAction.replace(/_/g, ' ')} successfully`)
      onRefresh()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update contract')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="cm-modal-header">
          <h2><ShieldCheck size={20} style={{ color: '#3A4391' }} /> Agent Contract Action</h2>
          <button className="cm-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="cm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Agent Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <AgentAvatar agent={agent} size={52} />
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{agent.first_name} {agent.last_name}</div>
              {agent.agency_name && <div style={{ fontSize: '0.82rem', color: '#3A4391', fontWeight: 600 }}>{agent.agency_name}</div>}
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{agent.email} {agent.country ? `· ${agent.country}` : ''}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {agent.contract?.status && <StatusBadge status={agent.contract.status} />}
              {agent.contract?.category && <CategoryBadge category={agent.contract.category} />}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <label className="cm-form-label">Select Action</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
              {ACTIONS.map(a => (
                <button key={a.key} onClick={() => setSelectedAction(a.key)} style={{
                  padding: '10px 14px', borderRadius: 10, border: `2px solid ${selectedAction === a.key ? a.color : '#e2e8f0'}`,
                  background: selectedAction === a.key ? `${a.color}10` : 'white', color: selectedAction === a.key ? a.color : '#475569',
                  cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>{a.icon} {a.label}</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.7, fontWeight: 400 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="cm-form-label">Agent Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 6 }}>
              {(Object.entries(CATEGORY_CONFIG) as [ContractCategory, any][])
                .filter(([k]) => k !== 'pending_classification')
                .map(([key, cfg]) => (
                  <button key={key} onClick={() => setSelectedCategory(key)} style={{
                    padding: '8px 12px', borderRadius: 10, border: `2px solid ${selectedCategory === key ? cfg.color : '#e2e8f0'}`,
                    background: selectedCategory === key ? `${cfg.color}10` : 'white', color: selectedCategory === key ? cfg.color : '#64748b',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s',
                  }}>
                    {cfg.label}
                  </button>
                ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="cm-form-label">Action Reason <span style={{ color: '#94a3b8', fontWeight: 400 }}>(required for non-approvals)</span></label>
            <textarea className="cm-form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the reason for this action..." />
          </div>

          {/* Verification Notes */}
          <div>
            <label className="cm-form-label">Verification Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(internal)</span></label>
            <textarea className="cm-form-textarea" rows={2} value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} placeholder="Document verification findings..." />
          </div>

          {/* Policy Violation */}
          <div style={{ padding: '1rem 1.25rem', background: hasViolation ? '#fef2f2' : '#f8fafc', borderRadius: 12, border: `1px solid ${hasViolation ? '#fecaca' : '#e2e8f0'}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: hasViolation ? 12 : 0 }}>
              <input type="checkbox" checked={hasViolation} onChange={e => setHasViolation(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: hasViolation ? '#dc2626' : '#374151' }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                Flag Policy Violation
              </span>
            </label>
            {hasViolation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="cm-form-input" value={violationType} onChange={e => setViolationType(e.target.value)} placeholder="Violation type (e.g. fraud, misrepresentation...)" />
                <textarea className="cm-form-textarea" rows={2} value={violationDesc} onChange={e => setViolationDesc(e.target.value)} placeholder="Describe the policy violation in detail..." />
              </div>
            )}
          </div>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-outline" onClick={onClose}>Cancel</button>
          <button className="cm-btn cm-btn-primary" onClick={handleSubmit} disabled={submitting || !selectedAction}>
            {submitting ? <Spinner /> : <ShieldCheck size={16} />} Submit Decision
          </button>
        </div>
      </div>
    </div>
  )
}
