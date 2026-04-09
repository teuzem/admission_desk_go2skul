import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import './AdvancedAnalytics.css';
import {
  AgentCategory,
  AGENT_CATEGORY_CONFIG,
  CHART_COLORS
} from '../../../types/database-extended';
import {
  BarChart3, Globe, Users, TrendingUp, Activity,
  ArrowUpRight, ArrowDownRight, Loader2, Calendar, RefreshCw, Wifi,
  CheckCircle, XCircle, Clock, GraduationCap, Award
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, Treemap, FunnelChart, Funnel, LabelList
} from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

interface ExtendedApplication {
  id: string;
  agent_id: string;
  student_id: string;
  university_id: string;
  program_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { id?: string; email?: string; agency_name?: string; country?: string; first_name?: string; last_name?: string };
  students?: { first_name?: string; last_name?: string; home_country?: string; nationality?: string };
  universities?: { name?: string; country?: string };
  programs?: { name?: string; level?: string; category?: string };
}

interface CountryAnalytics {
  country: string;
  total_count: number;
  accepted_count: number;
  rejected_count: number;
  enrollment_count: number;
  percentage: number;
}

interface RegionAnalytics {
  region_name: string;
  total_count: number;
  percentage: number;
}

interface AgentCategoryAnalytics {
  category: string;
  category_label: string;
  total_count: number;
  accepted_count: number;
  success_rate: number;
  percentage: number;
  color: string;
}

interface AgentPerformanceData {
  agent_id: string;
  agent_name: string;
  agency_name: string;
  total_applications: number;
  submitted: number;
  under_review: number;
  offers: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
  success_rate: number;
}

interface TopDestination {
  university_id: string;
  university_name: string;
  country: string;
  total_applications: number;
  offers: number;
  enrollments: number;
  acceptance_rate: number;
}

