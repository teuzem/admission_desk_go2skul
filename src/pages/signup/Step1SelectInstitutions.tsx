import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignup } from '../../contexts/SignupContext'
import { BookOpen, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const getFlagEmoji = (countryName: string) => {
  const flags: Record<string, string> = {
    'Canada': '🇨🇦',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Ireland': '🇮🇪',
    'Malta': '🇲🇹',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Cyprus': '🇨🇾',
    'South Cyprus': '🇨🇾',
    'India': '🇮🇳',
    'China': '🇨🇳',
    'Caribbean': '🏝️',
    'Australia': '🇦🇺',
  }
  return flags[countryName] || '🌐'
}


export default function Step1SelectInstitutions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, updateData } = useSignup()
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('')
  const [universities, setUniversities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true)
      const { data: result, error } = await supabase
        .from('universities')
        .select('id, name, country, region, city, logo_url')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('[Step1] Failed to load universities:', error.message, error.details, error.hint)
      }

      setUniversities(result || [])
      setLoading(false)
    }

    fetchUniversities()

    const subscription = supabase
      .channel('universities-step1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, () => {
        fetchUniversities()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const REGIONS = [t('signup_wizard.step1.filters.allRegions') || 'All Regions', ...Array.from(new Set(universities.map(u => u.region))).filter(Boolean).sort()]
  const COUNTRIES = [t('signup_wizard.step1.filters.allCountries') || 'All Countries', ...Array.from(new Set(universities.map(u => u.country))).filter(Boolean).sort()]

  const filtered = useMemo(() => {
    return universities.filter(u => {
      const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.country.toLowerCase().includes(search.toLowerCase())
      const matchesRegion = !region || u.region === region
      const matchesCountry = !country || u.country === country
      return matchesSearch && matchesRegion && matchesCountry
    })
  }, [search, region, country, universities])

  const toggleUniversity = (id: string) => {
    const current = data.selectedUniversities
    if (current.includes(id)) {
      updateData({ selectedUniversities: current.filter(x => x !== id) })
    } else {
      updateData({ selectedUniversities: [...current, id] })
    }
  }

  const handleNext = () => {
    navigate('/register/step2')
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div className="wizard-card-title">{t('signup_wizard.step1.subtitle')}</div>
      </div>

      <div className="wizard-card-body">
        {/* Instructions */}
        <div className="wizard-instructions">
          <div className="wizard-instruction-icon">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="wizard-instruction-title">{t('signup_wizard.step1.instructions.title')}</div>
            <div className="wizard-instruction-text">
              <p>{t('signup_wizard.step1.instructions.text')}</p>
              <p className="wizard-note">
                <span className="note-label">{t('common.note') || 'Please note'}:</span>
                {t('signup_wizard.step1.instructions.note')}
                <span className="highlight-blue"> {t('signup_wizard.step1.instructions.link')}</span> {t('signup_wizard.step1.instructions.withGroup')}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.75rem' }}>Available Institutions</div>
        <div className="wizard-uni-filters">
          <select className="wizard-uni-filter-select" value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">{t('signup_wizard.step1.filters.allRegions') || 'All Regions'}</option>
            {Array.from(new Set(universities.map(u => u.region))).filter(Boolean).sort().map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className="wizard-uni-filter-select" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="">{t('signup_wizard.step1.filters.allCountries') || 'All Countries'}</option>
            {Array.from(new Set(universities.map(u => u.country))).filter(Boolean).sort().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="wizard-uni-search-container">
            <input
              type="text"
              placeholder={t('signup_wizard.step1.filters.searchPlaceholder') || "Search for an Institute"}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <span className="clear-icon" onClick={() => setSearch('')}>×</span>
            )}
          </div>
          <div className="wizard-uni-filter-count">
            {t('signup_wizard.step1.selected', { count: data.selectedUniversities.length })}
          </div>
        </div>

        {/* University Grid */}
        <div className="wizard-uni-grid-wrapper">
          <div className="wizard-uni-grid">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="wizard-uni-card" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                  <div className="wizard-uni-logo-area" style={{ background: '#f1f5f9', minHeight: '70px', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div className="wizard-uni-card-bottom" style={{ background: '#f8fafc', borderRadius: '6px', height: '20px', marginTop: '8px' }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 2rem', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏫</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#374151', marginBottom: '0.25rem' }}>
                  {universities.length === 0 ? 'Unable to load institutions' : 'No institutions match your search'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {universities.length === 0
                    ? 'Please check your internet connection and refresh the page.'
                    : 'Try clearing your search or selecting a different region.'}
                </div>
              </div>
            ) : (
              filtered.map(uni => {
                const isSelected = data.selectedUniversities.includes(uni.id)
                return (
                  <div
                    key={uni.id}
                    className={`wizard-uni-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleUniversity(uni.id)}
                  >
                    <div className="wizard-uni-logo-area">
                      <img
                        src={uni.logo_url}
                        alt={uni.name}
                        className="wizard-uni-logo"
                        onError={e => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent && !parent.querySelector('.uni-initial')) {
                            const fallback = document.createElement('div')
                            fallback.className = 'uni-initial'
                            fallback.textContent = uni.name.charAt(0).toUpperCase()
                            fallback.style.cssText = 'width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#3A4391,#00CCA0);display:flex;align-items:center;justify-content:center;color:white;font-size:1.3rem;font-weight:700'
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    </div>
                    <div className="wizard-uni-card-bottom">
                      <div className="wizard-uni-name">{uni.name}</div>
                      <input
                        type="checkbox"
                        className="wizard-uni-checkbox"
                        checked={isSelected}
                        onChange={() => toggleUniversity(uni.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      <div className="wizard-card-footer">
        <button className="wizard-btn-next" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  )
}
