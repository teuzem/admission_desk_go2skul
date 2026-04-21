import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Building, Clock, Globe, BookOpen, CheckCircle2,
  Calendar, Users, Award, ExternalLink, GraduationCap, ChevronRight,
  Star, FileText, Shield, Wifi, Home, Briefcase, Banknote, Plane
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import '../dashboard/DashboardPages.css'
import './CourseDetailPage.css'

const FLAG_MAP: Record<string, string> = {
  'Canada': '🇨🇦', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧', 'USA': '🇺🇸', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Ireland': '🇮🇪', 'Malta': '🇲🇹', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
  'South Cyprus': '🇨🇾', 'India': '🇮🇳', 'China': '🇨🇳', 'Caribbean': '🏝️', 'Australia': '🇦🇺',
  'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'Switzerland': '🇨🇭', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Belgium': '🇧🇪',
  'Austria': '🇦🇹', 'Poland': '🇵🇱', 'UAE': '🇦🇪', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
  'New Zealand': '🇳🇿', 'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'Turkey': '🇹🇷',
}

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's Degree", master: "Master's Degree", phd: 'PhD / Doctorate',
  diploma: 'Diploma', certificate: 'Certificate', foundation: 'Foundation Programme'
}

const LEVEL_COLORS: Record<string, string> = {
  bachelor: '#3A4391', master: '#00CCA0', phd: '#7C3AED',
  diploma: '#F59E0B', certificate: '#EC4899', foundation: '#6366F1'
}

const DELIVERY_LABELS: Record<string, { label: string; icon: string }> = {
  'on-campus': { label: 'On-Campus', icon: '🏫' },
  'online': { label: 'Online', icon: '💻' },
  'hybrid': { label: 'Hybrid', icon: '🔄' },
}

