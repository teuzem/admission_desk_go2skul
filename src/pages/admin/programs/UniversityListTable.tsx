import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Search, Plus, MapPin, Edit, Eye, Filter, X, ChevronDown, RotateCcw } from 'lucide-react'

interface UniversityListTableProps {
  universities: any[]
  refreshData: () => void
}

export default function UniversityListTable({ universities, refreshData }: UniversityListTableProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    country: 'all',
    status: 'all',
    minRanking: '',
    maxRanking: ''
  })
  const [sortBy, setSortBy] = useState('name-asc')

  // Dynamic filter options
  const countries = useMemo(() => {
    return Array.from(new Set(universities.map(u => u.country).filter(Boolean))).sort()
  }, [universities])

  const filteredUnis = useMemo(() => {
    let result = universities.filter(u => {
      // Search logic - enhanced to split words and match all
      if (search) {
        const queryTerms = search.toLowerCase().split(/\s+/).filter(Boolean)
        const searchableText = `${u.name} ${u.country} ${u.city || ''}`.toLowerCase()
        const matchesSearch = queryTerms.every(term => searchableText.includes(term))
        if (!matchesSearch) return false
      }

      // Country filter
      if (filters.country !== 'all' && u.country !== filters.country) return false

      // Status filter
      if (filters.status !== 'all') {
        const isActive = filters.status === 'active'
        if (u.is_active !== isActive) return false
      }

      // Ranking filter
      const ranking = parseInt(u.ranking) || 0
      if (filters.minRanking && ranking < parseInt(filters.minRanking)) return false
      if (filters.maxRanking && ranking > parseInt(filters.maxRanking)) return false

      return true
    })

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'rank-asc') return (parseInt(a.ranking) || 9999) - (parseInt(b.ranking) || 9999)
      if (sortBy === 'rank-desc') return (parseInt(b.ranking) || 0) - (parseInt(a.ranking) || 0)
      return 0
    })

    return result
  }, [universities, search, filters, sortBy])

  const resetFilters = () => {
    setFilters({
      country: 'all',
      status: 'all',
      minRanking: '',
      maxRanking: ''
    })
    setSearch('')
    setSortBy('name-asc')
  }

  return (
    <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* ═══════════ HEADER & CONTROLS ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={22} style={{ color: '#10b981' }} /> Institutions Directory
          </h2>
          <p className="section-subtitle" style={{ margin: 0 }}>Manage partner universities and their active status.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by name, city or country..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && <X size={14} className="clear-btn" onClick={() => setSearch('')} style={{ cursor: 'pointer', opacity: 0.5 }} />}
          </div>
          <select 
            className="sort-select" 
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.8rem', height: '38px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="rank-asc">Sort: Rank (Best first)</option>
            <option value="rank-desc">Sort: Rank (Lowest first)</option>
          </select>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-outline'} btn-sm`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Filter size={16} /> {isFilterOpen ? 'Hide Filters' : 'Filters'}
            {Object.values(filters).some(v => v !== 'all' && v !== '') && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isFilterOpen ? 'white' : '#10b981' }} />
            )}
          </button>
          <button onClick={() => navigate('/admin/universities/new')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#00CCA0', borderColor: '#00CCA0' }}>
            <Plus size={16} /> Add Institution
          </button>
        </div>
      </div>

      {/* ═══════════ FILTER PANEL ═══════════ */}
      {isFilterOpen && (
        <div className="card-panel" style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '1rem 1.25rem', 
          marginBottom: '1rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          alignItems: 'flex-start', 
          animation: 'slideIn 0.2s ease-out' 
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Country</label>
            <div style={{ position: 'relative' }}>
              <select 
                className="form-input" 
                value={filters.country} 
                onChange={e => setFilters({...filters, country: e.target.value})}
                style={{ paddingRight: '30px' }}
              >
                <option value="all">All Countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Status</label>
            <div style={{ position: 'relative' }}>
              <select 
                className="form-input" 
                value={filters.status} 
                onChange={e => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ flex: '1 1 250px', display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Min Ranking</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="1"
                value={filters.minRanking} 
                onChange={e => setFilters({...filters, minRanking: e.target.value})}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Max Ranking</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="1000"
                value={filters.maxRanking} 
                onChange={e => setFilters({...filters, maxRanking: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={resetFilters}
              className="btn btn-outline btn-sm"
              style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ RESULTS SUMMARY ═══════════ */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Showing <strong>{filteredUnis.length}</strong> {filteredUnis.length === 1 ? 'institution' : 'institutions'}
          {(search || Object.values(filters).some(v => v !== 'all' && v !== '')) && ' (filtered)'}
        </div>
      </div>

      {/* ═══════════ TABLE ═══════════ */}
      <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Institution Name</th>
              <th>Location</th>
              <th>Ranking</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnis.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  No institutions found.
                </td>
              </tr>
            ) : filteredUnis.map(uni => (
              <tr key={uni.id} style={{ opacity: uni.is_active ? 1 : 0.6 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                      {uni.logo_url ? <img src={uni.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Building2 size={16} color="#94a3b8" />}
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{uni.name}</div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {uni.city ? `${uni.city}, ` : ''}{uni.country}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{uni.ranking || '—'}</div>
                </td>
                <td>
                  <span className={`status-badge ${uni.is_active ? 'offer' : 'draft'}`}>
                    {uni.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link to={`/dashboard/university/${uni.slug || uni.id}`} target="_blank" className="action-icon-btn" title="View Portal">
                      <Eye size={16} />
                    </Link>
                    <button onClick={() => navigate(`/admin/universities/edit/${uni.id}`)} className="action-icon-btn" title="Edit">
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
