import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend
} from 'recharts'
import { Building2, BookOpen, MapPin, GraduationCap } from 'lucide-react'

interface ProgramAnalyticsProps {
  universities: any[]
  programs: any[]
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e']

export default function ProgramAnalytics({ universities, programs }: ProgramAnalyticsProps) {
  
  // ─── Analytics Calculations ───
  
  const stats = useMemo(() => {
    return {
      totalUnis: universities.length,
      totalPrograms: programs.length,
      countries: new Set(universities.map(u => u.country).filter(Boolean)).size,
      levels: new Set(programs.map(p => p.level).filter(Boolean)).size,
    }
  }, [universities, programs])

  const unisByCountry = useMemo(() => {
    const counts = universities.reduce((acc, uni) => {
      if (!uni.country) return acc
      acc[uni.country] = (acc[uni.country] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [universities])

  const programsByLevel = useMemo(() => {
    const counts = programs.reduce((acc, prog) => {
      const lvl = prog.level || 'Unknown'
      acc[lvl] = (acc[lvl] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
  }, [programs])

  const programsByUni = useMemo(() => {
    const counts = programs.reduce((acc, prog) => {
      const name = prog.universities?.name || 'Unknown'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [programs])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ═══════════ STATS CARDS ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        {[
          { icon: <Building2 size={18} />, value: stats.totalUnis, label: 'Institutions', color: '#10b981', bg: '#f0fdf4', border: '#bcf0da' },
          { icon: <BookOpen size={18} />, value: stats.totalPrograms, label: 'Programmes', color: '#3A4391', bg: '#eff6ff', border: '#dbeafe' },
          { icon: <MapPin size={18} />, value: stats.countries, label: 'Countries', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
          { icon: <GraduationCap size={18} />, value: stats.levels, label: 'Study Levels', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map((s, i) => (
          <div key={i} className="card-panel" style={{ 
            padding: '0.65rem 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            borderLeft: `4px solid ${s.color}`,
            height: 'fit-content'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: s.bg, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: s.color,
              flexShrink: 0 
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.025em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Institutions By Country */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Top Countries (Institutions)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={unisByCountry} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                  {unisByCountry.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" />
                  ))}
                </Pie>
                <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Programmes By Level */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Programmes by Study Level</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={programsByLevel} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorLevel)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Institutions by Programmes Count */}
      <div className="card-panel">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Top Institutions by Programmes Count</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programsByUni} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