interface ProgramDetail {
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
  start_dates: string[]
  intake: string | null
  img_url: string | null
  english_requirements: string | null
  prerequisites: string | null
  curriculum_summary: string | null
  application_fee: number | null
  scholarship_available: boolean | null
  campus_type: string | null
  delivery_mode: string | null
  accommodation_available: boolean | null
  visa_support: boolean | null
  universities: {
    id: string
    slug: string | null
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
    global_ranking: number | null
  } | null
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedPrograms, setRelatedPrograms] = useState<any[]>([])

  useEffect(() => {
    if (!slug) return
    const fetchProgram = async () => {
      const query = supabase
        .from('programs')
        .select(`
          id, name, level, category, duration, duration_months,
          tuition_fee, currency, language, description, requirements,
          requirements_list, application_deadline, start_dates, intake, img_url,
          english_requirements, prerequisites, curriculum_summary,
          application_fee, scholarship_available, campus_type,
          delivery_mode, accommodation_available, visa_support,
          universities(id, slug, name, country, city, logo_url, image_url, website_url,
            description, established, ranking, accreditation, student_count,
            acceptance_rate, global_ranking)
        `)
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
      // @ts-ignore - Supabase type instantiation workaround
      const { data, error } = await (isUUID ? query.eq('id', slug as string) : query.eq('slug', slug as string)).single();

      if (!error && data) {
        setProgram(data as any)
        // Fetch related programs from same university
        const { data: related } = await supabase
          .from('programs')
          .select('id, slug, name, level, tuition_fee, currency, duration, delivery_mode')
          .eq('university_id', (data as any).universities?.id || '')
          .neq('id', (data as any).id)
          .limit(4)
        if (related) setRelatedPrograms(related)
      }
      setLoading(false)
    }
    fetchProgram()
  }, [slug])

  if (loading) {
    return (
      <div className="dashboard-page cdp-page">
        <div className="cdp-container">
          <div className="cdp-loading-hero" />
          <div className="cdp-loading-grid">
            <div className="cdp-loading-main" />
            <div className="cdp-loading-sidebar" />
          </div>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="dashboard-page cdp-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <GraduationCap size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
        <h2>Programme not found</h2>
        <Link to="/dashboard/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Courses</Link>
      </div>
    )
  }

  const uni = program.universities
  const deliveryInfo = DELIVERY_LABELS[program.delivery_mode || ''] || null

  return (
    <div className="dashboard-page cdp-page">
      <div className="cdp-container">
        {/* Breadcrumb */}
        <div className="cdp-breadcrumb">
          <Link to="/dashboard/courses" className="cdp-breadcrumb-link">
            <ArrowLeft size={16} />
            Programmes & Courses
          </Link>
          <ChevronRight size={14} />
          <span className="cdp-breadcrumb-current">{program.name}</span>
        </div>

        {/* Hero Banner */}
        <div className="cdp-hero">
          <div className="cdp-hero-bg" style={{
            backgroundImage: `url(${program.img_url || uni?.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1200'})`
          }} />
          <div className="cdp-hero-overlay" />
          <div className="cdp-hero-content">
            <div className="cdp-hero-header">
              {uni?.logo_url && (
                <div className="cdp-hero-logo">
                  <img src={uni.logo_url} alt={uni.name} onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
                </div>
              )}
              <div className="cdp-hero-info">
                <div className="cdp-hero-badges">
                  <span className="cdp-level-badge" style={{ background: LEVEL_COLORS[program.level] || '#64748b' }}>
                    {LEVEL_LABELS[program.level] || program.level}
                  </span>
                  {program.category && (
                    <span className="cdp-category-badge">{program.category}</span>
                  )}
                  {deliveryInfo && (
                    <span className="cdp-delivery-badge">{deliveryInfo.icon} {deliveryInfo.label}</span>
                  )}
                </div>
                <h1 className="cdp-hero-title">{program.name}</h1>
                <div className="cdp-hero-university">
                  <Building size={15} />
                  <span className="cdp-hero-uni-name">{uni?.name}</span>
                  <span style={{ opacity: 0.6 }}>•</span>
                  <span>{FLAG_MAP[uni?.country || ''] || '🌐'} {uni?.city ? `${uni.city}, ` : ''}{uni?.country}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="cdp-stats-bar">
          <div className="cdp-stat">
            <Clock size={20} className="cdp-stat-icon" style={{ color: 'var(--color-primary)' }} />
            <div className="cdp-stat-text">
              <span className="cdp-stat-label">Duration</span>
              <span className="cdp-stat-value">{program.duration || `${program.duration_months} months`}</span>
            </div>
          </div>
          <div className="cdp-stat-divider" />
          <div className="cdp-stat">
            <Banknote size={20} className="cdp-stat-icon" style={{ color: '#00CCA0' }} />
            <div className="cdp-stat-text">
              <span className="cdp-stat-label">Annual Tuition</span>
              <span className="cdp-stat-value">{program.tuition_fee ? `${program.currency || 'USD'} ${program.tuition_fee.toLocaleString()}` : 'Contact us'}</span>
            </div>
          </div>
          <div className="cdp-stat-divider" />
          <div className="cdp-stat">
            <Globe size={20} className="cdp-stat-icon" style={{ color: '#8B5CF6' }} />
            <div className="cdp-stat-text">
              <span className="cdp-stat-label">Language</span>
              <span className="cdp-stat-value">{program.language}</span>
            </div>
          </div>
          <div className="cdp-stat-divider" />
          <div className="cdp-stat">
            <Calendar size={20} className="cdp-stat-icon" style={{ color: '#F59E0B' }} />
            <div className="cdp-stat-text">
              <span className="cdp-stat-label">Next Intake</span>
              <span className="cdp-stat-value">{program.start_dates?.[0] || program.intake || 'TBC'}</span>
            </div>
          </div>
          {deliveryInfo && (
            <>
              <div className="cdp-stat-divider" />
              <div className="cdp-stat">
                <Wifi size={20} className="cdp-stat-icon" style={{ color: '#06B6D4' }} />
                <div className="cdp-stat-text">
                  <span className="cdp-stat-label">Delivery Mode</span>
                  <span className="cdp-stat-value">{deliveryInfo.label}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Layout */}
        <div className="cdp-layout">
          {/* LEFT COLUMN */}
          <div className="cdp-main">
            {/* About This Programme */}
            {(program.description || program.curriculum_summary) && (
              <div className="cdp-card">
                <h2 className="cdp-card-title">
                  <BookOpen size={18} style={{ color: 'var(--color-primary)' }} />
                  About This Programme
                </h2>
                {program.description && (
                  <p className="cdp-card-text">{program.description}</p>
                )}
                {program.curriculum_summary && (
                  <>
                    <h3 className="cdp-card-subtitle">Curriculum Overview</h3>
                    <p className="cdp-card-text">{program.curriculum_summary}</p>
                  </>
                )}
              </div>
            )}

            {/* Entry Requirements */}
            <div className="cdp-card">
              <h2 className="cdp-card-title">
                <CheckCircle2 size={18} style={{ color: '#00CCA0' }} />
                Entry Requirements
              </h2>
              
              {/* English Requirements */}
              {program.english_requirements && (
                <div className="cdp-req-highlight">
                  <Globe size={18} />
                  <div>
                    <strong>English Language</strong>
                    <span>{program.english_requirements}</span>
                  </div>
                </div>
              )}

              {/* Prerequisites */}
              {program.prerequisites && (
                <div className="cdp-req-highlight">
                  <FileText size={18} />
                  <div>
                    <strong>Prerequisites</strong>
                    <span>{program.prerequisites}</span>
                  </div>
                </div>
              )}

              {/* Requirements List */}
              {program.requirements_list && program.requirements_list.length > 0 ? (
                <ul className="cdp-requirements-list">
                  {program.requirements_list.map((req, i) => (
                    <li key={i}>
                      <CheckCircle2 size={16} style={{ color: '#00CCA0', marginTop: '2px', flexShrink: 0 }} />
                      {req}
                    </li>
                  ))}
                </ul>
              ) : program.requirements ? (
                <p className="cdp-card-text">{program.requirements}</p>
              ) : (
                <p className="cdp-card-text cdp-muted">Please contact us for specific entry requirements.</p>
              )}
            </div>

            {/* Key Features */}
            {(program.visa_support || program.scholarship_available || program.accommodation_available || program.delivery_mode) && (
              <div className="cdp-card">
                <h2 className="cdp-card-title">
                  <Star size={18} style={{ color: '#F59E0B' }} />
                  Key Features & Support
                </h2>
                <div className="cdp-features-grid">
                  {program.visa_support && (
                    <div className="cdp-feature-item cdp-feature-blue">
                      <Plane size={22} />
                      <div>
                        <strong>Visa Support</strong>
                        <span>Full visa processing assistance for international students</span>
                      </div>
                    </div>
                  )}
                  {program.scholarship_available && (
                    <div className="cdp-feature-item cdp-feature-purple">
                      <Award size={22} />
                      <div>
                        <strong>Scholarships Available</strong>
                        <span>Merit-based scholarships and financial aid options</span>
                      </div>
                    </div>
                  )}
                  {program.accommodation_available && (
                    <div className="cdp-feature-item cdp-feature-green">
                      <Home size={22} />
                      <div>
                        <strong>Accommodation</strong>
                        <span>On-campus or nearby student housing available</span>
                      </div>
                    </div>
                  )}
                  {program.delivery_mode && (
                    <div className="cdp-feature-item cdp-feature-cyan">
                      <Wifi size={22} />
                      <div>
                        <strong>{deliveryInfo?.label || program.delivery_mode} Study</strong>
                        <span>{program.delivery_mode === 'on-campus' ? 'Full-time on-campus attendance' : program.delivery_mode === 'online' ? 'Study entirely online from anywhere' : 'Flexible blend of in-person and online'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Start Dates */}
            {program.start_dates && program.start_dates.length > 0 && (
              <div className="cdp-card">
                <h2 className="cdp-card-title">
                  <Calendar size={18} style={{ color: '#F59E0B' }} />
                  Available Start Dates
                </h2>
                <div className="cdp-start-dates">
                  {program.start_dates.map((date, i) => (
                    <span key={i} className="cdp-date-badge">📅 {date}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Programs */}
            {relatedPrograms.length > 0 && (
              <div className="cdp-card">
                <h2 className="cdp-card-title">
                  Other Programmes at {uni?.name}
                </h2>
                <div className="cdp-related-list">
                  {relatedPrograms.map(rp => (
                    <Link key={rp.id} to={`/dashboard/courses/${rp.slug || rp.id}`} className="cdp-related-item">
                      <div>
                        <div className="cdp-related-name">{rp.name}</div>
                        <div className="cdp-related-meta">
                          {LEVEL_LABELS[rp.level] || rp.level} • {rp.duration}
                          {rp.delivery_mode && ` • ${DELIVERY_LABELS[rp.delivery_mode]?.label || rp.delivery_mode}`}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar */}
          <div className="cdp-sidebar">
            {/* Apply CTA */}
            <div className="cdp-sidebar-card cdp-apply-cta">
              <GraduationCap size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.9 }} />
              <h3>Ready to Apply?</h3>
              <p>Submit your student's application in minutes through our streamlined process.</p>
              <Link
                to={`/dashboard/applications/new?program=${program.id}&university=${uni?.id}`}
                className="cdp-apply-btn cdp-apply-primary"
              >
                Start Application →
              </Link>
              {uni?.website_url && (
                <a href={uni.website_url} target="_blank" rel="noopener noreferrer" className="cdp-apply-btn cdp-apply-secondary">
                  <ExternalLink size={14} /> University Website
                </a>
              )}
            </div>

            {/* University Card */}
            {uni && (
              <div className="cdp-sidebar-card">
                <h3 className="cdp-sidebar-title">About the University</h3>
                {uni.logo_url && (
                  <div className="cdp-uni-logo-wrap">
                    <img src={uni.logo_url} alt={uni.name} onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                <div className="cdp-uni-name">{uni.name}</div>
                <div className="cdp-uni-location">
                  {FLAG_MAP[uni.country] || '🌐'} {uni.city ? `${uni.city}, ` : ''}{uni.country}
                </div>

                {uni.description && (
                  <p className="cdp-uni-desc">
                    {uni.description.substring(0, 200)}{uni.description.length > 200 ? '...' : ''}
                  </p>
                )}

                <div className="cdp-uni-details">
                  {uni.established && (
                    <div className="cdp-uni-detail-row">
                      <span>Established</span>
                      <span>{uni.established}</span>
                    </div>
                  )}
                  {uni.ranking && (
                    <div className="cdp-uni-detail-row">
                      <span>Ranking</span>
                      <span>{uni.ranking}</span>
                    </div>
                  )}
                  {uni.global_ranking && (
                    <div className="cdp-uni-detail-row">
                      <span>Global Rank</span>
                      <span>#{uni.global_ranking}</span>
                    </div>
                  )}
                  {uni.student_count && (
                    <div className="cdp-uni-detail-row">
                      <span>Students</span>
                      <span>{uni.student_count.toLocaleString()}+</span>
                    </div>
                  )}
                  {uni.acceptance_rate && (
                    <div className="cdp-uni-detail-row">
                      <span>Acceptance</span>
                      <span>{uni.acceptance_rate}%</span>
                    </div>
                  )}
                  {uni.accreditation && (
                    <div className="cdp-uni-detail-row">
                      <span>Accreditation</span>
                      <span className="cdp-uni-accred">{uni.accreditation}</span>
                    </div>
                  )}
                </div>

                <Link to={`/dashboard/university/${uni.slug || uni.id}`} className="cdp-view-uni-btn">
                  View Full University Profile <ChevronRight size={16} />
                </Link>
              </div>
            )}

            {/* Fee Summary */}
            <div className="cdp-sidebar-card cdp-fee-card">
              <h3 className="cdp-sidebar-title">Fee Summary</h3>
              <div className="cdp-fee-amount">
                {program.tuition_fee ? `${program.currency || 'USD'} ${program.tuition_fee.toLocaleString()}` : 'Contact us'}
              </div>
              <div className="cdp-fee-period">per academic year</div>
              
              {program.application_fee != null && Number(program.application_fee) > 0 && (
                <div className="cdp-app-fee">
                  <Banknote size={15} />
                  <span>Application Fee: <strong>{program.currency || 'USD'} {Number(program.application_fee).toLocaleString()}</strong></span>
                </div>
              )}
              
              {program.application_deadline && (
                <div className="cdp-deadline-warning">
                  <span className="cdp-deadline-icon">⏰</span>
                  <div>
                    <strong>Application Deadline</strong>
                    <span>{new Date(program.application_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              )}

              {program.scholarship_available && (
                <div className="cdp-scholarship-badge">
                  <Award size={16} />
                  <span>Scholarship opportunities available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
