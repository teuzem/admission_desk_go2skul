import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Search, Eye, Mail, Phone, Globe, Calendar,
  FileText, ChevronDown, ChevronUp, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminHeader from '../../components/layout/AdminHeader'
import AdminFooter from '../../components/layout/AdminFooter'
import '../dashboard/DashboardPages.css'
import './AdminPages.css'

export default function AdminStudents() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [studentRes, appRes] = await Promise.all([
      supabase.from('students').select('*, profiles!agent_id(first_name, last_name, email, agency_name)').order('created_at', { ascending: false }),
      supabase.from('applications').select('id, status, created_at, student_id, universities(name), programs(name, level)').order('created_at', { ascending: false })
    ])
    setStudents(studentRes.data || [])
    setApplications(appRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const nationalities = [...new Set(students.map(s => s.nationality).filter(Boolean))].sort()

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(q)
    const matchNat = !nationalityFilter || s.nationality === nationalityFilter
    return matchSearch && matchNat
  })

  const getStudentApps = (studentId: string) => applications.filter(a => a.student_id === studentId)

  const startEdit = (student: any) => {
    setEditingStudent(student.id)
    setEditForm({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      email: student.email || '',
      phone: student.phone || '',
      nationality: student.nationality || '',
      date_of_birth: student.date_of_birth || '',
      passport_number: student.passport_number || ''
    })
  }

  const saveEdit = async () => {
    if (!editingStudent) return
    setSaving(true)
    const { error } = await supabase.from('students').update(editForm).eq('id', editingStudent)
    setSaving(false)
    if (error) return
    setEditingStudent(null)
    fetchData()
  }

  const AppStatusColors: Record<string, string> = {
    draft: '#94a3b8', submitted: '#3b82f6', under_review: '#f59e0b',
    offer: '#10b981', accepted: '#059669', rejected: '#ef4444', enrolled: '#8b5cf6'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />
      
      <main style={{ flex: 1, padding: '2rem 2.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => navigate('/admin')} className="admin-back-btn"><ArrowLeft size={16} /> Admin</button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Student Management</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-search-box">
            <Search size={16} />
            <input placeholder="Search students by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input admin-filter-select" value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)}>
            <option value="">All Nationalities</option>
            {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Student List */}
        <div className="card-panel" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Contact</th>
                  <th>Nationality</th>
                  <th>Agent / Agency</th>
                  <th>Applications</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading students...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No students found.</td></tr>
                ) : filtered.map(student => {
                  const apps = getStudentApps(student.id)
                  const isExpanded = expandedStudent === student.id
                  const isEditing = editingStudent === student.id
                  const agent = student.profiles as any

                  return (
                    <tr key={student.id} className="admin-expandable-row">
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{student.first_name} {student.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.passport_number ? `Passport: ${student.passport_number}` : ''}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem', color: '#475569' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {student.email}</span>
                          {student.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {student.phone}</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: '#475569' }}>{student.nationality || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.85rem' }}>{agent?.first_name} {agent?.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{agent?.agency_name || agent?.email}</div>
                      </td>
                      <td>
                        <span className="admin-count-badge">{apps.length}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="admin-icon-btn" onClick={() => setExpandedStudent(isExpanded ? null : student.id)} title="View details">
                            {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                          </button>
                          <button className="admin-icon-btn" onClick={() => isEditing ? setEditingStudent(null) : startEdit(student)} title="Edit student">
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Details */}
          {expandedStudent && (() => {
            const student = filtered.find(s => s.id === expandedStudent)
            if (!student) return null
            const apps = getStudentApps(student.id)
            const isEditing = editingStudent === student.id

            return (
              <div className="admin-expanded-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    {student.first_name} {student.last_name} — Details
                  </h3>
                  <button onClick={() => { setExpandedStudent(null); setEditingStudent(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
                </div>

                {isEditing ? (
                  <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    {['first_name', 'last_name', 'email', 'phone', 'nationality', 'date_of_birth', 'passport_number'].map(field => (
                      <div key={field} className="form-group">
                        <label className="form-label">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                        <input className="form-input" type={field === 'date_of_birth' ? 'date' : field === 'email' ? 'email' : 'text'}
                          value={editForm[field]} onChange={e => setEditForm((p: any) => ({ ...p, [field]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="form-group form-grid-full" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" onClick={() => setEditingStudent(null)}>Cancel</button>
                      <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="review-grid" style={{ marginBottom: '1rem' }}>
                    {[
                      ['Email', student.email], ['Phone', student.phone || '—'],
                      ['Nationality', student.nationality || '—'], ['DOB', student.date_of_birth || '—'],
                      ['Passport', student.passport_number || '—'],
                      ['Registered', new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
                    ].map(([k, v]) => (
                      <div key={k as string} className="review-item">
                        <div className="review-label">{k}</div>
                        <div className="review-value">{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {apps.length > 0 && (
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>Applications ({apps.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {apps.map(app => (
                        <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                          <div>
                            <span style={{ fontWeight: 500, fontSize: '0.85rem', color: '#1e293b' }}>{(app.programs as any)?.name || '—'}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>{(app.universities as any)?.name}</span>
                          </div>
                          <span style={{ background: `${AppStatusColors[app.status]}18`, color: AppStatusColors[app.status], fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', border: `1px solid ${AppStatusColors[app.status]}30` }}>
                            {app.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
      </main>
      <AdminFooter />
    </div>
  )
}
