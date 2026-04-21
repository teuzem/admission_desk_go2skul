import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, MapPin, Building, Clock, Globe, BookOpen, CheckCircle2,
  Calendar, Users, Award, ExternalLink, GraduationCap, ChevronRight,
  Star, Globe2, Phone, Mail, Send
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import '../dashboard/DashboardPages.css'
import './UniversityDetailPage.css'

const FLAG_MAP: Record<string, string> = {
  'Canada': '🇨🇦', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧', 'USA': '🇺🇸', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Ireland': '🇮🇪', 'Malta': '🇲🇹', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
  'South Cyprus': '🇨🇾', 'India': '🇮🇳', 'China': '🇨🇳', 'Caribbean': '🏝️', 'Australia': '🇦🇺',
}

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's Degree", master: "Master's Degree", phd: 'PhD / Doctorate',
  diploma: 'Diploma', certificate: 'Certificate', foundation: 'Foundation Programme'
}

const LEVEL_COLORS: Record<string, string> = {
  bachelor: '#3A4391', master: '#00CCA0', phd: '#7C3AED',
  diploma: '#F59E0B', certificate: '#EC4899', foundation: '#6366F1'
}

interface UniversityDetail {
  id: string
  name: string
  country: string
  city: string | null
  logo_url: string | null
  image_url: string | null
  website_url: string | null
  description: string | null
  established: number | null
  ranking: string | null
  accreditation: string | null
  student_count: number | null
  acceptance_rate: number | null
  address: string | null
  phone: string | null
  email: string | null
  is_multisite: boolean
}

interface CampusData {
  id: string
  campus_name: string
  country: string
  city: string | null
  region: string | null
  address: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  student_count: number | null
  is_main: boolean
}

interface ProgramRow {
  id: string
  slug: string | null
  name: string
  level: string
  category: string | null
  duration: string | null
  tuition_fee: number | null
  currency: string | null
  language: string
  description: string | null
  img_url: string | null
  is_all_campuses: boolean
}