interface TimelineData {
  date: string;
  label: string;
  applications: number;
  offers: number;
  acceptances: number;
  rejections: number;
  enrollments: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

interface FunnelStep {
  name: string;
  value: number;
  fill: string;
}

type TabType = 'overview' | 'geographic' | 'agent_categories' | 'performance';

// ============================================================================
// CONSTANTS
// ============================================================================

const COUNTRY_TO_REGION: Record<string, string> = {
  'Nigeria': 'Africa', 'Kenya': 'Africa', 'Ghana': 'Africa', 'South Africa': 'Africa',
  'Cameroon': 'Africa', 'Tanzania': 'Africa', 'Ethiopia': 'Africa', 'Uganda': 'Africa',
  'Senegal': 'Africa', 'Rwanda': 'Africa', 'Ivory Coast': 'Africa', 'Morocco': 'Africa',
  'Egypt': 'Africa', 'Algeria': 'Africa', 'Tunisia': 'Africa', 'Congo': 'Africa',
  'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe',
  'Spain': 'Europe', 'Italy': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe',
  'Sweden': 'Europe', 'Denmark': 'Europe', 'Switzerland': 'Europe', 'Portugal': 'Europe',
  'Poland': 'Europe', 'Austria': 'Europe', 'Ireland': 'Europe', 'Norway': 'Europe',
  'United States': 'North America', 'Canada': 'North America',
  'China': 'Asia Pacific', 'India': 'Asia Pacific', 'Japan': 'Asia Pacific',
  'Australia': 'Asia Pacific', 'South Korea': 'Asia Pacific', 'Malaysia': 'Asia Pacific',
  'Singapore': 'Asia Pacific', 'Thailand': 'Asia Pacific', 'Vietnam': 'Asia Pacific',
  'Philippines': 'Asia Pacific', 'Indonesia': 'Asia Pacific', 'Bangladesh': 'Asia Pacific',
  'Pakistan': 'Asia Pacific', 'Sri Lanka': 'Asia Pacific', 'Nepal': 'Asia Pacific',
  'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East',
  'Turkey': 'Middle East', 'Qatar': 'Middle East', 'Kuwait': 'Middle East',
  'Oman': 'Middle East', 'Bahrain': 'Middle East', 'Jordan': 'Middle East',
  'Lebanon': 'Middle East', 'Iraq': 'Middle East', 'Iran': 'Middle East',
  'Brazil': 'Latin America', 'Mexico': 'Latin America', 'Colombia': 'Latin America',
  'Argentina': 'Latin America', 'Chile': 'Latin America', 'Peru': 'Latin America',
};

const REGION_COLORS: Record<string, string> = {
  'Africa': '#8b5cf6', 'Europe': '#3b82f6', 'North America': '#ef4444',
  'Asia Pacific': '#10b981', 'Middle East': '#f59e0b', 'Latin America': '#06b6d4', 'Other': '#94a3b8'
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: '#94a3b8', label: 'Draft' },
  submitted: { color: '#3b82f6', label: 'Submitted' },
  under_review: { color: '#f59e0b', label: 'Under Review' },
  offer: { color: '#10b981', label: 'Offer' },
  accepted: { color: '#06b6d4', label: 'Accepted' },
  rejected: { color: '#ef4444', label: 'Rejected' },
  enrolled: { color: '#8b5cf6', label: 'Enrolled' },
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const LoadingSpinner = ({ size = 20 }: { size?: number }) => (
  <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.98)', padding: '12px 16px', border: '1px solid #e5e7eb',
      borderRadius: '10px', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: '6px', color: '#1e293b', fontSize: '0.82rem' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, fontSize: '0.8rem', margin: '2px 0', fontWeight: 600 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

const StatsCard = ({ title, value, change, icon: Icon, color, subtitle }: {
  title: string; value: string | number; change?: number; icon: React.ElementType; color: string; subtitle?: string;
}) => (
  <div className="aa-stat-card" style={{ borderLeftColor: color }}>
    <div className="aa-stat-icon" style={{ background: `${color}15`, color }}><Icon size={20} /></div>
    <div className="aa-stat-content">
      <span className="aa-stat-title">{title}</span>
      <span className="aa-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      {change !== undefined && (
        <span className={`aa-stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change).toFixed(1)}%
        </span>
      )}
      {subtitle && <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{subtitle}</span>}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdvancedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);

  // Data
  const [countryAnalytics, setCountryAnalytics] = useState<CountryAnalytics[]>([]);
  const [regionAnalytics, setRegionAnalytics] = useState<RegionAnalytics[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<AgentCategoryAnalytics[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceData[]>([]);
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [programLevelData, setProgramLevelData] = useState<any[]>([]);

  // Counters
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalOffers, setTotalOffers] = useState(0);
  const [totalAcceptances, setTotalAcceptances] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [prevTotalApps, setPrevTotalApps] = useState(0);

  const [agentCategoryMap, setAgentCategoryMap] = useState<Record<string, AgentCategory>>({});

  // Fetch agent categories
  const fetchAgentCategories = useCallback(async () => {
    const { data } = await supabase.from('agent_categories' as any).select('agent_id, category');
    const map: Record<string, AgentCategory> = {};
    (data || []).forEach((r: any) => { map[r.agent_id] = r.category; });
    setAgentCategoryMap(map);
  }, []);

  // Main data fetch
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const numDays = daysMap[dateRange];
      const startDate = new Date(now.getTime() - numDays * 86400000);
      const prevStartDate = new Date(startDate.getTime() - numDays * 86400000);

      const [appsRes, prevAppsRes] = await Promise.all([
        supabase.from('applications').select(`
          id, agent_id, student_id, university_id, program_id, status,
          created_at, updated_at,
          profiles:agent_id(id, email, agency_name, country, first_name, last_name),
          students:student_id(first_name, last_name, home_country, nationality),
          universities:university_id(name, country),
          programs:program_id(name, level, category)
        `).gte('created_at', startDate.toISOString()).order('created_at', { ascending: false }),
        supabase.from('applications').select('id, status')
          .gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString())
      ]);

      const apps = (appsRes.data || []) as unknown as ExtendedApplication[];
      const prevApps = prevAppsRes.data || [];
      const totalApps = apps.length || 1;
      setPrevTotalApps(prevApps.length);
      setTotalApplications(apps.length);

      let offers = 0, acceptances = 0, enrollments = 0, rejections = 0, underReview = 0, submitted = 0;
      apps.forEach(a => {
        if (a.status === 'offer') offers++;
        if (a.status === 'accepted') acceptances++;
        if (a.status === 'enrolled') enrollments++;
        if (a.status === 'rejected') rejections++;
        if (a.status === 'under_review') underReview++;
        if (a.status === 'submitted') submitted++;
      });
      setTotalOffers(offers);
      setTotalAcceptances(acceptances);
      setTotalEnrollments(enrollments);

      // ── Status Distribution (Pie) ──
      const statusDist: StatusDistribution[] = Object.keys(STATUS_CONFIG)
        .map(k => ({ name: STATUS_CONFIG[k].label, value: apps.filter(a => a.status === k).length, color: STATUS_CONFIG[k].color }))
        .filter(s => s.value > 0);
      setStatusDistribution(statusDist);

      // ── Conversion Funnel ──
      setFunnelData([
        { name: 'Submitted', value: submitted + underReview + offers + acceptances + enrollments + rejections, fill: '#3b82f6' },
        { name: 'Under Review', value: underReview + offers + acceptances + enrollments, fill: '#f59e0b' },
        { name: 'Offers', value: offers + acceptances + enrollments, fill: '#10b981' },
        { name: 'Accepted', value: acceptances + enrollments, fill: '#06b6d4' },
        { name: 'Enrolled', value: enrollments, fill: '#8b5cf6' },
      ].filter(f => f.value > 0));

      // ── Country Analytics ──
      const countryMap: Record<string, CountryAnalytics> = {};
      apps.forEach(app => {
        const c = app.students?.home_country || app.students?.nationality || 'Unknown';
        if (c === 'Unknown') return;
        if (!countryMap[c]) countryMap[c] = { country: c, total_count: 0, accepted_count: 0, rejected_count: 0, enrollment_count: 0, percentage: 0 };
        countryMap[c].total_count++;
        if (app.status === 'accepted' || app.status === 'enrolled') countryMap[c].accepted_count++;
        if (app.status === 'rejected') countryMap[c].rejected_count++;
        if (app.status === 'enrolled') countryMap[c].enrollment_count++;
      });
      setCountryAnalytics(Object.values(countryMap).map(c => ({ ...c, percentage: (c.total_count / totalApps) * 100 })).sort((a, b) => b.total_count - a.total_count).slice(0, 12));

      // ── Region Analytics ──
      const regionMap: Record<string, RegionAnalytics> = {};
      apps.forEach(app => {
        const c = app.students?.home_country || app.students?.nationality || 'Unknown';
        const r = COUNTRY_TO_REGION[c] || 'Other';
        if (!regionMap[r]) regionMap[r] = { region_name: r, total_count: 0, percentage: 0 };
        regionMap[r].total_count++;
      });
      setRegionAnalytics(Object.values(regionMap).map(r => ({ ...r, percentage: (r.total_count / totalApps) * 100 })).sort((a, b) => b.total_count - a.total_count));

      // ── Agent Categories ──
      const catMap: Record<string, AgentCategoryAnalytics> = {};
      apps.forEach(app => {
        const agentCat = agentCategoryMap[app.agent_id] || 'pending_classification';
        const cfg = AGENT_CATEGORY_CONFIG[agentCat] || AGENT_CATEGORY_CONFIG['pending_classification'];
        if (!catMap[agentCat]) catMap[agentCat] = { category: agentCat, category_label: cfg.label, total_count: 0, accepted_count: 0, success_rate: 0, percentage: 0, color: cfg.color };
        catMap[agentCat].total_count++;
        if (app.status === 'accepted' || app.status === 'enrolled') catMap[agentCat].accepted_count++;
      });
      setCategoryAnalytics(Object.values(catMap).map(c => ({ ...c, percentage: (c.total_count / totalApps) * 100, success_rate: c.total_count > 0 ? (c.accepted_count / c.total_count) * 100 : 0 })).sort((a, b) => b.total_count - a.total_count));

      // ── Agent Performance ──
      const agentMap: Record<string, AgentPerformanceData> = {};
      apps.forEach(app => {
        const id = app.agent_id;
        if (!agentMap[id]) {
          const p = app.profiles as any;
          const name = (p?.first_name || p?.last_name) ? `${p?.first_name || ''} ${p?.last_name || ''}`.trim() : (p?.email?.split('@')[0] || 'Unknown');
          agentMap[id] = { agent_id: id, agent_name: name, agency_name: p?.agency_name || 'Independent', total_applications: 0, submitted: 0, under_review: 0, offers: 0, acceptances: 0, rejections: 0, enrollments: 0, success_rate: 0 };
        }
        agentMap[id].total_applications++;
        if (app.status === 'submitted') agentMap[id].submitted++;
        if (app.status === 'under_review') agentMap[id].under_review++;
        if (app.status === 'offer') agentMap[id].offers++;
        if (app.status === 'accepted') agentMap[id].acceptances++;
        if (app.status === 'rejected') agentMap[id].rejections++;
        if (app.status === 'enrolled') agentMap[id].enrollments++;
      });
      const agentData = Object.values(agentMap).map(a => ({ ...a, success_rate: a.total_applications > 0 ? ((a.acceptances + a.enrollments) / a.total_applications) * 100 : 0 })).sort((a, b) => b.total_applications - a.total_applications).slice(0, 15);
      setAgentPerformance(agentData);

      // ── Radar data (top 5 agents) ──
      const topAgents = agentData.slice(0, 5);
      if (topAgents.length > 0) {
        const maxApps = Math.max(...topAgents.map(a => a.total_applications), 1);
        setRadarData(topAgents.map(a => ({
          agent: a.agency_name.length > 12 ? a.agency_name.substring(0, 12) + '…' : a.agency_name,
          applications: Math.round((a.total_applications / maxApps) * 100),
          offers: Math.round((a.offers / (maxApps * 0.5 || 1)) * 100),
          success: Math.round(a.success_rate),
          volume: Math.round((a.total_applications / maxApps) * 100),
        })));
      }

      // ── Top Destinations ──
      const uniMap: Record<string, TopDestination> = {};
      apps.forEach(app => {
        const uid = app.university_id;
        if (!uid) return;
        if (!uniMap[uid]) uniMap[uid] = { university_id: uid, university_name: app.universities?.name || 'Unknown', country: app.universities?.country || '', total_applications: 0, offers: 0, enrollments: 0, acceptance_rate: 0 };
        uniMap[uid].total_applications++;
        if (['offer', 'accepted', 'enrolled'].includes(app.status)) uniMap[uid].offers++;
        if (app.status === 'enrolled') uniMap[uid].enrollments++;
      });
      setTopDestinations(Object.values(uniMap).map(u => ({ ...u, acceptance_rate: u.total_applications > 0 ? (u.offers / u.total_applications) * 100 : 0 })).sort((a, b) => b.total_applications - a.total_applications).slice(0, 10));

      // ── Program Level Distribution ──
      const levelMap: Record<string, number> = {};
      apps.forEach(app => {
        const level = app.programs?.level || 'Unknown';
        levelMap[level] = (levelMap[level] || 0) + 1;
      });
      setProgramLevelData(Object.entries(levelMap).map(([name, value], i) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: CHART_COLORS[i % CHART_COLORS.length] })).sort((a, b) => b.value - a.value));

      // ── Timeline ──
      const tlMap: Record<string, TimelineData> = {};
      if (dateRange === '7d' || dateRange === '30d') {
        const days = dateRange === '7d' ? 6 : 29;
        for (let i = days; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i);
          const k = d.toISOString().split('T')[0];
          tlMap[k] = { date: k, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), applications: 0, offers: 0, acceptances: 0, rejections: 0, enrollments: 0 };
        }
      } else {
        const months = dateRange === '90d' ? 3 : 12;
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          tlMap[k] = { date: k, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), applications: 0, offers: 0, acceptances: 0, rejections: 0, enrollments: 0 };
        }
      }
      apps.forEach(app => {
        const dt = new Date(app.created_at);
        const k = dateRange === '7d' || dateRange === '30d' ? dt.toISOString().split('T')[0] : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (tlMap[k]) {
          tlMap[k].applications++;
          if (app.status === 'offer') tlMap[k].offers++;
          if (app.status === 'accepted') tlMap[k].acceptances++;
          if (app.status === 'rejected') tlMap[k].rejections++;
          if (app.status === 'enrolled') tlMap[k].enrollments++;
        }
      });
      setTimelineData(Object.values(tlMap).sort((a, b) => a.date.localeCompare(b.date)));

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, agentCategoryMap]);

  useEffect(() => { fetchAgentCategories(); }, [fetchAgentCategories]);
  useEffect(() => { fetchAnalyticsData(); }, [fetchAnalyticsData]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel('analytics_rt_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        setIsRealtime(true); fetchAnalyticsData(); setTimeout(() => setIsRealtime(false), 2500);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAnalyticsData]);

  const appChange = prevTotalApps > 0 ? ((totalApplications - prevTotalApps) / prevTotalApps) * 100 : undefined;

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'geographic', label: 'Geographic', icon: Globe },
    { id: 'agent_categories', label: 'Agent Categories', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ];

  if (loading) return (
    <div className="aa-loading"><LoadingSpinner size={40} /><p>Loading live analytics from Supabase...</p></div>
  );

  return (
    <div className="aa-container">
      {/* Header */}
      <div className="aa-header">
        <div>
          <h2>Advanced Analytics</h2>
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Real-time insights powered by Supabase
            {isRealtime && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}><Wifi size={12} /> Live Update</span>}
          </p>
        </div>
        <div className="aa-header-actions">
          {lastUpdated && <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Updated: {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={fetchAnalyticsData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="aa-date-selector">
            <Calendar size={16} />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="aa-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`aa-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
      {activeTab === 'overview' && (
        <div className="aa-content">
          <div className="aa-stats-grid">
            <StatsCard title="Total Applications" value={totalApplications} change={appChange} icon={Activity} color="#3A4391" subtitle={`${dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : dateRange === '90d' ? '90 days' : '1 year'}`} />
            <StatsCard title="Offers Given" value={totalOffers} icon={TrendingUp} color="#00CCA0" subtitle={`${totalApplications > 0 ? ((totalOffers / totalApplications) * 100).toFixed(1) : 0}% offer rate`} />
            <StatsCard title="Acceptances" value={totalAcceptances} icon={CheckCircle} color="#3b82f6" subtitle={`${totalApplications > 0 ? ((totalAcceptances / totalApplications) * 100).toFixed(1) : 0}% accept rate`} />
            <StatsCard title="Enrollments" value={totalEnrollments} icon={GraduationCap} color="#8b5cf6" subtitle={`${totalApplications > 0 ? ((totalEnrollments / totalApplications) * 100).toFixed(1) : 0}% conversion`} />
          </div>

          {/* Timeline + Status Distribution */}
          <div className="aa-chart-grid">
            <div className="aa-chart-card">
              <h3><Activity size={16} style={{ color: '#3A4391' }} /> Application Trends</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3A4391" stopOpacity={0.25} /><stop offset="95%" stopColor="#3A4391" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="gOffers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00CCA0" stopOpacity={0.25} /><stop offset="95%" stopColor="#00CCA0" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Area type="monotone" dataKey="applications" stroke="#3A4391" strokeWidth={2.5} fill="url(#gApps)" name="Applications" />
                  <Area type="monotone" dataKey="offers" stroke="#00CCA0" strokeWidth={2} fill="url(#gOffers)" name="Offers" />
                  <Area type="monotone" dataKey="acceptances" stroke="#3b82f6" strokeWidth={1.5} fill="transparent" name="Acceptances" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="aa-chart-card">
              <h3><BarChart3 size={16} style={{ color: '#00CCA0' }} /> Status Distribution</h3>
              {statusDistribution.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>No applications in this period</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                      {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Conversion Funnel + Program Levels */}
          <div className="aa-chart-grid">
            <div className="aa-chart-card">
              <h3><TrendingUp size={16} style={{ color: '#3b82f6' }} /> Conversion Funnel</h3>
              {funnelData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>No data available</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[0, 8, 8, 0]}>
                      {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="aa-chart-card">
              <h3><GraduationCap size={16} style={{ color: '#8b5cf6' }} /> Program Levels</h3>
              {programLevelData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>No program data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={programLevelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                      {programLevelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Destinations */}
          <div className="aa-chart-card">
            <h3><Award size={16} style={{ color: '#f59e0b' }} /> Top Destinations</h3>
            {topDestinations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}><Globe size={32} style={{ opacity: 0.5, marginBottom: '8px' }} /><p>No destination data</p></div>
            ) : (
              <div className="aa-table-container"><table className="aa-table"><thead><tr><th>#</th><th>University</th><th>Country</th><th>Applications</th><th>Offers</th><th>Rate</th></tr></thead><tbody>
                {topDestinations.map((d, i) => (
                  <tr key={d.university_id}><td style={{ fontWeight: 700, color: '#3A4391' }}>{i + 1}</td><td style={{ fontWeight: 600 }}>{d.university_name}</td><td>{d.country}</td><td><strong>{d.total_applications}</strong></td><td>{d.offers}</td>
                    <td><span className={`aa-badge ${d.acceptance_rate >= 50 ? 'success' : d.acceptance_rate >= 30 ? 'warning' : 'danger'}`}>{d.acceptance_rate.toFixed(1)}%</span></td></tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ GEOGRAPHIC TAB ═══════════════════ */}
      {activeTab === 'geographic' && (
        <div className="aa-content">
          {countryAnalytics.length === 0 ? (
            <div className="aa-chart-card" style={{ textAlign: 'center', padding: '3rem' }}><Globe size={48} style={{ color: '#94a3b8', opacity: 0.5, marginBottom: '12px' }} /><h3 style={{ color: '#64748b' }}>No Geographic Data</h3><p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Data appears when applications have student country info.</p></div>
          ) : (
            <>
              {/* Stats Row */}
              <div className="aa-stats-grid">
                <StatsCard title="Countries Reached" value={countryAnalytics.length} icon={Globe} color="#3b82f6" />
                <StatsCard title="Regions Active" value={regionAnalytics.length} icon={Globe} color="#10b981" />
                <StatsCard title="Top Country" value={countryAnalytics[0]?.country || '—'} icon={Activity} color="#f59e0b" subtitle={`${countryAnalytics[0]?.total_count || 0} applications`} />
                <StatsCard title="Top Region" value={regionAnalytics[0]?.region_name || '—'} icon={TrendingUp} color="#8b5cf6" subtitle={`${regionAnalytics[0]?.total_count || 0} applications`} />
              </div>

              {/* Country Bar Chart (full width) */}
              <div className="aa-chart-card">
                <h3><Globe size={16} style={{ color: '#3b82f6' }} /> Applications by Student Origin</h3>
                <ResponsiveContainer width="100%" height={Math.max(260, countryAnalytics.length * 35)}>
                  <BarChart data={countryAnalytics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis dataKey="country" type="category" stroke="#475569" fontSize={11} width={130} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar dataKey="total_count" fill="#3A4391" name="Total" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="accepted_count" fill="#10b981" name="Accepted" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="rejected_count" fill="#ef4444" name="Rejected" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Region Pie + Bar */}
              <div className="aa-chart-grid">
                <div className="aa-chart-card">
                  <h3>Region Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={regionAnalytics} dataKey="total_count" nameKey="region_name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                        label={({ region_name, percentage }) => `${region_name}: ${percentage.toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                        {regionAnalytics.map((e) => <Cell key={e.region_name} fill={REGION_COLORS[e.region_name] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="aa-chart-card">
                  <h3>Applications per Region</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={regionAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="region_name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total_count" fill="#00CCA0" name="Applications" radius={[6, 6, 0, 0]}>
                        {regionAnalytics.map((e) => <Cell key={e.region_name} fill={REGION_COLORS[e.region_name] || '#94a3b8'} />)}
                      </Bar>
                      <Line type="monotone" dataKey="percentage" stroke="#3A4391" strokeWidth={2} name="% Share" dot={{ fill: '#3A4391', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Country Table */}
              <div className="aa-chart-card">
                <h3>Country Performance</h3>
                <div className="aa-table-container"><table className="aa-table"><thead><tr><th>Country</th><th>Total</th><th>Accepted</th><th>Rejected</th><th>Enrolled</th><th>Share</th></tr></thead><tbody>
                  {countryAnalytics.map(c => (
                    <tr key={c.country}><td style={{ fontWeight: 600 }}>{c.country}</td><td><strong>{c.total_count}</strong></td><td style={{ color: '#10b981' }}>{c.accepted_count}</td><td style={{ color: '#ef4444' }}>{c.rejected_count}</td><td style={{ color: '#8b5cf6' }}>{c.enrollment_count}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="aa-progress-bar"><div className="aa-progress-fill" style={{ width: `${c.percentage}%`, background: '#3A4391' }} /></div><span className="aa-progress-text">{c.percentage.toFixed(1)}%</span></div></td></tr>
                  ))}
                </tbody></table></div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ AGENT CATEGORIES TAB ═══════════════════ */}
      {activeTab === 'agent_categories' && (
        <div className="aa-content">
          {categoryAnalytics.length === 0 ? (
            <div className="aa-chart-card" style={{ textAlign: 'center', padding: '3rem' }}><Users size={48} style={{ color: '#94a3b8', opacity: 0.5, marginBottom: '12px' }} /><h3 style={{ color: '#64748b' }}>No Category Data</h3><p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Agent category analytics appear once applications are submitted.</p></div>
          ) : (
            <>
              {/* Stats */}
              <div className="aa-stats-grid">
                {categoryAnalytics.slice(0, 4).map(cat => (
                  <StatsCard key={cat.category} title={cat.category_label} value={cat.total_count} icon={Users} color={cat.color} subtitle={`${cat.success_rate.toFixed(1)}% success rate`} />
                ))}
              </div>

              {/* Pie + Success Rate Bar */}
              <div className="aa-chart-grid">
                <div className="aa-chart-card">
                  <h3>Applications by Agent Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={categoryAnalytics} dataKey="total_count" nameKey="category_label" cx="50%" cy="50%" outerRadius={100} innerRadius={45}
                        label={({ category_label, percentage }) => `${category_label}: ${percentage.toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                        {categoryAnalytics.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="aa-chart-card">
                  <h3>Success Rate by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="category_label" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="success_rate" name="Success Rate %" radius={[6, 6, 0, 0]}>
                        {categoryAnalytics.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Volume vs Acceptance (Composed) */}
              <div className="aa-chart-card">
                <h3>Volume vs Acceptance by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={categoryAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="category_label" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar yAxisId="left" dataKey="total_count" fill="#3A4391" name="Total Apps" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="left" dataKey="accepted_count" fill="#10b981" name="Accepted" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="success_rate" stroke="#f59e0b" strokeWidth={3} name="Success %" dot={{ fill: '#f59e0b', r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Category Table */}
              <div className="aa-chart-card">
                <h3>Category Performance</h3>
                <div className="aa-table-container"><table className="aa-table"><thead><tr><th>Category</th><th>Total</th><th>Accepted</th><th>Success Rate</th><th>Share</th></tr></thead><tbody>
                  {categoryAnalytics.map(c => (
                    <tr key={c.category}><td><span className="aa-category-badge" style={{ background: `${c.color}20`, color: c.color }}>{c.category_label}</span></td><td><strong>{c.total_count}</strong></td><td>{c.accepted_count}</td>
                      <td><span className={`aa-badge ${c.success_rate >= 50 ? 'success' : c.success_rate >= 30 ? 'warning' : 'danger'}`}>{c.success_rate.toFixed(1)}%</span></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="aa-progress-bar"><div className="aa-progress-fill" style={{ width: `${c.percentage}%`, background: c.color }} /></div><span className="aa-progress-text">{c.percentage.toFixed(1)}%</span></div></td></tr>
                  ))}
                </tbody></table></div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ PERFORMANCE TAB ═══════════════════ */}
      {activeTab === 'performance' && (
        <div className="aa-content">
          {agentPerformance.length === 0 ? (
            <div className="aa-chart-card" style={{ textAlign: 'center', padding: '3rem' }}><TrendingUp size={48} style={{ color: '#94a3b8', opacity: 0.5, marginBottom: '12px' }} /><h3 style={{ color: '#64748b' }}>No Performance Data</h3><p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Performance data appears once applications are submitted.</p></div>
          ) : (
            <>
              {/* Stats */}
              <div className="aa-stats-grid">
                <StatsCard title="Active Agents" value={agentPerformance.length} icon={Users} color="#3A4391" />
                <StatsCard title="Top Agent" value={agentPerformance[0]?.agency_name || '—'} icon={Award} color="#00CCA0" subtitle={`${agentPerformance[0]?.total_applications || 0} applications`} />
                <StatsCard title="Avg Success Rate" value={`${(agentPerformance.reduce((sum, a) => sum + a.success_rate, 0) / agentPerformance.length).toFixed(1)}%`} icon={TrendingUp} color="#f59e0b" />
                <StatsCard title="Total Enrollments" value={agentPerformance.reduce((sum, a) => sum + a.enrollments, 0)} icon={GraduationCap} color="#8b5cf6" />
              </div>

              {/* Top Agents Bar + Radar */}
              <div className="aa-chart-grid">
                <div className="aa-chart-card">
                  <h3><BarChart3 size={16} style={{ color: '#3A4391' }} /> Top Agents by Volume</h3>
                  <ResponsiveContainer width="100%" height={Math.max(260, agentPerformance.slice(0, 10).length * 35)}>
                    <BarChart data={agentPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis dataKey="agency_name" type="category" stroke="#475569" fontSize={10} width={120} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                      <Bar dataKey="total_applications" fill="#3A4391" name="Applications" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="acceptances" fill="#10b981" name="Accepted" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="enrollments" fill="#8b5cf6" name="Enrolled" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="aa-chart-card">
                  <h3><Activity size={16} style={{ color: '#00CCA0' }} /> Agent Comparison (Radar)</h3>
                  {radarData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>Need at least 1 agent for radar chart</p></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="agent" tick={{ fill: '#475569', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Volume" dataKey="volume" stroke="#3A4391" fill="#3A4391" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="Success" dataKey="success" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Success Rate Composed Chart */}
              <div className="aa-chart-card">
                <h3>Applications vs Success Rate</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={agentPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="agency_name" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={70} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar yAxisId="left" dataKey="total_applications" fill="#3A4391" name="Total Apps" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="success_rate" stroke="#00CCA0" strokeWidth={3} name="Success Rate %" dot={{ fill: '#00CCA0', r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Table */}
              <div className="aa-chart-card">
                <h3>Agent Performance Details</h3>
                <div className="aa-table-container"><table className="aa-table"><thead><tr><th>Agent / Agency</th><th>Apps</th><th>Review</th><th>Offers</th><th>Accepted</th><th>Enrolled</th><th>Rejected</th><th>Success</th></tr></thead><tbody>
                  {agentPerformance.map(a => (
                    <tr key={a.agent_id}>
                      <td><div className="aa-agent-info"><span className="aa-agent-name">{a.agent_name}</span><span className="aa-agency-name">{a.agency_name}</span></div></td>
                      <td><strong>{a.total_applications}</strong></td><td>{a.under_review}</td><td>{a.offers}</td><td style={{ color: '#10b981', fontWeight: 600 }}>{a.acceptances}</td><td style={{ color: '#8b5cf6', fontWeight: 600 }}>{a.enrollments}</td><td style={{ color: '#ef4444' }}>{a.rejections}</td>
                      <td><span className={`aa-badge ${a.success_rate >= 50 ? 'success' : a.success_rate >= 30 ? 'warning' : 'danger'}`}>{a.success_rate.toFixed(1)}%</span></td>
                    </tr>
                  ))}
                </tbody></table></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
