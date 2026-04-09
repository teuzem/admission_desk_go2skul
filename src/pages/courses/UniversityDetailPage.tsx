import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, MapPin, Building, Clock, Globe, BookOpen, CheckCircle2,
  Calendar, Users, Award, ExternalLink, GraduationCap, ChevronRight,
  Star, Trophy, Globe2, Mail, Phone, FileText, Shield, Wifi,
  Home, Briefcase, TrendingUp, Percent
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import '../dashboard/DashboardPages.css'
import './UniversityDetailPage.css'

const FLAG_MAP: Record<string, string> = {
  'Canada': '🇨🇦', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧', 'USA': '🇺🇸',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Ireland': '🇮🇪', 'Malta': '🇲🇹',
  'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'South Cyprus': '🇨🇾',
  'India': '🇮🇳', 'China': '🇨🇳', 'Caribbean': '🏝️', 'Australia': '🇦🇺',
  'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'Switzerland': '🇨🇭', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Belgium': '🇧🇪',
  'Austria': '🇦🇹', 'Poland': '🇵🇱', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺',
  'New Zealand': '🇳🇿', 'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'UAE': '🇦🇪',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷', 'Greece': '🇬🇷',
  'Cyprus': '🇨🇾', 'Latvia': '🇱🇻', 'Estonia': '🇪🇪', 'Lithuania': '🇱🇹',
}

const LEVEL_COLORS: Record<string, string> = {
  bachelor: '#3A4391', master: '#00CCA0', phd: '#7C3AED',
  diploma: '#F59E0B', certificate: '#EC4899', foundation: '#6366F1',
  associate: '#06B6D4', postgraduate: '#8B5CF6', undergraduate: '#3A4391'
}

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's Degree", master: "Master's Degree", phd: 'PhD / Doctorate',
  diploma: 'Diploma', certificate: 'Certificate', foundation: 'Foundation Programme',
  associate: 'Associate Degree', postgraduate: 'Postgraduate', undergraduate: 'Undergraduate'
}

const DELIVERY_LABELS: Record<string, string> = {
  'on-campus': '🏫 On-Campus', 'online': '💻 Online', 'hybrid': '🔄 Hybrid'
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
  requirements_list: string[] | null
  application_deadline: string | null
  start_dates: string[] | null
  intake: string | null
  img_url: string | null
  english_requirements: string | null
  prerequisites: string | null
  curriculum_summary: string | null
  application_fee: number | null
  scholarship_available: boolean | null
  delivery_mode: string | null
  accommodation_available: boolean | null
  visa_support: boolean | null
  campus_type: string | null
}

interface UniversityFeatures {
  campus_size?: string
  international_students_percentage?: number
  [key: string]: any
}

interface University {
  id: string
  name: string
  country: string
  region: string | null
  city: string | null
  logo_url: string | null
  image_url: string | null
  website_url: string | null
  description: string | null
  about: string | null
  established: number | null
  ranking: string | null
  global_ranking: number | null
  accreditation: string | null
  student_count: number | null
  acceptance_rate: number | null
  features: UniversityFeatures | null
  programs: Program[]
}

