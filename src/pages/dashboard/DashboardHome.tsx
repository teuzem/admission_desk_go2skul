import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, ChevronRight, ChevronDown, FileText, Users, GraduationCap, Bell, Clock,
  CheckCircle2, MapPin, Star, ArrowRight, Calendar, X, Filter, ExternalLink,
  Newspaper, BookOpen, Heart, MessageCircle, Share2, Loader2, Send, Plus,
  ThumbsUp, Sparkles, HandMetal, TrendingUp, AlertCircle, ShieldCheck
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ActivatePartnerModal from './ActivatePartnerModal'
import './DashboardHome.css'

type SearchResult = {
  id: string; title: string; subtitle: string; category: 'program' | 'university' | 'news' | 'blog'; url: string
}

type Announcement = { id: string; title: string; content: string; is_important: boolean; published_at: string; featured_image_url?: string | null; social_link?: string | null }
type EventItem = {
  id: string; title: string; description: string; event_type: string;
  event_date: string; end_date: string | null; location: string | null;
  is_online: boolean; meeting_link: string | null; image_url: string | null;
  max_attendees: number | null; booking_count?: number; is_booked?: boolean
}
type NewsPost = { id: string; title: string; content: string | null; image_url: string | null; category: string | null; published_at: string }
type BlogPost = {
  id: string; title: string; slug: string | null; excerpt: string | null;
  featured_image_url: string | null; category: string | null; published_at: string
}

const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's", master: "Master's", phd: 'PhD', diploma: 'Diploma',
  certificate: 'Certificate', foundation: 'Foundation',
  certificate_of_higher_education: 'Cert. of Higher Ed.',
  continuing_education: 'Continuing Ed.', executive_course: 'Executive Course',
  executive_education: 'Executive Ed.', graduate_program: 'Graduate Program',
  management_development: 'Mgmt. Development', postgraduate: 'Postgraduate',
  preparatory_program: 'Preparatory', professional_qualification: 'Professional Qual.',
  undergraduate: 'Undergraduate', undergraduate_foundation: 'UG + Foundation'
}

