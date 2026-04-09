import { useState } from 'react'
import { Clock, CheckCircle2, XCircle, FileText, Search, Filter, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

interface MySubmissionsProps {
  submissions: any[]
  refreshData: () => void
}

export default function MySubmissions({ submissions, refreshData }: MySubmissionsProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      // try searching payload name 
      const name = s.payload?.name || ''
      return name.toLowerCase().includes(q) || s.submission_type.toLowerCase().includes(q)
    }
    return true
  })

  // Optionally could add a "Withdraw" button if pending
  const handleWithdraw = async (id: string) => {
    if (!window.confirm('Are you sure you want to withdraw this submission?')) return
    try {
      const { error } = await supabase.from('pending_submissions').delete().eq('id', id)
      if (error) throw error
      toast.success('Submission withdrawn')
      refreshData()
    } catch (err: any) {
      toast.error('Failed to withdraw: ' + err.message)
    }
  }

  return (
    <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* ═══════════ HEADER & CONTROLS ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} style={{ color: '#f59e0b' }} /> My Submissions
          </h2>
          <p className="section-subtitle" style={{ margin: 0 }}>Track the approval status of your added institutions and programmes.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          
          <select className="form-input" style={{ width: 'auto', padding: '6px 12px', minHeight: '36px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ═══════════ TABLE ═══════════ */}
      <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Status</th>
              <th>Date Submitted</th>
              <th>Notes / Reviewer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  You have no submissions matching these filters.
                </td>
              </tr>
            ) : filteredSubmissions.map(sub => {
               const isPending = sub.status === 'pending'
               const isAppr = sub.status === 'approved'
               const isRej = sub.status === 'rejected'
               const statusColor = isAppr ? '#10b981' : isRej ? '#ef4444' : '#f59e0b'
               const StatusIcon = isAppr ? CheckCircle2 : isRej ? XCircle : Clock

               return (
                <tr key={sub.id}>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      background: '#f1f5f9', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      color: '#475569' 
                    }}>
                      {sub.submission_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.payload?.name || 'Unknown'}</div>
                    {sub.submission_type === 'program' && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Level: {sub.payload?.level}</div>}
                    {sub.submission_type === 'university' && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Country: {sub.payload?.country}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontSize: '0.85rem', fontWeight: 600, background: `${statusColor}15`, width: 'max-content', padding: '4px 10px', borderRadius: '99px' }}>
                      <StatusIcon size={14} /> 
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ maxWidth: '250px' }}>
                    {sub.reviewer_notes ? (
                      <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={14} style={{ color: isRej ? '#ef4444' : '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sub.reviewer_notes}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    {isPending && (
                      <button onClick={() => handleWithdraw(sub.id)} className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2' }}>
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
