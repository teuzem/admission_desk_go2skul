import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, GraduationCap, MapPin, ExternalLink, CheckCircle2,
  Shield, BookOpen, Clock, ArrowUpDown, Building
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ActivatePartnerModal from './ActivatePartnerModal'
import './DashboardPages.css'
import './StartNewApplicationPage.css'

interface UniversityCard {
  id: string
  name: string
  slug: string | null
  country: string
  city: string | null
  region: string | null
  logo_url: string | null
  description: string | null
  about: string | null
  is_active: boolean
  ranking: string | null
  established: number | null
}

export default function StartNewApplicationPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isSuperAgent = profile?.is_super_agent

  const [universities, setUniversities] = useState<UniversityCard[]>([])
  const [activePartnerIds, setActivePartnerIds] = useState<Set<string>>(new Set())
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [sortAZ, setSortAZ] = useState(true)

  // Debounced search for performance
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 150) // fast debounce
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  // Modal state
  const [activatingUni, setActivatingUni] = useState<UniversityCard | null>(null)

  // Fetch ALL universities + agent's active partner selections + pending requests
  useEffect(() => {
    if (!user?.id) return

    const fetchData = async () => {
      setLoading(true)

      const [uniRes, partnerRes, requestsRes] = await Promise.all([
        supabase
          .from('universities')
          .select('id, name, slug, country, city, region, logo_url, description, about, is_active, ranking, established')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('agent_partner_selections')
          .select('university_id')
          .eq('agent_id', user.id),
        supabase
          .from('partner_activation_requests')
          .select('university_id')
          .eq('agent_id', user.id)
          .eq('status', 'pending'),
      ])

      setUniversities((uniRes.data || []) as unknown as UniversityCard[])
      setActivePartnerIds(new Set((partnerRes.data || []).map((p: any) => p.university_id)))
      setPendingRequestIds(new Set((requestsRes.data || []).map((r: any) => r.university_id)))
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel('start-new-app-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_partner_selections' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_activation_requests' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Compute unique regions/countries
  const REGIONS = useMemo(() =>
    Array.from(new Set(universities.map(u => u.region).filter(Boolean))).sort() as string[],
    [universities]
  )
  const COUNTRIES = useMemo(() =>
    Array.from(new Set(universities.map(u => u.country).filter(Boolean))).sort() as string[],
    [universities]
  )

  // Toggle chip filter
  const toggleRegion = (r: string) => {
    setSelectedRegions(prev => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }
  const toggleCountry = (c: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  // Advanced search: split query into tokens, match across name + country + city + region
  const sortedUniversities = useMemo(() => {
    const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean)

    let list = universities.filter(u => {
      // Text search — all tokens must match somewhere
      if (tokens.length > 0) {
        const haystack = `${u.name} ${u.country} ${u.city || ''} ${u.region || ''} ${u.ranking || ''}`.toLowerCase()
        const allMatch = tokens.every(token => haystack.includes(token))
        if (!allMatch) return false
      }
      // Region chip filter
      if (selectedRegions.size > 0 && (!u.region || !selectedRegions.has(u.region))) return false
      // Country chip filter
      if (selectedCountries.size > 0 && !selectedCountries.has(u.country)) return false
      return true
    })

    // Sort: active first, then alphabetical
    const active = list.filter(u => activePartnerIds.has(u.id))
    const inactive = list.filter(u => !activePartnerIds.has(u.id))

    const sorter = (a: UniversityCard, b: UniversityCard) =>
      sortAZ ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)

    return [...active.sort(sorter), ...inactive.sort(sorter)]
  }, [universities, debouncedSearch, selectedRegions, selectedCountries, activePartnerIds, sortAZ])

  const activeCount = sortedUniversities.filter(u => activePartnerIds.has(u.id)).length
  const inactiveCount = sortedUniversities.filter(u => !activePartnerIds.has(u.id)).length

  const handleStartApplication = (uniId: string) => {
    navigate(`/dashboard/applications/new?university=${uniId}`)
  }

  return (
    <div className="dashboard-page snapp-page" style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div className="snapp-header-bar">
        <button className="snapp-back-btn" onClick={() => navigate('/dashboard/applications')}>
          <ArrowLeft size={20} />
          Create Application
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {activeCount} active partner{activeCount !== 1 ? 's' : ''} &middot; {inactiveCount} available
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="snapp-filters-bar">
        {/* Search + Sort */}
        <div className="snapp-filters-top-row">
          <div className="snapp-search-container">
            <Search size={16} className="snapp-search-icon" />
            <input
              className="snapp-search-input"
              placeholder="Search by name, country, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="snapp-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          <button className="snapp-sort-btn" onClick={() => setSortAZ(!sortAZ)}>
            <ArrowUpDown size={14} />
            {sortAZ ? 'A → Z' : 'Z → A'}
          </button>
        </div>

        {/* Region Chips */}
        {REGIONS.length > 0 && (
          <>
            <div className="snapp-filter-divider" />
            <div className="snapp-filter-chips-section">
              <span className="snapp-filter-chips-label">Region</span>
              <div className="snapp-chips-wrap">
                {REGIONS.map(r => (
                  <button
                    key={r}
                    className={`snapp-chip ${selectedRegions.has(r) ? 'active' : ''}`}
                    onClick={() => toggleRegion(r)}
                  >
                    {r}
                  </button>
                ))}
                {selectedRegions.size > 0 && (
                  <button
                    className="snapp-chip"
                    style={{ color: '#ef4444', borderColor: '#fecaca' }}
                    onClick={() => setSelectedRegions(new Set())}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Country Chips */}
        {COUNTRIES.length > 0 && (
          <>
            <div className="snapp-filter-divider" />
            <div className="snapp-filter-chips-section">
              <span className="snapp-filter-chips-label">Country</span>
              <div className="snapp-chips-wrap">
                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    className={`snapp-chip ${selectedCountries.has(c) ? 'active' : ''}`}
                    onClick={() => toggleCountry(c)}
                  >
                    {c}
                  </button>
                ))}
                {selectedCountries.size > 0 && (
                  <button
                    className="snapp-chip"
                    style={{ color: '#ef4444', borderColor: '#fecaca' }}
                    onClick={() => setSelectedCountries(new Set())}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Active Partners Section */}
      {activeCount > 0 && (
        <>
          <div className="snapp-section-title">
            <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#10b981' }} />
            Your Active Partners ({activeCount})
          </div>
          <div className="snapp-uni-grid">
            {sortedUniversities.filter(u => activePartnerIds.has(u.id)).map(uni => (
              <UniversityCardComponent
                key={uni.id}
                uni={uni}
                isActive={true}
                isPending={false}
                onStartApp={() => handleStartApplication(uni.id)}
                onActivate={() => {}}
                isSuperAgent={!!isSuperAgent}
              />
            ))}
          </div>
        </>
      )}

      {/* Inactive Partners Section */}
      {inactiveCount > 0 && (
        <>
          <div className="snapp-section-title">
            <GraduationCap size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px', color: '#64748b' }} />
            Other Network Universities ({inactiveCount})
          </div>
          <div className="snapp-uni-grid">
            {sortedUniversities.filter(u => !activePartnerIds.has(u.id)).map(uni => (
              <UniversityCardComponent
                key={uni.id}
                uni={uni}
                isActive={false}
                isPending={pendingRequestIds.has(uni.id)}
                onStartApp={() => {}}
                onActivate={() => setActivatingUni(uni)}
                isSuperAgent={!!isSuperAgent}
              />
            ))}
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="snapp-uni-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="snapp-skeleton-card">
              <div className="snapp-skeleton-logo" />
              <div className="snapp-skeleton-text">
                <div className="snapp-skeleton-text-line" />
                <div className="snapp-skeleton-text-line" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedUniversities.length === 0 && (
        <div className="snapp-empty-state">
          <Search size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
          <h3>No universities found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Activation Modal */}
      {activatingUni && user && profile && (
        <ActivatePartnerModal
          university={activatingUni}
          agentId={user.id}
          agentName={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
          agentEmail={profile.email || user.email || ''}
          agencyName={profile.agency_name || ''}
          onClose={() => setActivatingUni(null)}
          onSuccess={() => setActivatingUni(null)}
        />
      )}
    </div>
  )
}

/* ────────── University Card Sub-Component ────────── */
function UniversityCardComponent({
  uni,
  isActive,
  isPending,
  onStartApp,
  onActivate,
  isSuperAgent,
}: {
  uni: UniversityCard
  isActive: boolean
  isPending: boolean
  onStartApp: () => void
  onActivate: () => void
  isSuperAgent: boolean
}) {
  const navigate = useNavigate()
  const excerpt = uni.about || uni.description || `${uni.name} is a prestigious institution located in ${uni.city || uni.country}.`
  const truncated = excerpt.length > 150 ? excerpt.substring(0, 147) + '...' : excerpt

  return (
    <div className={`snapp-uni-card ${isActive ? 'active-partner' : 'inactive-partner'}`}>
      {/* Hover Overlay */}
      <div className="snapp-hover-overlay">
        <p className="snapp-hover-desc">{truncated}</p>
        <button
          className="snapp-hover-viewmore"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/dashboard/university/${uni.slug || uni.id}`)
          }}
        >
          <ExternalLink size={13} /> View more
        </button>
        {isActive ? (
          <button
            className="snapp-hover-action start-app"
            onClick={(e) => { e.stopPropagation(); onStartApp() }}
          >
            <BookOpen size={15} /> Start Application
          </button>
        ) : isPending ? (
          <button className="snapp-hover-action activate" disabled style={{ opacity: 0.6 }}>
            <Clock size={15} /> Pending Approval
          </button>
        ) : isSuperAgent ? (
          <button
            className="snapp-hover-action activate"
            onClick={(e) => { e.stopPropagation(); onActivate() }}
          >
            <Shield size={15} /> Activate Contract
          </button>
        ) : (
          <button className="snapp-hover-action activate" disabled style={{ opacity: 0.5 }}>
            <Shield size={15} /> Contact Super Agent
          </button>
        )}
      </div>

      {/* Logo Area — clean, no filter */}
      <div className="snapp-uni-logo-area">
        {uni.logo_url ? (
          <img
            src={uni.logo_url}
            alt={uni.name}
            onError={e => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.snapp-uni-initial')) {
                const fb = document.createElement('div')
                fb.className = 'snapp-uni-initial'
                fb.textContent = uni.name.charAt(0).toUpperCase()
                parent.appendChild(fb)
              }
            }}
          />
        ) : (
          <div className="snapp-uni-initial">{uni.name.charAt(0).toUpperCase()}</div>
        )}

        {isActive && (
          <div className="snapp-active-badge">
            <CheckCircle2 size={10} /> Active
          </div>
        )}
        {!isActive && isPending && (
          <div className="snapp-pending-badge">
            <Clock size={10} /> Pending
          </div>
        )}
      </div>

      {/* Card Bottom */}
      <div className="snapp-uni-card-bottom">
        <div className="snapp-uni-name">{uni.name}</div>
        <div className="snapp-uni-country">
          {uni.city ? `${uni.city}, ` : ''}{uni.country}
        </div>

        {isActive ? (
          <button className="snapp-card-action start-app" onClick={onStartApp}>
            <BookOpen size={13} /> Start application
          </button>
        ) : isPending ? (
          <button className="snapp-card-action activate" disabled style={{ opacity: 0.6 }}>
            <Clock size={13} /> Pending approval
          </button>
        ) : isSuperAgent ? (
          <button className="snapp-card-action activate" onClick={onActivate}>
            <Shield size={13} /> Activate contract
          </button>
        ) : (
          <button className="snapp-card-action activate" disabled style={{ opacity: 0.5, fontSize: '0.7rem' }}>
            <Shield size={12} /> Super Agent required
          </button>
        )}
      </div>
    </div>
  )
}