export default function UniversityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [university, setUniversity] = useState<UniversityDetail | null>(null)
  const [campuses, setCampuses] = useState<CampusData[]>([])
  const [activeCampusId, setActiveCampusId] = useState<string>('all')
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [programAssignments, setProgramAssignments] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const scrollToContact = () => {
    const contactSection = document.querySelector('.uni-contact-card');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      contactSection.classList.add('highlight-flash');
      setTimeout(() => contactSection.classList.remove('highlight-flash'), 2000);
    }
  }

  const handleContactClick = () => {
    const activeCampus = campuses.find(c => c.id === activeCampusId)
    const targetEmail = activeCampus?.email || university?.email
    const targetName = activeCampus?.campus_name || university?.name

    if (targetEmail) {
      window.location.href = `mailto:${targetEmail}?subject=Inquiry regarding Admission to ${targetName}`;
    } else {
      scrollToContact();
    }
  }

  useEffect(() => {
    if (!slug) return

    const fetchUniversityData = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
      const { data: uniData, error: uniError } = await (isUUID 
        ? supabase.from('universities').select('*').eq('id', slug as string)
        : supabase.from('universities').select('*').eq('slug', slug as string)
      ).single();

      if (uniError || !uniData) {
        setLoading(false)
        return
      }

      setUniversity(uniData as unknown as UniversityDetail)
      const uniId = uniData.id

      // Fetch campuses if multisite
      if (uniData.is_multisite) {
        const { data: campData } = await supabase
          .from('university_campuses')
          .select('*')
          .eq('university_id', uniId)
          .order('is_main', { ascending: false })
        
        if (campData) {
          setCampuses(campData as CampusData[])
        }
      }

      // Fetch all programs for this university
      const { data: progData } = await supabase
        .from('programs')
        .select('id, slug, name, level, category, duration, tuition_fee, currency, language, description, img_url, is_all_campuses')
        .eq('university_id', uniId)
        .eq('is_active', true)

      if (progData) {
        setPrograms(progData as ProgramRow[])
        
        // If multisite, fetch program-campus assignments
        if (uniData.is_multisite) {
          const progIds = progData.map(p => p.id)
          if (progIds.length > 0) {
            const { data: assignData } = await supabase
              .from('program_campus_assignments')
              .select('program_id, campus_id')
              .in('program_id', progIds)
            
            if (assignData) {
              const mapping: Record<string, string[]> = {}
              assignData.forEach(a => {
                if (!mapping[a.program_id]) mapping[a.program_id] = []
                mapping[a.program_id].push(a.campus_id)
              })
              setProgramAssignments(mapping)
            }
          }
        }
      }

      setLoading(false)
    }

    fetchUniversityData()

    // ═══════════ REAL-TIME SUBSCRIPTIONS ═══════════
    const uniSub = supabase.channel(`uni-page-sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, () => fetchUniversityData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'university_campuses' }, () => fetchUniversityData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, () => fetchUniversityData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'program_campus_assignments' }, () => fetchUniversityData())
      .subscribe()

    return () => {
      supabase.removeChannel(uniSub)
    }
  }, [slug])

  const filteredPrograms = programs.filter(p => {
    // Level filter
    const matchesLevel = filterLevel === 'all' || p.level === filterLevel
    
    // Search filter
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Campus filter (if multisite)
    let matchesCampus = true
    if (university?.is_multisite && activeCampusId !== 'all') {
      if (!p.is_all_campuses) {
        const assignedCampuses = programAssignments[p.id] || []
        matchesCampus = assignedCampuses.includes(activeCampusId)
      }
    }

    return matchesLevel && matchesSearch && matchesCampus
  })

  const activeCampus = campuses.find(c => c.id === activeCampusId)

  const formatCurrency = (fee: number | null, currency: string | null) => {
    if (!fee) return t('courses.tags.contactUs')
    return `${currency || 'USD'} ${fee.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="dashboard-page uni-detail-page">
        <div className="uni-detail-container">
          <div className="uni-loading">
            <div className="spinner" />
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!university) {
    return (
      <div className="dashboard-page uni-detail-page">
        <div className="uni-detail-container">
          <div className="uni-not-found">
            <GraduationCap size={64} />
            <h2>University not found</h2>
            <Link to="/dashboard/courses" className="btn btn-primary">
              {t('courseDetail.backToCourses')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page uni-detail-page">
      {/* Hero Banner */}
      <div className="uni-hero">
        <div
          className="uni-hero-bg"
          style={{
            backgroundImage: `url(${university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1400'})`
          }}
        />
        <div className="uni-hero-overlay" />
        <div className="uni-hero-content">
          <div className="uni-hero-container">
            <Link to="/dashboard/courses" className="uni-breadcrumb">
              <ArrowLeft size={18} />
              {t('courses.title')}
            </Link>

            <div className="uni-hero-main">
              <div className="uni-logo-wrapper">
                {university.logo_url ? (
                  <img 
                    src={university.logo_url} 
                    alt={university.name} 
                    className="uni-logo" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="uni-logo-placeholder">
                    <GraduationCap size={40} />
                  </div>
                )}
              </div>

              <div className="uni-hero-info">
                <div className="uni-hero-badges">
                  <span className="uni-badge">
                    <Star size={12} />
                    {university.ranking || 'Partner Institution'}
                  </span>
                  {university.is_multisite && (
                    <span className="uni-badge multisite-badge">
                      <Building size={12} />
                      Multisite ({campuses.length} Campuses)
                    </span>
                  )}
                  {university.established && (
                    <span className="uni-badge">
                      <Clock size={12} />
                      Est. {university.established}
                    </span>
                  )}
                </div>

                <h1 className="uni-hero-title">{university.name}</h1>

                <div className="uni-hero-location">
                  <MapPin size={18} />
                  <span>{FLAG_MAP[university.country] || '🌐'} {university.city ? `${university.city}, ` : ''}{university.country}</span>
                </div>

                { (university.student_count || (university.is_multisite && campuses.length > 0)) && (
                  <div className="uni-hero-stats">
                    <div className="uni-hero-stat">
                      <Users size={20} />
                      <span>{university.is_multisite 
                        ? `${campuses.reduce((acc, c) => acc + (c.student_count || 0), 0).toLocaleString()}+ Students` 
                        : `${university.student_count?.toLocaleString() || 'N/A'}+ Students`}</span>
                    </div>
                    {university.acceptance_rate && (
                      <div className="uni-hero-stat">
                        <Award size={20} />
                        <span>{university.acceptance_rate}% Acceptance</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="uni-hero-actions">
                  {university.website_url && (
                    <a
                      href={university.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-lg"
                    >
                      <ExternalLink size={18} />
                      University Website
                    </a>
                  )}
                  <button 
                    onClick={handleContactClick}
                    className="btn btn-primary btn-lg"
                  >
                    <Send size={18} />
                    Contact University
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="uni-detail-container">
        <div className="uni-content-grid">
          {/* Left Column - About & Programs */}
          <div className="uni-main-column">
            {/* About & Campus Section */}
            <section className="uni-section">
              <div className="uni-section-header">
                <BookOpen size={24} />
                <h2>{t('University Profile')}</h2>
              </div>
              <div className="uni-about-content">
                <p>{university.description || `Discover ${university.name}, a leading institution dedicated to academic excellence.`}</p>

                {/* Multisite Campus Explorer */}
                {university.is_multisite && campuses.length > 0 && (
                  <div className="uni-campus-explorer">
                    <div className="explorer-header">
                      <div className="explorer-title">
                        <Globe size={18} />
                        <h3>Campus Explorer</h3>
                      </div>
                      <p className="explorer-subtitle">Explore details and programmes specific to each location.</p>
                    </div>

                    <div className="uni-campus-tabs">
                      <button 
                        className={`uni-campus-tab ${activeCampusId === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveCampusId('all')}
                      >
                        <Globe size={16} /> All Locations
                      </button>
                      {campuses.map(campus => (
                        <button 
                          key={campus.id}
                          className={`uni-campus-tab ${activeCampusId === campus.id ? 'active' : ''}`}
                          onClick={() => setActiveCampusId(campus.id)}
                        >
                          <Building size={16} /> {campus.campus_name}
                          {campus.is_main && <span className="main-tag">Main</span>}
                        </button>
                      ))}
                    </div>

                    {/* Active Campus Detail View */}
                    <div className="uni-active-campus-view animate-in" key={activeCampusId}>
                      {activeCampusId === 'all' ? (
                        <div className="all-campuses-summary">
                          <div className="summary-grid">
                            {campuses.map(c => (
                              <div key={c.id} className="summary-card" onClick={() => setActiveCampusId(c.id)}>
                                <div className="summary-card-icon">
                                  {c.is_main ? <Star size={20} fill="#3A4391" /> : <MapPin size={20} />}
                                </div>
                                <div className="summary-card-info">
                                  <h4>{c.campus_name}</h4>
                                  <span>{c.city}, {c.country}</span>
                                </div>
                                <ChevronRight size={18} className="summary-arrow" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : activeCampus && (
                        <div className="campus-detailed-profile">
                          <div className="profile-main-info">
                            <div className="profile-header">
                              <div className="profile-title">
                                <h4>{activeCampus.campus_name} Campus</h4>
                                {activeCampus.is_main && <span className="main-label">Flagship Campus</span>}
                              </div>
                              <div className="profile-location">
                                <MapPin size={16} />
                                <span>{activeCampus.address || `${activeCampus.city}, ${activeCampus.country}`}</span>
                              </div>
                            </div>
                            
                            <div className="profile-stats">
                              <div className="profile-stat">
                                <Users size={18} />
                                <div>
                                  <span className="stat-val">{activeCampus.student_count?.toLocaleString() || 'N/A'}</span>
                                  <span className="stat-lab">Students</span>
                                </div>
                              </div>
                              {activeCampus.phone && (
                                <div className="profile-stat">
                                  <Phone size={18} />
                                  <div>
                                    <span className="stat-val">Contact</span>
                                    <span className="stat-lab">{activeCampus.phone}</span>
                                  </div>
                                </div>
                              )}
                              {activeCampus.email && (
                                <div className="profile-stat">
                                  <Mail size={18} />
                                  <div>
                                    <span className="stat-val">Email</span>
                                    <span className="stat-lab">{activeCampus.email}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {activeCampus.website_url && (
                            <a href={activeCampus.website_url} target="_blank" rel="noopener noreferrer" className="campus-web-link">
                              <ExternalLink size={16} />
                              Visit Campus Page
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Facts */}
                <div className="uni-quick-facts">
                  {university.established && (
                    <div className="uni-fact">
                      <span className="uni-fact-label">Established</span>
                      <span className="uni-fact-value">{university.established}</span>
                    </div>
                  )}
                  {university.accreditation && (
                    <div className="uni-fact">
                      <span className="uni-fact-label">Accreditation</span>
                      <span className="uni-fact-value">{university.accreditation}</span>
                    </div>
                  )}
                  <div className="uni-fact">
                    <span className="uni-fact-label">Total Students</span>
                    <span className="uni-fact-value">
                      {university.is_multisite 
                        ? `${campuses.reduce((acc, c) => acc + (c.student_count || 0), 0).toLocaleString()}+`
                        : `${university.student_count?.toLocaleString() || 'N/A'}+`}
                    </span>
                  </div>
                  {university.acceptance_rate && (
                    <div className="uni-fact">
                      <span className="uni-fact-label">Acceptance Rate</span>
                      <span className="uni-fact-value">{university.acceptance_rate}%</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Programs Section */}
            <section className="uni-section">
              <div className="uni-section-header">
                <GraduationCap size={24} />
                <h2>
                  {activeCampusId === 'all' 
                    ? 'Available Programmes' 
                    : `Programmes at ${activeCampus?.campus_name}`
                  } ({filteredPrograms.length})
                </h2>
              </div>

              {/* Filters */}
              <div className="uni-program-filters">
                <div className="uni-search-box">
                  <Globe2 size={18} />
                  <input
                    type="text"
                    placeholder="Search programmes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="uni-level-filters">
                  <button
                    className={`uni-level-btn ${filterLevel === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterLevel('all')}
                  >
                    All
                  </button>
                  <button
                    className={`uni-level-btn ${filterLevel === 'bachelor' ? 'active' : ''}`}
                    onClick={() => setFilterLevel('bachelor')}
                    style={{ '--level-color': LEVEL_COLORS.bachelor } as React.CSSProperties}
                  >
                    Bachelor's
                  </button>
                  <button
                    className={`uni-level-btn ${filterLevel === 'master' ? 'active' : ''}`}
                    onClick={() => setFilterLevel('master')}
                    style={{ '--level-color': LEVEL_COLORS.master } as React.CSSProperties}
                  >
                    Master's
                  </button>
                  <button
                    className={`uni-level-btn ${filterLevel === 'phd' ? 'active' : ''}`}
                    onClick={() => setFilterLevel('phd')}
                    style={{ '--level-color': LEVEL_COLORS.phd } as React.CSSProperties}
                  >
                    PhD
                  </button>
                  <button
                    className={`uni-level-btn ${filterLevel === 'diploma' ? 'active' : ''}`}
                    onClick={() => setFilterLevel('diploma')}
                    style={{ '--level-color': LEVEL_COLORS.diploma } as React.CSSProperties}
                  >
                    Diploma
                  </button>
                </div>
              </div>

              {/* Programs Grid */}
              {filteredPrograms.length === 0 ? (
                <div className="uni-no-programs">
                  <GraduationCap size={48} />
                  <p>No programmes found matching your criteria.</p>
                  <button
                    className="btn btn-outline"
                    onClick={() => { setFilterLevel('all'); setSearchQuery('') }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="uni-programs-grid">
                  {filteredPrograms.map(program => (
                    <Link
                      key={program.id}
                      to={`/dashboard/courses/${program.slug || program.id}`}
                      className="uni-program-card"
                    >
                      <div className="uni-program-image">
                        <img
                          src={program.img_url || university?.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600'}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const fallback = university?.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600';
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                          alt={program.name}
                        />
                        <span
                          className="uni-program-level"
                          style={{ background: LEVEL_COLORS[program.level] || '#64748b' }}
                        >
                          {LEVEL_LABELS[program.level] || program.level}
                        </span>
                      </div>

                      <div className="uni-program-content">
                        <h3 className="uni-program-name">{program.name}</h3>

                        {program.category && (
                          <span className="uni-program-category">{program.category}</span>
                        )}

                        <div className="uni-program-meta">
                          <span>
                            <Clock size={14} />
                            {program.duration || 'Contact for details'}
                          </span>
                          <span>
                            <Globe size={14} />
                            {program.language}
                          </span>
                        </div>

                        <div className="uni-program-footer">
                          <div className="uni-program-fee">
                            <span className="fee-label">Tuition</span>
                            <span className="fee-value">
                              {program.tuition_fee
                                ? `${program.currency || 'USD'} ${program.tuition_fee.toLocaleString()}`
                                : t('courses.tags.contactUs')
                              }
                              {program.tuition_fee && <span className="fee-period">/yr</span>}
                            </span>
                          </div>
                          <span className="uni-program-cta">
                            View Details <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Contact & Info */}
          <div className="uni-side-column">
            {/* Contact Card */}
            <div className="uni-contact-card">
              <h3>Contact Information</h3>

              <div className="uni-contact-items">
                {university.website_url && (
                  <a href={university.website_url} target="_blank" rel="noopener noreferrer" className="uni-contact-item">
                    <Globe size={18} />
                    <span>{university.website_url.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {university.email && (
                  <a href={`mailto:${university.email}`} className="uni-contact-item">
                    <Mail size={18} />
                    <span>{university.email}</span>
                  </a>
                )}
                {university.phone && (
                  <a href={`tel:${university.phone}`} className="uni-contact-item">
                    <Phone size={18} />
                    <span>{university.phone}</span>
                  </a>
                )}
                {university.address && (
                  <div className="uni-contact-item">
                    <MapPin size={18} />
                    <span>{university.address}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={handleContactClick}
                className="btn btn-primary btn-block"
              >
                <Send size={18} />
                Request Information
              </button>
            </div>

            {/* Stats Card */}
            <div className="uni-stats-card">
              <h3>University Statistics</h3>
              <div className="uni-stats-grid">
                <div className="uni-stat-item">
                  <Users size={24} />
                  <div className="uni-stat-value">
                    {university.is_multisite 
                      ? campuses.reduce((acc, c) => acc + (c.student_count || 0), 0).toLocaleString()
                      : university.student_count?.toLocaleString() || 'N/A'}+
                  </div>
                  <div className="uni-stat-label">Students</div>
                </div>
                {university.acceptance_rate && (
                  <div className="uni-stat-item">
                    <Award size={24} />
                    <div className="uni-stat-value">{university.acceptance_rate}%</div>
                    <div className="uni-stat-label">Acceptance</div>
                  </div>
                )}
                <div className="uni-stat-item">
                  <GraduationCap size={24} />
                  <div className="uni-stat-value">{programs.length}</div>
                  <div className="uni-stat-label">Programmes</div>
                </div>
                <div className="uni-stat-item">
                  <Building size={24} />
                  <div className="uni-stat-value">{university.is_multisite ? campuses.length : 1}</div>
                  <div className="uni-stat-label">{university.is_multisite ? 'Campuses' : 'Campus'}</div>
                </div>
              </div>
            </div>

            {/* Apply CTA */}
            <div className="uni-apply-cta">
              <GraduationCap size={32} />
              <h3>Ready to Apply?</h3>
              <p>Submit your student's application to {university.name} through our streamlined platform.</p>
              <Link to={`/dashboard/applications/new?university=${university.id}`} className="btn btn-primary btn-block">
                Start Application
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
