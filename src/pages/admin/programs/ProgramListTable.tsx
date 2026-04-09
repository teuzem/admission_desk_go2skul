import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Search, Plus, GraduationCap, Edit, Eye, Filter, X } from 'lucide-react'

interface ProgramListTableProps {
  programs: any[]
  universities: any[]
  refreshData: () => void
}

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's", master: "Master's", phd: 'PhD', diploma: 'Diploma',
  certificate: 'Certificate', foundation: 'Foundation',
  undergraduate: 'Undergraduate', postgraduate: 'Postgraduate',
}

export default function ProgramListTable({ programs, universities, refreshData }: ProgramListTableProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [uniFilter, setUniFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

  const uniqueLevels = useMemo(() => Array.from(new Set(programs.map(p => p.level).filter(Boolean))), [programs])

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      if (uniFilter !== 'all' && p.university_id !== uniFilter) return false
      if (levelFilter !== 'all' && p.level !== levelFilter) return false
      
      const q = search.toLowerCase()
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.universities?.name?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [programs, search, uniFilter, levelFilter])

  return (
    <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* ═══════════ HEADER & CONTROLS ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={22} style={{ color: '#10b981' }} /> Programmes Directory
          </h2>
          <p className="section-subtitle" style={{ margin: 0 }}>Manage academic programmes, fees, and intakes.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search programmes..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && <X size={14} className="clear-btn" onClick={() => setSearch('')} style={{ cursor: 'pointer' }} />}
          </div>
          
          <div style={{ position: 'relative' }}>
            <select className="sort-select" style={{ width: 'auto', minWidth: '160px', height: '40px', fontSize: '0.8rem' }} value={uniFilter} onChange={e => setUniFilter(e.target.value)}>
              <option value="all">All Institutions</option>
              {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          
          <div style={{ position: 'relative' }}>
            <select className="sort-select" style={{ width: 'auto', minWidth: '130px', height: '40px', fontSize: '0.8rem' }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="all">All Levels</option>
              {uniqueLevels.map(l => <option key={l} value={l}>{LEVEL_LABELS[l] || l}</option>)}
            </select>
          </div>

          <button onClick={() => navigate('/admin/programs/new')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Programme
          </button>
        </div>
      </div>

      {/* ═══════════ TABLE ═══════════ */}
      <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Programme Name</th>
              <th>Institution</th>
              <th>Level & Duration</th>
              <th>Tuition Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrograms.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  No programmes found matching criteria.
                </td>
              </tr>
            ) : filteredPrograms.map(prog => (
              <tr key={prog.id} style={{ opacity: prog.is_active ? 1 : 0.6 }}>
                <td>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{prog.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Intake: {prog.intake || 'Multiple'}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{prog.universities?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{prog.universities?.country}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GraduationCap size={14} style={{ color: '#10b981' }} /> {LEVEL_LABELS[prog.level] || prog.level}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{prog.duration}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                    {prog.tuition_fee ? `${prog.currency || ''} ${prog.tuition_fee}` : 'Not specified'}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${prog.is_active ? 'offer' : 'draft'}`}>
                    {prog.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link to={`/dashboard/courses/${prog.slug || prog.id}`} target="_blank" className="action-icon-btn" title="View Portal">
                      <Eye size={16} />
                    </Link>
                    <button onClick={() => navigate(`/admin/programs/edit/${prog.id}`)} className="action-icon-btn" title="Edit">
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