export default function DashboardHome() {
  const { t } = useTranslation()
  const { user, profile, isSuperAgent, isAdmissionManager, isProgramManager, isAdmin } = useAuth()
  const effectiveId = profile?.effective_agency_id || user?.id
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, submitted: 0, offers: 0, partners: 0 })
  const [allowedUnis, setAllowedUnis] = useState<any[]>([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchHighlight, setSearchHighlight] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ad-recent-searches') || '[]') } catch { return [] }
  })
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<any>(null)
  const navigate = useNavigate()

  // Agent permissions

  // New states
  const [events, setEvents] = useState<EventItem[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [bookingEventId, setBookingEventId] = useState<string | null>(null)
  const [newsSlide, setNewsSlide] = useState(0)
  
  // Event Booking Modal inner states
  const [eventTab, setEventTab] = useState<'browse' | 'my' | 'propose'>('browse')
  const [teamMembers, setTeamMembers] = useState<{name: string; email: string}[]>([])
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)
  const [proposalForm, setProposalForm] = useState({ title: '', description: '', proposed_type: 'webinar', proposed_date: '', proposed_location: '', is_online: true, expected_audience: '', topics: '' })
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [proposalSuccess, setProposalSuccess] = useState(false)
  const [myBookings, setMyBookings] = useState<any[]>([])

  // Pathfinder states
  const [showPathfinder, setShowPathfinder] = useState(false)
  const [pfInstitution, setPfInstitution] = useState('')
  const [pfCountry, setPfCountry] = useState('')
  const [pfLevel, setPfLevel] = useState('')
  const [pfSubject, setPfSubject] = useState('')
  const [pfSearch, setPfSearch] = useState('')
  const [pfPrograms, setPfPrograms] = useState<any[]>([])
  const [pfLoading, setPfLoading] = useState(false)
  const [pfAllUnis, setPfAllUnis] = useState<any[]>([])
  const [pfAllCountries, setPfAllCountries] = useState<string[]>([])
  const [pfAllLevels, setPfAllLevels] = useState<string[]>([])
  const [pfAllSubjects, setPfAllSubjects] = useState<string[]>([])
  const [activatingUniId, setActivatingUniId] = useState<string | null>(null)
  const [pfPendingRequests, setPfPendingRequests] = useState<Set<string>>(new Set())

  // News & Blog
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogPage, setBlogPage] = useState(1)
  const [blogTotal, setBlogTotal] = useState(0)
  const BLOG_PER_PAGE = 6

  // Summary chart data
  const [summaryData, setSummaryData] = useState<{
    openTasks: { total: number; byInstitution: { name: string; count: number; color: string }[] };
    appsByInstitution: { total: number; byInstitution: { name: string; count: number; color: string }[] };
    appsByStage: { total: number; byStage: { name: string; count: number; color: string }[] };
  }>({
    openTasks: { total: 0, byInstitution: [] },
    appsByInstitution: { total: 0, byInstitution: [] },
    appsByStage: { total: 0, byStage: [] }
  })

  // ─── Advanced Search ───
  const performSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    const term = `%${q}%`
    const [progRes, uniRes, newsRes, blogRes] = await Promise.all([
      supabase.from('programs').select('id, slug, name, level, university_id, universities(name)').ilike('name', term).eq('is_active', true).limit(5),
      supabase.from('universities').select('id, slug, name, country, city').ilike('name', term).eq('is_active', true).limit(4),
      supabase.from('news_posts').select('id, slug, title, category').ilike('title', term).eq('is_published', true).limit(3),
      supabase.from('blog_posts').select('id, title, slug, category').ilike('title', term).eq('is_published', true).limit(3)
    ])
    const results: SearchResult[] = [
      ...(progRes.data || []).map((p: any) => ({ id: p.id, title: p.name, subtitle: `${(p as any).universities?.name || ''} · ${LEVEL_LABELS[p.level] || p.level}`, category: 'program' as const, url: `/dashboard/courses/${p.slug || p.id}` })),
      ...(uniRes.data || []).map((u: any) => ({ id: u.id, title: u.name, subtitle: `${u.city || ''}, ${u.country}`, category: 'university' as const, url: `/dashboard/university/${u.slug || u.id}` })),
      ...(newsRes.data || []).map((n: any) => ({ id: n.id, title: n.title, subtitle: n.category || 'News', category: 'news' as const, url: `/dashboard/news/${n.slug || n.id}` })),
      ...(blogRes.data || []).map((b: any) => ({ id: b.id, title: b.title, subtitle: b.category || 'Blog', category: 'blog' as const, url: `/dashboard/blog/${b.slug || b.id}` }))
    ]
    setSearchResults(results)
    setSearchHighlight(-1)
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => performSearch(query), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [query, performSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const total = searchResults.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchHighlight(p => (p + 1) % Math.max(total, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchHighlight(p => (p - 1 + Math.max(total, 1)) % Math.max(total, 1)) }
    else if (e.key === 'Enter' && searchHighlight >= 0 && searchResults[searchHighlight]) {
      e.preventDefault(); selectSearchResult(searchResults[searchHighlight])
    } else if (e.key === 'Escape') { setSearchFocused(false) }
  }

  const selectSearchResult = (r: SearchResult) => {
    const updated = [r.title, ...recentSearches.filter(s => s !== r.title)].slice(0, 5)
    setRecentSearches(updated); localStorage.setItem('ad-recent-searches', JSON.stringify(updated))
    setSearchFocused(false); setQuery(''); navigate(r.url)
  }

  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return <>{text.substring(0, idx)}<mark className="search-highlight">{text.substring(idx, idx + q.length)}</mark>{text.substring(idx + q.length)}</>
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    program: <GraduationCap size={16} />, university: <MapPin size={16} />,
    news: <Newspaper size={16} />, blog: <BookOpen size={16} />
  }
  const categoryLabels: Record<string, string> = {
    program: 'Programmes', university: 'Universities', news: 'News', blog: 'Blog'
  }

  // ─── Fetch Announcements ───
  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('published_at', { ascending: false }).limit(4)
    if (data) setAnnouncements(data)
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    const channel = supabase.channel('announcements-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAnnouncements])

  // ─── Fetch Dashboard Data ───
  useEffect(() => {
    if (!user) return
    const fetchDashboardData = async () => {
      const [partersRes, appsRes] = await Promise.all([
        supabase.from('agent_partner_selections').select('university_id, universities(id, name, country, city, logo_url, image_url, ranking, student_count, description)').eq('agent_id', effectiveId),
        supabase.from('applications').select('id, status, created_at, students(first_name, last_name), universities(name), programs(name)').eq('agent_id', effectiveId).order('created_at', { ascending: false }).limit(6)
      ])

      const unis = (partersRes.data || []).map((p: any) => p.universities).filter(Boolean)
      setAllowedUnis(unis)

      const apps = appsRes.data || []
      setApplications(apps)
      setStats({
        total: apps.length,
        submitted: apps.filter((a: any) => a.status === 'submitted' || a.status === 'under_review').length,
        offers: apps.filter((a: any) => a.status === 'offer' || a.status === 'accepted').length,
        partners: unis.length
      })
      setLoadingApps(false)
    }
    fetchDashboardData()

    const ch = supabase.channel('applications-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `agent_id=eq.${effectiveId}` }, fetchDashboardData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, profile?.effective_agency_id])

  // ─── Fetch Events ───
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(20)
    if (data) {
      // Get booking counts and user's bookings
      const enriched = await Promise.all(data.map(async (ev: any) => {
        const [countRes, bookedRes] = await Promise.all([
          supabase.from('event_bookings').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('status', 'confirmed'),
          user ? supabase.from('event_bookings').select('id').eq('event_id', ev.id).eq('agent_id', user.id).eq('status', 'confirmed') : { data: [] }
        ])
        return { ...ev, booking_count: countRes.count || 0, is_booked: (bookedRes.data || []).length > 0 }
      }))
      setEvents(enriched)
    }
  }, [user])

  useEffect(() => {
    fetchEvents()
    const ch = supabase.channel('events-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_bookings' }, fetchEvents)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchEvents])

  // ─── Fetch Summary Chart Data ───
  useEffect(() => {
    const CHART_COLORS = ['#3A4391', '#00CCA0', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#D946EF']
    const STAGE_COLORS: Record<string, string> = {
      draft: '#94A3B8', submitted: '#3B82F6', under_review: '#F59E0B',
      offer: '#10B981', accepted: '#059669', rejected: '#EF4444', enrolled: '#8B5CF6'
    }
    const STAGE_LABELS: Record<string, string> = {
      draft: 'Admissions Stage', submitted: 'Application', under_review: 'Documents Stage',
      offer: 'Offer', accepted: 'Closed Won', rejected: 'Closed Lost', enrolled: 'Payment'
    }

    const fetchSummary = async () => {
      const { data: apps } = await supabase.from('applications').select('id, status, university_id, universities(name)')
      if (!apps) return

      // Open tasks by institution
      const openApps = apps.filter((a: any) => ['draft', 'submitted', 'under_review'].includes(a.status))
      const tasksByUni: Record<string, number> = {}
      openApps.forEach((a: any) => {
        const name = (a as any).universities?.name || 'Unknown'
        tasksByUni[name] = (tasksByUni[name] || 0) + 1
      })
      const openTasksList = Object.entries(tasksByUni).map(([name, count], i) => ({
        name: name.length > 25 ? name.substring(0, 22) + '...' : name,
        count,
        color: CHART_COLORS[i % CHART_COLORS.length]
      })).sort((a, b) => b.count - a.count)

      // Apps by institution
      const appsByUni: Record<string, number> = {}
      apps.forEach((a: any) => {
        const name = (a as any).universities?.name || 'Unknown'
        appsByUni[name] = (appsByUni[name] || 0) + 1
      })
      const appsByUniList = Object.entries(appsByUni).map(([name, count], i) => ({
        name: name.length > 20 ? name.substring(0, 17) + '...' : name,
        count,
        color: CHART_COLORS[i % CHART_COLORS.length]
      })).sort((a, b) => b.count - a.count)

      // Apps by stage
      const appsByStatus: Record<string, number> = {}
      apps.forEach((a: any) => {
        appsByStatus[a.status] = (appsByStatus[a.status] || 0) + 1
      })
      const appsByStageList = Object.entries(appsByStatus).map(([status, count]) => ({
        name: STAGE_LABELS[status] || status,
        count,
        color: STAGE_COLORS[status] || '#94A3B8'
      })).sort((a, b) => b.count - a.count)

      setSummaryData({
        openTasks: { total: openApps.length, byInstitution: openTasksList },
        appsByInstitution: { total: apps.length, byInstitution: appsByUniList },
        appsByStage: { total: apps.length, byStage: appsByStageList }
      })
    }
    fetchSummary()
    const ch = supabase.channel('summary-charts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchSummary)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ─── Fetch News ───
  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase.from('news_posts').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(10)
      if (data) setNewsPosts(data)
    }
    fetchNews()
    const ch = supabase.channel('news-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_posts' }, fetchNews)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ─── Fetch Blog Posts ───
  const fetchBlogs = useCallback(async (page: number) => {
    const from = (page - 1) * BLOG_PER_PAGE
    const to = from + BLOG_PER_PAGE - 1
    const { data, count } = await supabase
      .from('blog_posts').select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(from, to)
    if (data) setBlogPosts(prev => page === 1 ? data : [...prev, ...data])
    if (count !== null) setBlogTotal(count)
  }, [])

  useEffect(() => {
    fetchBlogs(1)
    const ch = supabase.channel('blog-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => fetchBlogs(1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchBlogs])

  // ─── Pathfinder data ───
  useEffect(() => {
    const loadPathfinderData = async () => {
      const [uniRes, progRes, campusRes] = await Promise.all([
        supabase.from('universities').select('id, name, country, city, logo_url').eq('is_active', true).order('name'),
        supabase.from('programs').select('id, name, level, category, university_id').eq('is_active', true),
        supabase.from('university_campuses').select('university_id, country, city')
      ])
      const unis = uniRes.data || []
      const progs = progRes.data || []
      const campuses = campusRes.data || []

      setPfAllUnis(unis)

      // Build unique countries from unis + campuses
      const uniCountries = unis.map((u: any) => u.country).filter(Boolean)
      const campusCountries = campuses.map((c: any) => c.country).filter(Boolean)
      const allCountries = Array.from(new Set([...uniCountries, ...campusCountries])).sort()
      setPfAllCountries(allCountries)

      const allLevels = Array.from(new Set(progs.map((p: any) => p.level).filter(Boolean))).sort()
      setPfAllLevels(allLevels)

      const allSubjects = Array.from(new Set(progs.map((p: any) => p.category).filter(Boolean))).sort()
      setPfAllSubjects(allSubjects)

      if (user) {
        const { data: requests } = await supabase.from('partner_activation_requests').select('university_id').eq('agent_id', user.id).eq('status', 'pending')
        if (requests) {
          setPfPendingRequests(new Set(requests.map(r => r.university_id)))
        }
      }
    }
    loadPathfinderData()
  }, [])

  // Pathfinder search
  const searchPathfinder = useCallback(async () => {
    setPfLoading(true)
    let query = supabase
      .from('programs')
      .select('id, slug, name, level, category, university_id, universities!inner(id, slug, name, country, city, logo_url)')
      .eq('is_active', true)

    if (pfInstitution) query = query.eq('university_id', pfInstitution)
    if (pfCountry) query = query.eq('universities.country', pfCountry)
    if (pfLevel) query = query.eq('level', pfLevel)
    if (pfSubject) query = query.eq('category', pfSubject)
    if (pfSearch) query = query.ilike('name', `%${pfSearch}%`)

    const { data } = await query.limit(50)
    setPfPrograms(data || [])
    setPfLoading(false)
  }, [pfInstitution, pfCountry, pfLevel, pfSubject, pfSearch])

  useEffect(() => {
    if (showPathfinder) searchPathfinder()
  }, [showPathfinder, pfInstitution, pfCountry, pfLevel, pfSubject, pfSearch, searchPathfinder])

  const handlePfActivate = (uniId: string) => {
    if (!isSuperAgent) {
      alert("Only the super agent of your agency can activate new university contracts. Please contact your administrator.")
      return
    }
    setActivatingUniId(uniId)
  }

  // ─── Event Booking ───
  const handleBookEvent = async (eventId: string) => {
    if (!user) return
    setBookingEventId(eventId)
    const ev = events.find(e => e.id === eventId)
    if (ev?.is_booked) {
      await supabase.from('event_bookings').delete().eq('event_id', eventId).eq('agent_id', user.id)
    } else {
      await supabase.from('event_bookings').insert({ event_id: eventId, agent_id: user.id, status: 'confirmed' })
    }
    setBookingEventId(null)
  }

  const handleBookWithTeam = async (eventId: string) => {
    if (!user) return
    setBookingEventId(eventId)
    const { data: booking } = await supabase.from('event_bookings').insert({ event_id: eventId, agent_id: user.id, status: 'confirmed' }).select().single()
    if (booking && teamMembers.length > 0) {
      await supabase.from('event_team_bookings').insert(
        teamMembers.filter(m => m.name.trim()).map(m => ({ event_booking_id: booking.id, team_member_name: m.name, team_member_email: m.email || null }))
      )
    }
    setBookingSuccess(booking?.id ? booking.id.substring(0, 8).toUpperCase() : 'OK')
    setTeamMembers([])
    setBookingEventId(null)
    fetchEvents()
  }

  const handleProposal = async () => {
    if (!user || !proposalForm.title.trim()) return
    setProposalSubmitting(true)
    await supabase.from('event_proposals').insert({
      agent_id: user.id, title: proposalForm.title, description: proposalForm.description || null,
      proposed_type: proposalForm.proposed_type, proposed_date: proposalForm.proposed_date || null,
      proposed_location: proposalForm.proposed_location || null, is_online: proposalForm.is_online,
      expected_audience: proposalForm.expected_audience ? parseInt(proposalForm.expected_audience) : null,
      topics: proposalForm.topics ? proposalForm.topics.split(',').map(t => t.trim()) : null
    } as any)
    setProposalSubmitting(false)
    setProposalSuccess(true)
  }

  useEffect(() => {
    if (eventTab === 'my' && user) {
      supabase.from('event_bookings').select('*, events(*)').eq('agent_id', user.id)
        .then(({ data }) => setMyBookings(data || []))
    }
  }, [eventTab, user])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: '#94a3b8', label: t('dashboard.stages.draft') },
      submitted: { color: '#3b82f6', label: t('dashboard.stages.submitted') },
      under_review: { color: '#f59e0b', label: t('dashboard.stages.underReview') },
      offer: { color: '#10b981', label: t('dashboard.stages.offerReceived') },
      accepted: { color: '#059669', label: t('dashboard.stages.accepted') },
      rejected: { color: '#ef4444', label: t('dashboard.stages.rejected') },
      enrolled: { color: '#8b5cf6', label: t('dashboard.stages.enrolled') }
    }
    const { color, label } = statusMap[status] || { color: '#94a3b8', label: status }
    return <span style={{ background: `${color}20`, color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', border: `1px solid ${color}30` }}>{label}</span>
  }

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'Agent'

  // Donut chart SVG component with hover tooltips
  const [chartTooltip, setChartTooltip] = useState<{x: number; y: number; name: string; count: number; pct: string} | null>(null)
  const DonutChart = ({ data, total, size = 180 }: { data: { name: string; count: number; color: string }[]; total: number; size?: number }) => {
    const radius = size / 2 - 10
    const innerRadius = radius * 0.6
    let cumulativeAngle = -90

    return (
      <div className="donut-chart-wrap" style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart-svg">
          {data.length === 0 ? (
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={radius - innerRadius} />
          ) : data.map((item, i) => {
            const percentage = total > 0 ? item.count / total : 0
            const angle = percentage * 360
            const startAngle = cumulativeAngle
            cumulativeAngle += angle
            const startRad = (startAngle * Math.PI) / 180
            const endRad = ((startAngle + angle) * Math.PI) / 180
            const largeArc = angle > 180 ? 1 : 0
            const outerX1 = size/2 + radius * Math.cos(startRad)
            const outerY1 = size/2 + radius * Math.sin(startRad)
            const outerX2 = size/2 + radius * Math.cos(endRad)
            const outerY2 = size/2 + radius * Math.sin(endRad)
            const innerX1 = size/2 + innerRadius * Math.cos(endRad)
            const innerY1 = size/2 + innerRadius * Math.sin(endRad)
            const innerX2 = size/2 + innerRadius * Math.cos(startRad)
            const innerY2 = size/2 + innerRadius * Math.sin(startRad)
            const d = `M ${outerX1} ${outerY1} A ${radius} ${radius} 0 ${largeArc} 1 ${outerX2} ${outerY2} L ${innerX1} ${innerY1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX2} ${innerY2} Z`
            const midAngle = ((startAngle + angle / 2) * Math.PI) / 180
            const tooltipX = size/2 + (radius * 0.8) * Math.cos(midAngle)
            const tooltipY = size/2 + (radius * 0.8) * Math.sin(midAngle)
            return <path key={i} d={d} fill={item.color} stroke="white" strokeWidth={1.5}
              className="donut-segment"
              onMouseEnter={(e) => setChartTooltip({x: e.clientX, y: e.clientY, name: item.name, count: item.count, pct: (percentage * 100).toFixed(1)})}
              onMouseMove={(e) => setChartTooltip(prev => prev ? {...prev, x: e.clientX, y: e.clientY} : null)}
              onMouseLeave={() => setChartTooltip(null)} />
          })}
          <text x={size/2} y={size/2 + 8} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1e293b" fontFamily="var(--font-heading)">{total}</text>
        </svg>
        {chartTooltip && (
          <div className="chart-tooltip" style={{ position: 'fixed', left: chartTooltip.x + 12, top: chartTooltip.y - 40, zIndex: 9999 }}>
            <strong>{chartTooltip.name}</strong>
            <span>{chartTooltip.count} ({chartTooltip.pct}%)</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard-home">
      {/* Welcome Hero */}
      <div className="pathfinder-section" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="pathfinder-title" style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            {t('dashboard.welcome', { name: firstName })} 👋
          </h1>
          <p className="pathfinder-subtitle" style={{ fontSize: '1rem' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="hero-search-container" ref={searchRef}>
          <div className="hero-search-input-wrap">
            <Search size={20} className="hero-search-icon" />
            <input
              type="text"
              className="hero-search-input"
              placeholder="Search programmes, universities, news, blog..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <button className="hero-search-clear" onClick={() => { setQuery(''); setSearchResults([]) }}><X size={16} /></button>}
            {searchLoading && <Loader2 size={18} className="spinning hero-search-spinner" />}
          </div>

          {searchFocused && (query.length >= 2 ? searchResults.length > 0 : recentSearches.length > 0) && (
            <div className="hero-search-dropdown">
              {query.length < 2 && recentSearches.length > 0 && (
                <div className="search-dropdown-section">
                  <div className="search-dropdown-label"><Clock size={13} /> Recent Searches</div>
                  {recentSearches.map((s, i) => (
                    <button key={i} className="search-dropdown-item" onClick={() => { setQuery(s); setSearchFocused(true) }}>
                      <Clock size={14} style={{ color: '#94a3b8' }} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && (() => {
                const grouped = searchResults.reduce((acc, r) => {
                  if (!acc[r.category]) acc[r.category] = []
                  acc[r.category].push(r)
                  return acc
                }, {} as Record<string, SearchResult[]>)
                let globalIdx = -1
                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="search-dropdown-section">
                    <div className="search-dropdown-label">{categoryIcons[cat]} {categoryLabels[cat]}</div>
                    {items.map(item => {
                      globalIdx++
                      const idx = globalIdx
                      return (
                        <button key={item.id} className={`search-dropdown-item ${searchHighlight === idx ? 'highlighted' : ''}`}
                          onClick={() => selectSearchResult(item)} onMouseEnter={() => setSearchHighlight(idx)}>
                          <div className="search-item-content">
                            <span className="search-item-title">{highlightMatch(item.title, query)}</span>
                            <span className="search-item-sub">{item.subtitle}</span>
                          </div>
                          <ArrowRight size={14} className="search-item-arrow" />
                        </button>
                      )
                    })}
                  </div>
                ))
              })()}
              {query.length >= 2 && searchResults.length === 0 && !searchLoading && (
                <div className="search-dropdown-empty">No results found for "{query}"</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { icon: <FileText size={22} />, value: stats.total, label: t('dashboard.stats.totalApplications'), color: '#3A4391', bg: '#eff6ff' },
          { icon: <Clock size={22} />, value: stats.submitted, label: t('dashboard.stats.activeSubmissions'), color: '#f59e0b', bg: '#fffbeb' },
          { icon: <CheckCircle2 size={22} />, value: stats.offers, label: t('dashboard.stats.offersReceived'), color: '#10b981', bg: '#f0fdf4' },
          { icon: <GraduationCap size={22} />, value: stats.partners, label: t('dashboard.stats.partnerInstitutions'), color: '#00CCA0', bg: '#f0fdfa' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ ACTION BUTTONS ═══════════ */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'flex-end' }}>
        <Link to="/dashboard/applications/create" className="btn btn-primary btn-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
          <FileText size={18} /> Start New Application +
        </Link>
        <button onClick={() => setShowEventModal(true)} className="btn btn-outline btn-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, borderColor: '#3A4391', color: '#3A4391' }}>
          <Calendar size={18} /> Book Event +
        </button>
      </div>

      {/* ═══════════ PATHFINDER + NEWS FEED ROW ═══════════ */}
      <div className="pathfinder-news-row">
        {/* Course Pathfinder Box */}
        <div className="pathfinder-box" onClick={() => setShowPathfinder(true)}>
          <div className="pathfinder-box-header">
            <div>
              <h2 className="pathfinder-box-title">
                <GraduationCap size={24} style={{ marginRight: '8px' }} />
                Admission Desk Programme Pathfinder
              </h2>
            </div>
            <div className="pathfinder-box-illustration">
              <img src="/pathfinder-illustration.png" alt="" style={{ width: '120px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} />
            </div>
          </div>
          <div className="pathfinder-box-filters">
            <div className="pf-filter-pill">
              <span>Institution</span>
              <ChevronDown size={14} />
            </div>
            <div className="pf-filter-pill">
              <span>Country</span>
              <ChevronDown size={14} />
            </div>
            <div className="pf-filter-pill">
              <span>Level</span>
              <ChevronDown size={14} />
            </div>
            <div className="pf-filter-pill">
              <span>Subject</span>
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="pf-search-preview">
            <Search size={16} style={{ color: '#94a3b8' }} />
            <span>Search for Course...</span>
          </div>
        </div>

        {/* News Feed / Announcements */}
        <div className="news-feed-box">
          <h3 className="news-feed-title">News Feed / Announcements</h3>
          {newsPosts.length > 0 ? (
            <div className="news-carousel">
              <div className="news-slide" style={{ transform: `translateX(-${newsSlide * 100}%)` }}>
                {newsPosts.map((post, i) => (
                  <div key={post.id} className="news-slide-item">
                    <div className="news-slide-image" style={{ backgroundImage: post.image_url ? `url(${post.image_url})` : `linear-gradient(135deg, #3A4391 0%, #1e2560 100%)` }}>
                      <div className="news-slide-overlay">
                        {post.category && <span className="news-slide-cat">{post.category}</span>}
                        <h4 className="news-slide-headline">{post.title}</h4>
                        {post.content && <p className="news-slide-desc">{post.content.substring(0, 120)}...</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {newsPosts.length > 1 && (
                <div className="news-dots">
                  {newsPosts.slice(0, 5).map((_, i) => (
                    <button key={i} className={`news-dot ${newsSlide === i ? 'active' : ''}`} onClick={() => setNewsSlide(i)} />
                  ))}
                </div>
              )}
            </div>
          ) : announcements.length > 0 ? (
            <div className="news-announcements-fallback">
              {announcements.slice(0, 3).map(ann => (
                <div key={ann.id} className="news-ann-card">
                  <div className="news-ann-dot" style={{ background: ann.is_important ? '#f59e0b' : '#00CCA0' }} />
                  <div>
                    <h5>{ann.title}</h5>
                    <p>{new Date(ann.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              No news yet. Stay tuned for updates!
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ SUMMARY SECTION (3 DONUT CHARTS) ═══════════ */}
      <section className="summary-charts-section">
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Summary</h2>
        <div className="summary-charts-grid">
          {/* Open Tasks for Agents */}
          <div className="summary-chart-card">
            <div className="summary-chart-header">
              <h3>Open Tasks for Agents</h3>
              <span className="summary-chart-label">Record Count <span style={{ float: 'right', fontSize: '0.75rem', color: '#64748b' }}>Institution</span></span>
            </div>
            <div className="summary-chart-body">
              <div className="summary-chart-donut">
                <DonutChart data={summaryData.openTasks.byInstitution} total={summaryData.openTasks.total} />
              </div>
              <div className="summary-chart-legend">
                {summaryData.openTasks.byInstitution.slice(0, 6).map((item, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-text">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-chart-footer">
              As of Today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>

          {/* Applications By Institutions */}
          <div className="summary-chart-card">
            <div className="summary-chart-header">
              <h3>Applications By Institutions</h3>
              <span className="summary-chart-label">Record Count <span style={{ float: 'right', fontSize: '0.75rem', color: '#64748b' }}>Institution</span></span>
            </div>
            <div className="summary-chart-body">
              <div className="summary-chart-donut">
                <DonutChart data={summaryData.appsByInstitution.byInstitution} total={summaryData.appsByInstitution.total} />
              </div>
              <div className="summary-chart-legend">
                {summaryData.appsByInstitution.byInstitution.slice(0, 8).map((item, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-text">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-chart-footer">
              As of Today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>

          {/* All Applications By Stage */}
          <div className="summary-chart-card">
            <div className="summary-chart-header">
              <h3>All Applications By Stage</h3>
              <span className="summary-chart-label">Record Count <span style={{ float: 'right', fontSize: '0.75rem', color: '#64748b' }}>StageName</span></span>
            </div>
            <div className="summary-chart-body">
              <div className="summary-chart-donut">
                <DonutChart data={summaryData.appsByStage.byStage} total={summaryData.appsByStage.total} />
              </div>
              <div className="summary-chart-legend">
                {summaryData.appsByStage.byStage.map((item, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-text">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-chart-footer">
              As of Today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ LATEST NEWS GRID ═══════════ */}
      {newsPosts.length > 0 && (
        <section className="latest-news-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Latest News</h2>
              <p className="section-subtitle">Build your knowledge with updates from Admission Desk.</p>
            </div>
          </div>
          <div className="news-grid">
            {newsPosts.map((post: any) => (
              <Link key={post.id} to={`/dashboard/news/${post.slug || post.id}`} className="news-card-square" style={{ textDecoration: 'none' }}>
                <div className="news-card-img" style={{ backgroundImage: post.image_url ? `url(${post.image_url})` : `linear-gradient(135deg, #3A4391, #1e2560)` }}>
                  {post.category && <span className="news-card-badge">{post.category}</span>}
                </div>
                <div className="news-card-body">
                  <h4>{post.title}</h4>
                  <p className="news-card-date">{new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </Link>
            ))}
          </div>
          {newsPosts.length > 4 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" style={{ borderRadius: '99px', padding: '10px 32px', fontWeight: 700 }}>Load More</button>
            </div>
          )}
        </section>
      )}

      {/* ═══════════ BLOG POSTS ═══════════ */}
      {blogPosts.length > 0 && (
        <section className="blog-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Discover new updates and latest news in our Blog</h2>
            </div>
          </div>
          <div className="blog-grid">
            {blogPosts.map(post => (
              <Link key={post.id} to={`/dashboard/blog/${post.slug || post.id}`} className="blog-card" style={{ textDecoration: 'none' }}>
                <div className="blog-card-img" style={{ backgroundImage: post.featured_image_url ? `url(${post.featured_image_url})` : `linear-gradient(135deg, #1e293b, #334155)` }}>
                  {post.category && <span className="blog-card-badge">{post.category}</span>}
                </div>
                <div className="blog-card-body">
                  <h4>{post.title}</h4>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <p className="blog-card-date">{new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <Link to="/dashboard/blog" className="btn btn-primary" style={{ borderRadius: '99px', padding: '12px 36px', fontWeight: 700, fontSize: '0.95rem' }}>
              View more articles
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════ SOCIAL MEDIA ═══════════ */}
      <section className="social-section">
        <div className="social-links">
          <a href="https://www.instagram.com/go2skul" target="_blank" rel="noopener noreferrer" className="social-icon-link instagram" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
          <a href="https://www.linkedin.com/company/go2skul" target="_blank" rel="noopener noreferrer" className="social-icon-link linkedin" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a href="https://www.tiktok.com/@go2skul" target="_blank" rel="noopener noreferrer" className="social-icon-link tiktok" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
          </a>
          <a href="https://www.facebook.com/go2skul" target="_blank" rel="noopener noreferrer" className="social-icon-link facebook" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        </div>
      </section>

      {/* ═══════════ FULL WIDTH PARTNERS SECTION ═══════════ */}
      {allowedUnis.length > 0 && (
        <section className="partners-full-section">
          <div className="partners-section-header">
            <div>
              <h2 className="section-title">{t('dashboard.myPartners')}</h2>
              <p className="section-subtitle">Click on any institution to view all available programmes</p>
            </div>
            <Link to="/dashboard/courses" className="view-all-link">
              View All Courses <ArrowRight size={16} />
            </Link>
          </div>

          <div className="partners-grid-full">
            {allowedUnis.map((uni: any) => (
              <Link key={uni.id} to={`/dashboard/university/${uni.slug || uni.id}`} className="partner-card-full">
                <div className="partner-card-image">
                  <img
                    src={uni.image_url || `https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600`}
                    alt={uni.name}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600' }}
                  />
                  <div className="partner-card-overlay">
                    <span className="partner-view-btn">
                      View Programmes <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
                <div className="partner-card-content">
                  <div className="partner-card-logo">
                    {uni.logo_url ? (
                      <img src={uni.logo_url} alt={uni.name} />
                    ) : (
                      <GraduationCap size={24} />
                    )}
                  </div>
                  <h3 className="partner-card-name">{uni.name}</h3>
                  <div className="partner-card-location">
                    <MapPin size={14} />
                    <span>{uni.city ? `${uni.city}, ` : ''}{uni.country}</span>
                  </div>
                  {uni.ranking && (
                    <div className="partner-card-ranking">
                      <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                      <span>{uni.ranking}</span>
                    </div>
                  )}
                  {uni.student_count && (
                    <div className="partner-card-stats">
                      <Users size={12} />
                      <span>{uni.student_count.toLocaleString()}+ Students</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-col-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>{t('dashboard.recentApplications')}</h2>
            <Link to="/dashboard/applications" className="link-view-all">{t('common.viewAll')} <ChevronRight size={16} /></Link>
          </div>

          <div className="card-panel" style={{ padding: 0 }}>
            {loadingApps ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                {t('common.loading')}
              </div>
            ) : applications.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                <FileText size={48} className="empty-icon" style={{ marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>{t('dashboard.noApplications')}</h3>
                <p style={{ marginBottom: '1.5rem', color: '#94a3b8' }}>{t('dashboard.startSubmitting')}</p>
                <Link to="/dashboard/applications/create" className="btn btn-primary">{t('dashboard.createFirstApplication')}</Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('applications.studentName')}</th>
                      <th>{t('common.name')}</th>
                      <th>{t('common.status')}</th>
                      <th>{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app: any) => {
                      const name = app.students ? `${app.students.first_name} ${app.students.last_name}` : t('applications.unknown')
                      const prog = app.programs?.name || t('applications.unknownProgram')
                      const uni = app.universities?.name || ''
                      return (
                        <tr key={app.id}>
                          <td style={{ fontWeight: 600, color: '#334155' }}>{name}</td>
                          <td>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{prog}</div>
                            {uni && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{uni}</div>}
                          </td>
                          <td>{getStatusBadge(app.status)}</td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>{t('dashboard.quickActions')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { icon: <FileText size={20} />, label: t('dashboard.createApplication'), sub: t('applications.newApplication'), to: '/dashboard/applications/create', color: '#3A4391' },
                { icon: <GraduationCap size={20} />, label: t('dashboard.nav.courses'), sub: t('dashboard.searchProgrammes'), to: '/dashboard/courses', color: '#00CCA0' },
                { icon: <Users size={20} />, label: t('dashboard.nav.team'), sub: t('team.inviteMember'), to: '/dashboard/team', color: '#F59E0B' },
                ...(isSuperAgent || isAdmissionManager ? [{ icon: <ShieldCheck size={20} />, label: 'Admission Management', sub: 'Manage admissions & team', to: '/admin/admissions', color: '#8b5cf6' }] : []),
                ...(isProgramManager || isAdmin ? [{ icon: <BookOpen size={20} />, label: 'Program Management', sub: 'Universities & Programs', to: '/admin/programs', color: '#10b981' }] : []),
              ].map((a, i) => (
                <Link key={i} to={a.to} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', gap: '0.75rem', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = a.color, e.currentTarget.style.boxShadow = `0 4px 16px ${a.color}20`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#f1f5f9', e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{a.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.sub}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements */}
        <div className="dashboard-col-side">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Bell size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 className="section-title" style={{ margin: 0 }}>{t('dashboard.announcements')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {announcements.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px solid #f1f5f9' }}>
                {t('dashboard.noRecentAnnouncements')}
              </div>
            ) : announcements.map(ann => {
              const content = (
                <div style={{
                  background: 'white', borderRadius: '12px', padding: '1rem 1.25rem',
                  border: `1px solid ${ann.is_important ? '#fde68a' : '#f1f5f9'}`,
                  borderLeft: `3px solid ${ann.is_important ? '#f59e0b' : '#e2e8f0'}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s', cursor: ann.social_link ? 'pointer' : 'default'
                }}>
                  {ann.featured_image_url && (
                    <div style={{ width: '100%', height: '140px', borderRadius: '8px', backgroundImage: `url(${ann.featured_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '10px' }} />
                  )}
                  {ann.is_important && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#f59e0b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Required
                    </div>
                  )}
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px', lineHeight: 1.3 }}>{ann.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{new Date(ann.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )
              return ann.social_link ? (
                <a key={ann.id} href={ann.social_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                  {content}
                </a>
              ) : (
                <div key={ann.id}>{content}</div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ EVENT BOOKING MODAL ═══════════ */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-container event-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2><Calendar size={22} /> Events Hub</h2>
              <button onClick={() => setShowEventModal(false)} className="modal-close"><X size={20} /></button>
            </div>

            <div className="event-modal-tabs">
              <button className={`event-modal-tab ${eventTab === 'browse' ? 'active' : ''}`} onClick={() => setEventTab('browse')}>
                <Calendar size={15} /> Browse Events
              </button>
              <button className={`event-modal-tab ${eventTab === 'my' ? 'active' : ''}`} onClick={() => setEventTab('my')}>
                <CheckCircle2 size={15} /> My Bookings
              </button>
              <button className={`event-modal-tab ${eventTab === 'propose' ? 'active' : ''}`} onClick={() => { setEventTab('propose'); setProposalSuccess(false) }}>
                <Plus size={15} /> Propose Event
              </button>
            </div>

            <div className="modal-body">
              {/* Browse Tab */}
              {eventTab === 'browse' && (<>
                {bookingSuccess && (
                  <div className="booking-confirmation">
                    <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
                    <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Booking Confirmed!</h3>
                    <div className="booking-ref">REF-{bookingSuccess}</div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>You'll receive a confirmation email shortly.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setBookingSuccess(null)}>Browse More Events</button>
                  </div>
                )}
                {!bookingSuccess && events.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '0.5rem', color: '#475569' }}>No upcoming events</h3>
                    <p>Check back later or propose a new event!</p>
                  </div>
                ) : !bookingSuccess && events.map(ev => (
                  <div key={ev.id} className="event-card">
                    {ev.image_url && <div className="event-card-img" style={{ backgroundImage: `url(${ev.image_url})` }} />}
                    <div className="event-card-body">
                      <div className="event-card-type">{ev.event_type.toUpperCase()}</div>
                      <h4>{ev.title}</h4>
                      <div className="event-card-meta">
                        <span><Calendar size={13} /> {new Date(ev.event_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>{ev.is_online ? '🌐 Online' : `📍 ${ev.location}`}</span>
                        <span>👥 {ev.booking_count} booked{ev.max_attendees ? ` / ${ev.max_attendees} max` : ''}</span>
                        {ev.max_attendees && ev.booking_count! >= ev.max_attendees * 0.8 && !ev.is_booked && (
                          <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.75rem' }}><AlertCircle size={12} /> Filling up fast!</span>
                        )}
                      </div>
                      {ev.description && <p className="event-card-desc">{ev.description}</p>}

                      {!ev.is_booked && !(ev.max_attendees !== null && ev.booking_count! >= ev.max_attendees!) && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Add team members (optional):</p>
                          {teamMembers.map((m, i) => (
                            <div key={i} className="team-member-row" style={{ marginBottom: '6px' }}>
                              <input placeholder="Name" value={m.name} onChange={e => { const u = [...teamMembers]; u[i].name = e.target.value; setTeamMembers(u) }} />
                              <input placeholder="Email (optional)" value={m.email} onChange={e => { const u = [...teamMembers]; u[i].email = e.target.value; setTeamMembers(u) }} />
                              <button className="team-member-remove" onClick={() => setTeamMembers(teamMembers.filter((_, j) => j !== i))}><X size={14} /></button>
                            </div>
                          ))}
                          <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', marginBottom: '6px' }} onClick={() => setTeamMembers([...teamMembers, { name: '', email: '' }])}>
                            <Plus size={12} /> Add Team Member
                          </button>
                        </div>
                      )}

                      <button
                        className={`btn ${ev.is_booked ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => ev.is_booked ? handleBookEvent(ev.id) : handleBookWithTeam(ev.id)}
                        disabled={bookingEventId === ev.id || (!ev.is_booked && ev.max_attendees !== null && ev.booking_count! >= ev.max_attendees!)}
                        style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {bookingEventId === ev.id ? <><Loader2 size={14} className="spinning" /> Processing...</> :
                          ev.is_booked ? <><X size={14} /> Cancel Booking</> :
                          ev.max_attendees !== null && ev.booking_count! >= ev.max_attendees! ? 'Fully Booked' :
                          <><CheckCircle2 size={14} /> Book{teamMembers.length > 0 ? ` (${1 + teamMembers.length} people)` : ''}</>
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </>)}

              {/* My Bookings Tab */}
              {eventTab === 'my' && (
                myBookings.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Calendar size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>You haven't booked any events yet.</p>
                  </div>
                ) : myBookings.map(b => (
                  <div key={b.id} className="event-card" style={{ borderLeft: '3px solid #10b981' }}>
                    <div className="event-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div className="event-card-type">{(b.events as any)?.event_type?.toUpperCase()}</div>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>✓ Confirmed</span>
                      </div>
                      <h4>{(b.events as any)?.title}</h4>
                      <div className="event-card-meta">
                        <span><Calendar size={13} /> {new Date((b.events as any)?.event_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span>{(b.events as any)?.is_online ? '🌐 Online' : `📍 ${(b.events as any)?.location}`}</span>
                      </div>
                      <div className="booking-ref" style={{ marginTop: '8px', fontSize: '0.82rem', padding: '6px 14px' }}>REF-{b.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                ))
              )}

              {/* Propose Event Tab */}
              {eventTab === 'propose' && (
                proposalSuccess ? (
                  <div className="booking-confirmation">
                    <Sparkles size={48} style={{ color: '#3A4391', marginBottom: '0.5rem' }} />
                    <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Proposal Submitted!</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Your event idea has been sent to the admin team for review. We'll notify you when it's approved.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { setProposalSuccess(false); setProposalForm({ title: '', description: '', proposed_type: 'webinar', proposed_date: '', proposed_location: '', is_online: true, expected_audience: '', topics: '' }) }}>Submit Another</button>
                  </div>
                ) : (
                  <div className="event-proposal-form">
                    <label>Event Title *
                      <input placeholder="e.g. Study in UK Webinar 2026" value={proposalForm.title} onChange={e => setProposalForm({...proposalForm, title: e.target.value})} />
                    </label>
                    <label>Description
                      <textarea placeholder="Describe the event, what it covers, who it's for..." value={proposalForm.description} onChange={e => setProposalForm({...proposalForm, description: e.target.value})} />
                    </label>
                    <div className="event-proposal-row">
                      <label>Event Type
                        <select value={proposalForm.proposed_type} onChange={e => setProposalForm({...proposalForm, proposed_type: e.target.value})}>
                          <option value="webinar">Webinar</option>
                          <option value="workshop">Workshop</option>
                          <option value="conference">Conference</option>
                          <option value="training">Training</option>
                          <option value="meetup">Meetup</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label>Preferred Date
                        <input type="datetime-local" value={proposalForm.proposed_date} onChange={e => setProposalForm({...proposalForm, proposed_date: e.target.value})} />
                      </label>
                    </div>
                    <div className="event-proposal-row">
                      <label>Expected Audience Size
                        <input type="number" placeholder="e.g. 50" value={proposalForm.expected_audience} onChange={e => setProposalForm({...proposalForm, expected_audience: e.target.value})} />
                      </label>
                      <label style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" checked={proposalForm.is_online} onChange={e => setProposalForm({...proposalForm, is_online: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                        Online Event
                      </label>
                    </div>
                    {!proposalForm.is_online && (
                      <label>Location
                        <input placeholder="Event venue or city" value={proposalForm.proposed_location} onChange={e => setProposalForm({...proposalForm, proposed_location: e.target.value})} />
                      </label>
                    )}
                    <label>Topics / Subjects <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>(comma-separated)</span>
                      <input placeholder="e.g. UK Visa, IELTS Prep, Scholarships" value={proposalForm.topics} onChange={e => setProposalForm({...proposalForm, topics: e.target.value})} />
                    </label>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginTop: '0.5rem' }}
                      onClick={handleProposal} disabled={proposalSubmitting || !proposalForm.title.trim()}>
                      {proposalSubmitting ? <><Loader2 size={14} className="spinning" /> Submitting...</> : <><Send size={14} /> Submit Proposal</>}
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ PATHFINDER MODAL ═══════════ */}
      {showPathfinder && (
        <div className="modal-overlay" onClick={() => setShowPathfinder(false)}>
          <div className="modal-container pathfinder-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header pathfinder-modal-header">
              <h2>Admission Desk Programme Pathfinder</h2>
              <button onClick={() => setShowPathfinder(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="pathfinder-filters-row">
              <select className="pf-select" value={pfInstitution} onChange={e => setPfInstitution(e.target.value)}>
                <option value="">All Institutions</option>
                {pfAllUnis.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select className="pf-select" value={pfCountry} onChange={e => setPfCountry(e.target.value)}>
                <option value="">Country</option>
                {pfAllCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="pf-select" value={pfLevel} onChange={e => setPfLevel(e.target.value)}>
                <option value="">Level</option>
                {pfAllLevels.map(l => <option key={l} value={l}>{LEVEL_LABELS[l] || l}</option>)}
              </select>
              <select className="pf-select" value={pfSubject} onChange={e => setPfSubject(e.target.value)}>
                <option value="">Subject</option>
                {pfAllSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="pf-search-bar">
              <Search size={16} style={{ color: '#94a3b8' }} />
              <input type="text" placeholder="Search for Course..." value={pfSearch} onChange={e => setPfSearch(e.target.value)} />
            </div>
            <div className="pf-results">
              {pfLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Loader2 size={24} className="spinning" style={{ margin: '0 auto 0.5rem' }} />
                  Searching...
                </div>
              ) : pfPrograms.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No courses found. Try adjusting your filters.</div>
              ) : pfPrograms.map((prog: any) => {
                const isActiveUni = allowedUnis.some(u => u.id === prog.university_id)
                const isPending = pfPendingRequests.has(prog.university_id)
                return (
                  <div key={prog.id} className="pf-result-item" style={{ opacity: isActiveUni ? 1 : 0.8, filter: isActiveUni ? 'none' : 'grayscale(0.5)' }}>
                    <div className="pf-result-logo">
                      {prog.universities?.logo_url ? (
                        <img src={prog.universities.logo_url} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <GraduationCap size={24} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                    <div className="pf-result-info">
                      <h4>{prog.name}</h4>
                      <div className="pf-result-meta">
                        <span><MapPin size={12} /> {prog.universities?.city ? `${prog.universities.city}, ` : ''}{prog.universities?.country}</span>
                        <span><GraduationCap size={12} /> {LEVEL_LABELS[prog.level] || prog.level}</span>
                      </div>
                    </div>
                    <div className="pf-result-actions">
                      {isActiveUni ? (
                        <Link to={`/dashboard/applications/new?university=${prog.university_id}&program=${prog.id}`} className="btn btn-primary btn-sm pf-action-btn">Apply</Link>
                      ) : isPending ? (
                        <button disabled className="btn btn-outline btn-sm pf-action-btn" style={{ opacity: 0.6 }}><Clock size={14}/> Pending</button>
                      ) : (
                        <button onClick={() => handlePfActivate(prog.university_id)} className="btn btn-outline btn-sm pf-action-btn" style={{ borderStyle: 'dashed' }}>Activate</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activation Modal from Pathfinder */}
      {activatingUniId && pfAllUnis && user && profile && (() => {
        const uni = pfAllUnis.find(u => u.id === activatingUniId)
        if (!uni) return null
        return (
          <ActivatePartnerModal
            university={uni}
            agentId={user.id}
            agentName={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
            agentEmail={profile.email || user.email || ''}
            agencyName={profile.agency_name || ''}
            onClose={() => setActivatingUniId(null)}
            onSuccess={() => {
              setPfPendingRequests(prev => new Set([...prev, uni.id]))
              setActivatingUniId(null)
            }}
          />
        )
      })()}
    </div>
  )
}
