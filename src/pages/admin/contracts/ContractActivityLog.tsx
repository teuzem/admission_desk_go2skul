// Contract Management — Activity Log & Team Notes
import { useState } from 'react'
import { MessageSquare, Pin, Plus, Activity, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { ContractActivity, ContractNote } from './ContractTypes'
import { Spinner } from './ContractUtils'

interface ActivityLogProps {
  activities: ContractActivity[]
}

const ACTION_COLORS: Record<string, string> = {
  approved: '#10b981', rejected: '#64748b', blocked: '#dc2626',
  suspended: '#f97316', revoked: '#ef4444', pending_review: '#f59e0b',
  under_verification: '#3b82f6', information_requested: '#8b5cf6',
}

export function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) {
    return <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>No activity yet.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activities.map((a, idx) => {
        const color = ACTION_COLORS[a.new_status || ''] || '#94a3b8'
        return (
          <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', position: 'relative' }}>
            {idx < activities.length - 1 && (
              <div style={{ position: 'absolute', left: 13, top: 30, bottom: -10, width: 2, background: '#f1f5f9' }} />
            )}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}15`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{a.action}</div>
              {a.reason && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, borderLeft: `3px solid ${color}` }}>{a.reason}</div>}
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                {a.performer ? `${a.performer.first_name ?? ''} ${a.performer.last_name ?? ''}`.trim() || a.performer.email : '—'} · {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface NotesProps {
  contractId: string
  agentId: string
  currentUserId: string
  notes: ContractNote[]
  onRefresh: () => void
}

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'verification', label: 'Verification' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'escalation', label: 'Escalation' },
]

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: '#64748b', verification: '#3b82f6', compliance: '#10b981', investigation: '#f59e0b', escalation: '#ef4444',
}

export function TeamNotes({ contractId, agentId, currentUserId, notes, onRefresh }: NotesProps) {
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!content.trim()) { toast.error('Note cannot be empty'); return }
    setSubmitting(true)
    const { error } = await supabase.from('contract_team_notes' as any).insert({
      contract_id: contractId, agent_id: agentId, author_id: currentUserId,
      note_type: noteType, content: content.trim(),
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to add note'); return }
    toast.success('Note added')
    setContent('')
    setShowForm(false)
    onRefresh()
  }

  const togglePin = async (note: ContractNote) => {
    await supabase.from('contract_team_notes' as any).update({ is_pinned: !note.is_pinned }).eq('id', note.id)
    onRefresh()
  }

  const pinned = notes.filter(n => n.is_pinned)
  const unpinned = notes.filter(n => !n.is_pinned)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} style={{ color: '#3A4391' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Team Notes ({notes.length})</h3>
        </div>
        <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {NOTE_TYPES.map(t => (
              <button key={t.value} onClick={() => setNoteType(t.value)} style={{
                padding: '4px 10px', borderRadius: 8, border: `1px solid ${noteType === t.value ? NOTE_TYPE_COLORS[t.value] : '#e2e8f0'}`,
                background: noteType === t.value ? `${NOTE_TYPE_COLORS[t.value]}15` : 'white',
                color: noteType === t.value ? NOTE_TYPE_COLORS[t.value] : '#64748b',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
          <textarea className="cm-form-textarea" rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="Write a team note..." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="cm-btn cm-btn-primary cm-btn-sm" onClick={handleAdd} disabled={submitting || !content.trim()}>
              {submitting ? <Spinner size={12} /> : <Plus size={12} />} Add Note
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>No notes yet.</div>
      )}

      {[...pinned, ...unpinned].map(note => {
        const color = NOTE_TYPE_COLORS[note.note_type] || '#64748b'
        return (
          <div key={note.id} style={{
            padding: '12px 14px', borderRadius: 10, border: `1px solid ${note.is_pinned ? '#fde68a' : '#f1f5f9'}`,
            background: note.is_pinned ? '#fffbeb' : 'white', marginBottom: 8,
            borderLeft: `3px solid ${color}`, transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {note.is_pinned && <Pin size={11} style={{ color: '#f59e0b' }} />}
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color, background: `${color}15`, padding: '1px 7px', borderRadius: 99 }}>{note.note_type.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.5 }}>{note.content}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                  {note.author ? `${note.author.first_name ?? ''} ${note.author.last_name ?? ''}`.trim() || note.author.email : '—'} · {new Date(note.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => togglePin(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.is_pinned ? '#f59e0b' : '#cbd5e1', padding: 2 }}>
                <Pin size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