export default function UniversityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'admissions'>('overview')

  useEffect(() => {
    if (!slug) return

    const fetchUniversity = async () => {
      try {
        const query = supabase
          .from('universities')
          .select('*, programs(*)')

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
        // @ts-ignore - Supabase type instantiation workaround
        const { data, error } = await (isUUID ? query.eq('id', slug as string) : query.eq('slug', slug as string)).single();

        if (!error && data) {
          setUniversity(data as unknown as University)
        }
      } catch (error) {
        console.error('Error fetching university:', error)
      }
      setLoading(false)
    }

    fetchUniversity()
  }, [slug])

  const formatCurrency = (fee: number | null, currency: string | null) => {
    if (!fee) return 'Contact for fees'
    return `${currency || 'USD'} ${fee.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="dashboard-page university-detail-page">
        <div className="udp-container">
          <div className="udp-loading">
            <div className="udp-loading-hero" />
            <div className="udp-loading-tabs" />
            <div className="udp-loading-grid">
              <div className="udp-loading-content" />
              <div className="udp-loading-sidebar" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!university) {
    return (
      <div className="dashboard-page university-detail-page" style={{ padding: '2rem 2.5rem', textAlign: 'center' }}>
        <GraduationCap size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
        <h2>University not found</h2>
        <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    )
  }

  const activePrograms = university.programs?.filter(p => p) || []
  const sortedPrograms = activePrograms.slice().sort((a, b) => {
    const levelOrder = ['foundation', 'associate', 'bachelor', 'diploma', 'certificate', 'master', 'postgraduate', 'phd']
    const aIndex = levelOrder.indexOf(a.level.toLowerCase())
    const bIndex = levelOrder.indexOf(b.level.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })

  const programsByLevel = sortedPrograms.reduce((acc, program) => {
    const level = program.level.toLowerCase()
    if (!acc[level]) acc[level] = []
    acc[level].push(program)
    return acc
  }, {} as Record<string, Program[]>)

  // Compute unique delivery modes
  const deliveryModes = Array.from(new Set(activePrograms.map(p => p.delivery_mode).filter(Boolean)))
  const hasScholarships = activePrograms.some(p => p.scholarship_available)
  const hasVisaSupport = activePrograms.some(p => p.visa_support)
  const hasAccommodation = activePrograms.some(p => p.accommodation_available)

  const features = university.features as UniversityFeatures | null
  const intlPercent = features?.international_students_percentage
  const campusSize = features?.campus_size

  return (
    <div className="dashboard-page university-detail-page">
      <div className="udp-container">
        {/* Breadcrumb */}
        <div className="udp-breadcrumb">
          <button onClick={() => navigate(-1)} className="udp-back-link">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <ChevronRight size={16} />
          <Link to="/dashboard/courses" className="udp-breadcrumb-link">Partner Universities</Link>
          <ChevronRight size={16} />
          <span className="udp-breadcrumb-current">{university.name}</span>
        </div>

        {/* Hero Banner */}
        <div className="udp-hero">
          <div
            className="udp-hero-bg"
            style={{
              backgroundImage: `url(${university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1200'})`
            }}
          />
          <div className="udp-hero-overlay" />
          <div className="udp-hero-content">
            <div className="udp-hero-header">
              {university.logo_url && (
                <div className="udp-logo-wrapper">
                  <img src={university.logo_url} alt={university.name} />
                </div>
              )}
              <div className="udp-hero-info">
                {/* Badges Row */}
                <div className="udp-hero-badges">
                  {university.global_ranking && (
                    <span className="udp-badge udp-badge-gold">
                      <Trophy size={13} />
                      #{university.global_ranking} Global
                    </span>
                  )}
                  {university.ranking && (
                    <span className="udp-badge">
                      <Star size={13} />
                      {university.ranking}
                    </span>
                  )}
                  {university.accreditation && (
                    <span className="udp-badge udp-badge-green">
                      <Shield size={13} />
                      {university.accreditation}
                    </span>
                  )}
                </div>
                <h1 className="udp-hero-title">{university.name}</h1>
                <div className="udp-hero-location">
                  <MapPin size={18} />
                  <span>{FLAG_MAP[university.country] || '🌐'} {university.city ? `${university.city}, ` : ''}{university.country}{university.region ? ` • ${university.region}` : ''}</span>
                </div>
                <div className="udp-hero-quick-stats">
                  {university.established && (
                    <div className="udp-quick-stat">
                      <Building size={16} />
                      <span>Est. {university.established}</span>
                    </div>
                  )}
                  {university.student_count && (
                    <div className="udp-quick-stat">
                      <Users size={16} />
                      <span>{university.student_count.toLocaleString()}+ Students</span>
                    </div>
                  )}
                  <div className="udp-quick-stat">
                    <GraduationCap size={16} />
                    <span>{activePrograms.length} Programmes</span>
                  </div>
                  {intlPercent != null && intlPercent > 0 && (
                    <div className="udp-quick-stat">
                      <Globe2 size={16} />
                      <span>{intlPercent}% International</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="udp-stats-banner">
          {university.established && (
            <div className="udp-stat-item">
              <div className="udp-stat-icon" style={{ background: 'rgba(58, 67, 145, 0.1)', color: '#3A4391' }}><Building size={20} /></div>
              <div className="udp-stat-info">
                <span className="udp-stat-value">{new Date().getFullYear() - university.established}</span>
                <span className="udp-stat-label">Years of Excellence</span>
              </div>
            </div>
          )}
          {university.student_count && (
            <div className="udp-stat-item">
              <div className="udp-stat-icon" style={{ background: 'rgba(0, 204, 160, 0.1)', color: '#00CCA0' }}><Users size={20} /></div>
              <div className="udp-stat-info">
                <span className="udp-stat-value">{university.student_count.toLocaleString()}+</span>
                <span className="udp-stat-label">Total Students</span>
              </div>
            </div>
          )}
          {university.acceptance_rate && (
            <div className="udp-stat-item">
              <div className="udp-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}><Percent size={20} /></div>
              <div className="udp-stat-info">
                <span className="udp-stat-value">{university.acceptance_rate}%</span>
                <span className="udp-stat-label">Acceptance Rate</span>
              </div>
            </div>
          )}
          <div className="udp-stat-item">
            <div className="udp-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}><BookOpen size={20} /></div>
            <div className="udp-stat-info">
              <span className="udp-stat-value">{activePrograms.length}</span>
              <span className="udp-stat-label">Active Programmes</span>
            </div>
          </div>
          {university.global_ranking && (
            <div className="udp-stat-item">
              <div className="udp-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308' }}><Trophy size={20} /></div>
              <div className="udp-stat-info">
                <span className="udp-stat-value">#{university.global_ranking}</span>
                <span className="udp-stat-label">Global Ranking</span>
              </div>
            </div>
          )}
          {campusSize && (
            <div className="udp-stat-item">
              <div className="udp-stat-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' }}><Home size={20} /></div>
              <div className="udp-stat-info">
                <span className="udp-stat-value">{campusSize}</span>
                <span className="udp-stat-label">Campus Size</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="udp-tabs">
          <button
            className={`udp-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Globe2 size={18} />
            Overview
          </button>
          <button
            className={`udp-tab ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
          >
            <BookOpen size={18} />
            Programmes ({activePrograms.length})
          </button>
          <button
            className={`udp-tab ${activeTab === 'admissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('admissions')}
          >
            <FileText size={18} />
            Admissions
          </button>
        </div>

        {/* Tab Content */}
        <div className="udp-content-grid">
          {/* Main Content */}
          <div className="udp-main-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="udp-overview-content">
                {/* About Section */}
                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <GraduationCap size={22} />
                    About {university.name}
                  </h2>
                  <p className="udp-about-text">
                    {university.about || university.description ||
                      `${university.name} is a prestigious institution located in ${university.city || university.country}. The university offers world-class education with a diverse range of programs designed to prepare students for global careers.`
                    }
                  </p>
                </div>

                {/* Key Highlights */}
                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <TrendingUp size={22} />
                    Key Highlights
                  </h2>
                  <div className="udp-highlights-grid">
                    {university.accreditation && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Award size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">Accreditation</div>
                          <div className="udp-highlight-value">{university.accreditation}</div>
                        </div>
                      </div>
                    )}
                    {intlPercent != null && intlPercent > 0 && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Globe2 size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">International Students</div>
                          <div className="udp-highlight-value">{intlPercent}% of student body</div>
                        </div>
                      </div>
                    )}
                    {hasVisaSupport && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#fef3c7', color: '#d97706' }}><FileText size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">Visa Support</div>
                          <div className="udp-highlight-value">Available for international students</div>
                        </div>
                      </div>
                    )}
                    {hasScholarships && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#fdf4ff', color: '#a855f7' }}><Star size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">Scholarships</div>
                          <div className="udp-highlight-value">Merit-based options available</div>
                        </div>
                      </div>
                    )}
                    {hasAccommodation && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Home size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">Accommodation</div>
                          <div className="udp-highlight-value">On-campus housing available</div>
                        </div>
                      </div>
                    )}
                    {deliveryModes.length > 0 && (
                      <div className="udp-highlight-card">
                        <div className="udp-highlight-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}><Wifi size={22} /></div>
                        <div>
                          <div className="udp-highlight-label">Study Modes</div>
                          <div className="udp-highlight-value">{deliveryModes.map(m => DELIVERY_LABELS[m!] || m).join(', ')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Programs Summary Preview */}
                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <BookOpen size={22} />
                    Programmes at a Glance
                  </h2>
                  <div className="udp-program-summary-grid">
                    {Object.entries(programsByLevel).map(([level, programs]) => (
                      <div key={level} className="udp-program-summary-card" onClick={() => setActiveTab('programs')}>
                        <div className="udp-psc-badge" style={{ background: LEVEL_COLORS[level] || '#64748b' }}>
                          {programs.length}
                        </div>
                        <span className="udp-psc-label">{LEVEL_LABELS[level] || level}</span>
                        <ChevronRight size={16} className="udp-psc-arrow" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Programs Tab */}
            {activeTab === 'programs' && (
              <div className="udp-programs-content">
                <div className="udp-programs-header">
                  <h2 className="udp-section-title">
                    <BookOpen size={22} />
                    Available Programmes
                  </h2>
                  <p className="udp-programs-subtitle">
                    Explore {activePrograms.length} programmes across various disciplines
                  </p>
                </div>

                {Object.entries(programsByLevel).map(([level, programs]) => (
                  <div key={level} className="udp-level-group">
                    <h3 className="udp-level-title">
                      <span className="udp-level-badge" style={{ background: LEVEL_COLORS[level] || '#64748b' }}>
                        {LEVEL_LABELS[level] || level}
                      </span>
                      <span className="udp-level-count">{programs.length} programme{programs.length !== 1 ? 's' : ''}</span>
                    </h3>
                    <div className="udp-programs-list">
                      {programs.map((program: any) => (
                        <Link
                          key={program.id}
                          to={`/dashboard/courses/${program.slug || program.id}`}
                          className="udp-program-card"
                        >
                          <div className="udp-program-card-header">
                            <div className="udp-program-level-bar" style={{ background: LEVEL_COLORS[level] || '#64748b' }} />
                            <div className="udp-program-info">
                              <h4 className="udp-program-name">{program.name}</h4>
                              <div className="udp-program-meta">
                                {program.category && (
                                  <span className="udp-program-category">{program.category}</span>
                                )}
                                <span className="udp-program-lang">
                                  <Globe size={14} />
                                  {program.language}
                                </span>
                                {program.delivery_mode && (
                                  <span className="udp-program-delivery">
                                    {DELIVERY_LABELS[program.delivery_mode] || program.delivery_mode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="udp-program-details">
                            <div className="udp-program-detail">
                              <Clock size={14} />
                              <span>{program.duration || `${program.duration_months} months`}</span>
                            </div>
                            <div className="udp-program-detail">
                              <span className="udp-program-fee">
                                {formatCurrency(program.tuition_fee, program.currency)} / year
                              </span>
                            </div>
                            {program.start_dates && program.start_dates.length > 0 && (
                              <div className="udp-program-detail">
                                <Calendar size={14} />
                                <span>Next: {program.start_dates[0]}</span>
                              </div>
                            )}
                          </div>
                          {/* Feature Badges */}
                          <div className="udp-program-badges">
                            {program.visa_support && (
                              <span className="udp-mini-badge udp-mini-badge-blue">✈️ Visa Support</span>
                            )}
                            {program.scholarship_available && (
                              <span className="udp-mini-badge udp-mini-badge-purple">🎓 Scholarship</span>
                            )}
                            {program.accommodation_available && (
                              <span className="udp-mini-badge udp-mini-badge-orange">🏠 Housing</span>
                            )}
                            {program.english_requirements && (
                              <span className="udp-mini-badge udp-mini-badge-teal">📝 {program.english_requirements}</span>
                            )}
                          </div>
                          <div className="udp-program-action">
                            <span>View Details</span>
                            <ChevronRight size={18} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {activePrograms.length === 0 && (
                  <div className="udp-no-programs">
                    <BookOpen size={48} style={{ opacity: 0.3 }} />
                    <h3>No Programmes Available</h3>
                    <p>Please check back later for updated programme listings.</p>
                  </div>
                )}
              </div>
            )}

            {/* Admissions Tab */}
            {activeTab === 'admissions' && (
              <div className="udp-admissions-content">
                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <FileText size={22} />
                    Admission Requirements
                  </h2>
                  <div className="udp-requirements-grid">
                    <div className="udp-requirement-card">
                      <h4>Bachelor's Programmes</h4>
                      <ul>
                        <li><CheckCircle2 size={16} /> Minimum GPA of 3.0 or equivalent</li>
                        <li><CheckCircle2 size={16} /> English proficiency test (IELTS 6.0 / TOEFL 80)</li>
                        <li><CheckCircle2 size={16} /> High school diploma or equivalent</li>
                        <li><CheckCircle2 size={16} /> Personal statement</li>
                        <li><CheckCircle2 size={16} /> Letters of recommendation</li>
                      </ul>
                    </div>
                    <div className="udp-requirement-card">
                      <h4>Master's Programmes</h4>
                      <ul>
                        <li><CheckCircle2 size={16} /> Bachelor's degree in relevant field</li>
                        <li><CheckCircle2 size={16} /> Minimum GPA of 3.0</li>
                        <li><CheckCircle2 size={16} /> English proficiency (IELTS 6.5 / TOEFL 90)</li>
                        <li><CheckCircle2 size={16} /> Statement of purpose</li>
                        <li><CheckCircle2 size={16} /> CV/Resume</li>
                        <li><CheckCircle2 size={16} /> Professional references</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <Calendar size={22} />
                    Application Deadlines
                  </h2>
                  <div className="udp-deadlines-list">
                    <div className="udp-deadline-item">
                      <span className="udp-deadline-label">Fall Semester</span>
                      <span className="udp-deadline-date">June 1 – August 15</span>
                    </div>
                    <div className="udp-deadline-item">
                      <span className="udp-deadline-label">Spring Semester</span>
                      <span className="udp-deadline-date">November 1 – January 15</span>
                    </div>
                    <div className="udp-deadline-item">
                      <span className="udp-deadline-label">Summer Semester</span>
                      <span className="udp-deadline-date">March 1 – May 1</span>
                    </div>
                  </div>
                </div>

                {/* What We Offer */}
                <div className="udp-section">
                  <h2 className="udp-section-title">
                    <Award size={22} />
                    What We Offer
                  </h2>
                  <div className="udp-services-grid">
                    {hasVisaSupport && (
                      <div className="udp-service-card">
                        <FileText size={24} style={{ color: '#3A4391' }} />
                        <h4>Visa Assistance</h4>
                        <p>Full visa processing support for international students</p>
                      </div>
                    )}
                    {hasScholarships && (
                      <div className="udp-service-card">
                        <Star size={24} style={{ color: '#F59E0B' }} />
                        <h4>Scholarships</h4>
                        <p>Merit-based scholarships and financial aid options</p>
                      </div>
                    )}
                    {hasAccommodation && (
                      <div className="udp-service-card">
                        <Home size={24} style={{ color: '#00CCA0' }} />
                        <h4>Accommodation</h4>
                        <p>On-campus and nearby housing arrangements</p>
                      </div>
                    )}
                    <div className="udp-service-card">
                      <Briefcase size={24} style={{ color: '#8B5CF6' }} />
                      <h4>Career Support</h4>
                      <p>Career counselling and internship placement assistance</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="udp-sidebar">
            {/* Quick Actions Card */}
            <div className="udp-sidebar-card udp-sidebar-cta">
              <div className="udp-cta-header">
                <GraduationCap size={28} />
                <h3>Ready to Apply?</h3>
                <p>Start your application process today</p>
              </div>
              <Link
                to={`/dashboard/applications/new?university=${university.id}`}
                className="udp-cta-button udp-cta-primary"
              >
                Start Application
                <ChevronRight size={18} />
              </Link>
              {university.website_url && (
                <a
                  href={university.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="udp-cta-button udp-cta-secondary"
                >
                  <ExternalLink size={16} />
                  Visit Website
                </a>
              )}
            </div>

            {/* University Info Card */}
            <div className="udp-sidebar-card">
              <h3 className="udp-sidebar-card-title">University Information</h3>
              <div className="udp-info-list">
                {university.established && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">Established</span>
                    <span className="udp-info-value">{university.established}</span>
                  </div>
                )}
                {university.country && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">Country</span>
                    <span className="udp-info-value">{FLAG_MAP[university.country] || '🌐'} {university.country}</span>
                  </div>
                )}
                {university.city && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">City</span>
                    <span className="udp-info-value">{university.city}</span>
                  </div>
                )}
                {university.region && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">Region</span>
                    <span className="udp-info-value">{university.region}</span>
                  </div>
                )}
                {campusSize && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">Campus</span>
                    <span className="udp-info-value">{campusSize}</span>
                  </div>
                )}
                {university.accreditation && (
                  <div className="udp-info-row">
                    <span className="udp-info-label">Accreditation</span>
                    <span className="udp-info-value">{university.accreditation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Programs Summary */}
            <div className="udp-sidebar-card">
              <h3 className="udp-sidebar-card-title">Programmes Summary</h3>
              <div className="udp-programs-summary">
                {Object.entries(programsByLevel).slice(0, 5).map(([level, programs]) => (
                  <div key={level} className="udp-summary-item">
                    <span className="udp-summary-label">{LEVEL_LABELS[level] || level}</span>
                    <span className="udp-summary-count">{programs.length}</span>
                  </div>
                ))}
                {activePrograms.length > 0 && (
                  <div className="udp-total-programs">
                    <span>Total Programmes</span>
                    <span className="udp-total-count">{activePrograms.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
