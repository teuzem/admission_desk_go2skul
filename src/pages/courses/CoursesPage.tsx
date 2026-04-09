import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, MapPin, GraduationCap, Building, Clock, ChevronDown, X, BookOpen, Globe, Star, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import '../dashboard/DashboardPages.css'

const FLAG_MAP: Record<string, string> = {
  'Canada': '🇨🇦', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧', 'USA': '🇺🇸', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Ireland': '🇮🇪', 'Malta': '🇲🇹', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
  'South Cyprus': '🇨🇾', 'India': '🇮🇳', 'China': '🇨🇳', 'Caribbean': '🏝️', 'Australia': '🇦🇺',
}
const getFlag = (c: string) => FLAG_MAP[c] || '🌐'

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's", master: "Master's", phd: 'PhD', diploma: 'Diploma',
  certificate: 'Certificate', foundation: 'Foundation',
  certificate_of_higher_education: 'Cert. of Higher Ed.',
  continuing_education: 'Continuing Ed.',
  executive_course: 'Executive Course',
  executive_education: 'Executive Ed.',
  graduate_program: 'Graduate Program',
  management_development: 'Mgmt. Development',
  postgraduate: 'Postgraduate',
  preparatory_program: 'Preparatory',
  professional_qualification: 'Professional Qual.',
  undergraduate: 'Undergraduate',
  undergraduate_foundation: 'UG + Foundation'
}

const LEVEL_COLORS: Record<string, string> = {
  bachelor: '#3A4391', master: '#00CCA0', phd: '#7C3AED', diploma: '#F59E0B',
  certificate: '#EC4899', foundation: '#6366F1',
  certificate_of_higher_education: '#0891b2', continuing_education: '#a855f7',
  executive_course: '#dc2626', executive_education: '#ea580c',
  graduate_program: '#059669', management_development: '#9333ea',
  postgraduate: '#2563eb', preparatory_program: '#64748b',
  professional_qualification: '#b45309', undergraduate: '#0d9488',
  undergraduate_foundation: '#4f46e5'
}

interface Program {
  id: string
  name: string
  level: string
  category: string | null
  duration: string | null
  duration_months: number | null
  tuition_fee: number | null
  currency: string | null
  language: string
  description: string | null
  requirements: string | null
  start_dates: string[]
  intake: string | null
  img_url: string | null
  delivery_mode: string | null
  scholarship_available: boolean | null
  visa_support: boolean | null
  universities: {
    id: string
    name: string
    country: string
    city: string | null
    logo_url: string | null
    ranking: string | null
  } | null
}

