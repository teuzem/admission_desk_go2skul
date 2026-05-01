// Contract Management — Document Request Panel
import { useState } from 'react'
import { FileText, Plus, CheckCircle, Clock, Trash2, X, Eye, Download, FileCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { getAgentContractDocUrl } from '../../../lib/storageHelpers'
import toast from 'react-hot-toast'
import { ContractDocRequest } from './ContractTypes'
import { Spinner } from './ContractUtils'

interface Props {
  contractId: string
  agentId: string
  currentUserId: string
  requests: ContractDocRequest[]
  onRefresh: () => void
  onViewDoc?: (name: string, url: string) => void
}

const DOC_TYPES = [
  'Business Registration Certificate', 'Trading License', 'Company Profile',
  'Director ID / Passport', 'Proof of Address', 'Bank Statement',
  'Letter of Intent', 'Reference Letter', 'Partnership Agreement', 'Other',
]

export default function ContractDocRequests({ contractId, agentId, currentUserId, requests, onRefresh, onViewDoc }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ document_type: DOC_TYPES[0], description: '', is_mandatory: true, priority: 'normal' })
  const [submitting, setSubmitting] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

  const handleAdd = async () => {
    setSubmitting(true)
    const { error } = await supabase.from('contract_document_requests' as any).insert({
      contract_id: contractId, agent_id: agentId,
      document_type: form.document_type, description: form.description || null,
      is_mandatory: form.is_mandatory, priority: form.priority,
      requested_by: currentUserId,
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to add request'); return }
    toast.success('Document request added')
    setShowForm(false)
    setForm({ document_type: DOC_TYPES[0], description: '', is_mandatory: true, priority: 'normal' })
    onRefresh()
  }

  const handleViewDoc = async (docUrl: string, requestId: string, docName: string, download = false) => {
    if (!docUrl) return
    setLoadingDoc(requestId)
    try {
      const url = await getAgentContractDocUrl(docUrl, download)
      if (url) {
        if (download) {
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', '')
          document.body.appendChild(link)
          link.click()
          link.remove()
        } else if (onViewDoc) {
          onViewDoc(docName, url)
        } else {
          window.open(url, '_blank')
        }
      } else {
        toast.error('Could not generate secure URL')
      }
    } catch (err) {
      toast.error('Error opening document')
    } finally {
      setLoadingDoc(null)
    }
  }

  const markFulfilled = async (id: string) => {
    await supabase.from('contract_document_requests' as any).update({ is_fulfilled: true, fulfilled_at: new Date().toISOString() }).eq('id', id)
    toast.success('Marked as fulfilled')
    onRefresh()
  }

  const deleteRequest = async (id: string) => {
    await supabase.from('contract_document_requests' as any).delete().eq('id', id)
    toast.success('Request removed')
    onRefresh()
  }

  const priorityColors: Record<string, string> = { low: '#94a3b8', normal: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: '#3A4391' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Document Requests ({requests.length})</h3>
        </div>
        <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Add Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label className="cm-form-label">Document Type</label>
              <select className="cm-form-select" value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="cm-form-label">Priority</label>
              <select className="cm-form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="cm-form-label">Description (optional)</label>
            <textarea className="cm-form-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional instructions..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} />
              Mandatory document
            </label>
            <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? <Spinner size={12} /> : <Plus size={12} />} Add Request
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>No document requests yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requests.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            background: r.is_fulfilled ? '#f0fdf4' : 'white', borderRadius: 10,
            border: `1px solid ${r.is_fulfilled ? '#a7f3d0' : '#e2e8f0'}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ marginTop: 2, color: r.is_fulfilled ? '#10b981' : priorityColors[r.priority] }}>
              {r.is_fulfilled ? <CheckCircle size={16} /> : <Clock size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{r.document_type}</div>
              {r.description && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{r.description}</div>}
              {r.agent_note && (
                <div style={{ fontSize: '0.72rem', color: '#3A4391', marginTop: 4, padding: '4px 8px', background: '#e0e7ff', borderRadius: 4 }}>
                  <strong>Agent Note:</strong> {r.agent_note}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {r.is_mandatory && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '1px 6px', borderRadius: 99 }}>REQUIRED</span>}
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: priorityColors[r.priority], background: `${priorityColors[r.priority]}15`, padding: '1px 6px', borderRadius: 99 }}>{r.priority.toUpperCase()}</span>
                {r.is_fulfilled && r.fulfilled_at && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Received {new Date(r.fulfilled_at).toLocaleDateString()}</span>}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {r.is_fulfilled && r.fulfilled_doc_url && (
                <>
                  <button 
                    onClick={() => handleViewDoc(r.fulfilled_doc_url!, r.id, r.document_type)} 
                    disabled={loadingDoc === r.id}
                    title="View Document"
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#3b82f6', cursor: 'pointer' }}
                  >
                    {loadingDoc === r.id ? <Spinner size={11} /> : <Eye size={14} />}
                  </button>
                  <button 
                    onClick={() => handleViewDoc(r.fulfilled_doc_url!, r.id, r.document_type, true)} 
                    disabled={loadingDoc === r.id}
                    title="Download"
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#3b82f6', cursor: 'pointer' }}
                  >
                    {loadingDoc === r.id ? <Spinner size={11} /> : <Download size={14} />}
                  </button>
                </>
              )}
              {!r.is_fulfilled && (
                <>
                  <button onClick={() => markFulfilled(r.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }} title="Mark as Received">
                    <FileCheck size={14} />
                  </button>
                  <button onClick={() => deleteRequest(r.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: 'white', color: '#ef4444', cursor: 'pointer' }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              {r.is_fulfilled && (
                 <button onClick={() => deleteRequest(r.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: 'white', color: '#ef4444', cursor: 'pointer' }} title="Delete">
                    <Trash2 size={14} />
                 </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