export default function CoursesPage() {
  const { user, profile } = useAuth()
  const effectiveId = profile?.effective_agency_id || user?.id
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [maxTuition, setMaxTuition] = useState<number>(100000)
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchPrograms = async () => {
      setLoading(true)
      // Get agent's selected partner university IDs
      const { data: partners } = await supabase
        .from('agent_partner_selections')
        .select('university_id')
        .eq('agent_id', effectiveId)

      let query = supabase
        .from('programs')
        .select(`
          id, name, level, category, duration, duration_months,
          tuition_fee, currency, language, description, requirements,
          start_dates, intake, img_url, delivery_mode, scholarship_available, visa_support,
          universities!inner(id, name, country, city, logo_url, ranking)
        `)
        .eq('is_active', true)

      if (partners && partners.length > 0) {
        const uniIds = partners.map((p: any) => p.university_id)
        query = query.in('university_id', uniIds)
      }

      const { data, error } = await query
      if (!error && data) setPrograms(data as any)
      setLoading(false)
    }
    fetchPrograms()

    const channel = supabase.channel('programs-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, fetchPrograms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, fetchPrograms)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, profile?.effective_agency_id])

  // Compute unique filter values
  const allCountries = useMemo(() => Array.from(new Set(programs.map(p => p.universities?.country).filter(Boolean))).sort() as string[], [programs])
  const allCategories = useMemo(() => Array.from(new Set(programs.map(p => p.category).filter(Boolean))).sort() as string[], [programs])

  const toggleFilter = (val: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCountries([])
    setSelectedLevels([])
    setSelectedCategories([])
    setMaxTuition(100000)
    setSortBy('relevance')
  }

  const filtered = useMemo(() => {
    let result = programs.filter(p => {
      const q = searchTerm.toLowerCase()
      if (q && !p.name.toLowerCase().includes(q) && !p.universities?.name.toLowerCase().includes(q) && !(p.category || '').toLowerCase().includes(q)) return false
      if (selectedCountries.length > 0 && !selectedCountries.includes(p.universities?.country || '')) return false
      if (selectedLevels.length > 0 && !selectedLevels.includes(p.level)) return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category || '')) return false
      if (p.tuition_fee && p.tuition_fee > maxTuition) return false
      return true
    })

    if (sortBy === 'tuition_asc') result.sort((a, b) => (a.tuition_fee || 0) - (b.tuition_fee || 0))
    else if (sortBy === 'tuition_desc') result.sort((a, b) => (b.tuition_fee || 0) - (a.tuition_fee || 0))
    else if (sortBy === 'duration_asc') result.sort((a, b) => (a.duration_months || 99) - (b.duration_months || 99))
    else if (sortBy === 'name_az') result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [programs, searchTerm, selectedCountries, selectedLevels, selectedCategories, maxTuition, sortBy])

  const activeFilterCount = selectedCountries.length + selectedLevels.length + selectedCategories.length + (maxTuition < 100000 ? 1 : 0)

  const formatTuition = (fee: number | null, currency: string | null) => {
    if (!fee) return 'Contact us'
    return `${currency || 'USD'} ${fee.toLocaleString()}/yr`
  }

  return (
    <div className="dashboard-page" style={{ padding: '2rem 2.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Programmes & Courses</h1>
          <p className="page-subtitle">
            Explore degrees, diplomas, and certificates at your partner institutions worldwide.
          </p>
        </div>
      </div>

      {/* Top Search Bar */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #e2e8f0' }}>
        <div className="input-wrapper input-with-icon-left" style={{ flex: 1 }}>
          <span className="input-icon-left"><Search size={18} /></span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by course name, university, or subject area..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ borderRadius: '10px', paddingLeft: '2.5rem', fontSize: '0.95rem' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            background: showFilters ? 'var(--color-primary)' : 'white',
            color: showFilters ? 'white' : 'var(--color-text-primary)',
            border: showFilters ? 'none' : '1.5px solid #e2e8f0',
            borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <SlidersHorizontal size={16} />
          Filters {activeFilterCount > 0 && <span style={{ background: showFilters ? 'rgba(255,255,255,0.3)' : 'var(--color-primary)', color: showFilters ? 'white' : 'white', borderRadius: '99px', padding: '1px 7px', fontSize: '11px' }}>{activeFilterCount}</span>}
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '200px', borderRadius: '10px', fontSize: '0.9rem' }}
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="tuition_asc">Tuition: Low to High</option>
          <option value="tuition_desc">Tuition: High to Low</option>
          <option value="duration_asc">Duration: Shortest First</option>
          <option value="name_az">Name: A-Z</option>
        </select>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {/* Country Filter */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Destination Country</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allCountries.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleFilter(c, selectedCountries, setSelectedCountries)}
                    style={{
                      padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                      background: selectedCountries.includes(c) ? 'var(--color-primary)' : '#f1f5f9',
                      color: selectedCountries.includes(c) ? 'white' : '#475569',
                      border: 'none', transition: 'all 0.15s'
                    }}
                  >
                    {getFlag(c)} {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Study Level</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key, selectedLevels, setSelectedLevels)}
                    style={{
                      padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                      background: selectedLevels.includes(key) ? LEVEL_COLORS[key] : '#f1f5f9',
                      color: selectedLevels.includes(key) ? 'white' : '#475569',
                      border: 'none', transition: 'all 0.15s'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            {allCategories.length > 0 && (
              <div>
                <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Subject Area</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                      style={{
                        padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                        background: selectedCategories.includes(cat) ? '#00CCA0' : '#f1f5f9',
                        color: selectedCategories.includes(cat) ? 'white' : '#475569',
                        border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tuition Range */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                Max Annual Tuition: <strong style={{ color: 'var(--color-primary)' }}>{maxTuition >= 100000 ? 'Any' : `$${maxTuition.toLocaleString()}`}</strong>
              </label>
              <input
                type="range" min={5000} max={100000} step={5000}
                value={maxTuition}
                onChange={e => setMaxTuition(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                <span>$5,000</span><span>$100,000+</span>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button onClick={clearFilters} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer', color: '#64748b', fontWeight: 500 }}>
                <X size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          {loading ? 'Loading programmes...' : `Showing ${filtered.length} of ${programs.length} programmes`}
        </p>
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ height: '160px', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ height: '1rem', background: '#f1f5f9', borderRadius: '4px', marginBottom: '0.75rem', width: '80%' }} />
                <div style={{ height: '0.75rem', background: '#f8fafc', borderRadius: '4px', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <BookOpen size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem', color: '#334155' }}>No programmes found</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            {programs.length === 0
              ? 'Complete your KYC and select partner institutions to see their programmes here.'
              : 'Try adjusting your search filters to find matching programmes.'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="btn btn-outline btn-sm">Clear Filters</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(program => (
            <div
              key={program.id}
              style={{
                background: 'white', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
                transition: 'all 0.25s', cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)', e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)', e.currentTarget.style.transform = 'translateY(0)')}
            >
              {/* Image */}
              <div style={{
                height: '160px',
                backgroundImage: `url(${program.img_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600'})`,
                backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <span style={{
                    background: LEVEL_COLORS[program.level] || '#64748b', color: 'white',
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', letterSpacing: '0.5px'
                  }}>
                    {LEVEL_LABELS[program.level] || program.level}
                  </span>
                </div>
                {program.universities?.logo_url && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', width: '40px', height: '40px', background: 'white', borderRadius: '8px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={program.universities.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {program.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.82rem', marginBottom: '3px' }}>
                  <Building size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, color: '#475569' }}>{program.universities?.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '14px' }}>{getFlag(program.universities?.country || '')}</span>
                  <span>{program.universities?.city ? `${program.universities.city}, ` : ''}{program.universities?.country}</span>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                      <Clock size={9} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Duration
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{program.duration || `${program.duration_months}mo`}</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>💰 Tuition</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{formatTuition(program.tuition_fee, program.currency)}</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>📅 Intake</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{program.start_dates?.[0] || program.intake || 'TBC'}</div>
                  </div>
                </div>

                {/* Feature tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {program.delivery_mode && program.delivery_mode !== 'on-campus' && (
                    <span style={{ background: '#ecfeff', color: '#0891b2', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                      {program.delivery_mode === 'online' ? '💻 Online' : '🔄 Hybrid'}
                    </span>
                  )}
                  {program.visa_support && (
                    <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                      ✈️ Visa Support
                    </span>
                  )}
                  {program.scholarship_available && (
                    <span style={{ background: '#faf5ff', color: '#7c3aed', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                      🎓 Scholarship
                    </span>
                  )}
                  {program.language && program.language !== 'English' && (
                    <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500 }}>
                      🗣 {program.language}
                    </span>
                  )}
                  {program.category && (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500 }}>
                      {program.category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    to={`/dashboard/courses/${program.id}`}
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/dashboard/applications/new?program=${program.id}&university=${program.universities?.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
