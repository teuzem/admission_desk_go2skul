import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { usePageRefetch } from '../../../lib/useRealtimeRecovery'
import toast from 'react-hot-toast'
import {
  BookOpen, Building2, BarChart3, Clock, Plus, Filter, Loader2, ArrowLeft, LogOut
} from 'lucide-react'
import '../AdminPages.css'
import ProgramListTable from './ProgramListTable'
import ProgramAnalytics from './ProgramAnalytics'
import MySubmissions from './MySubmissions'
import UniversityListTable from './UniversityListTable'

type Tab = 'overview' | 'universities' | 'programs' | 'submissions'

export default function ProgramManagerDashboard() {
  const navigate = useNavigate()
  const { user, signOut, isProgramManager, isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  const [universities, setUniversities] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [uniRes, progRes, subRes] = await Promise.all([
        supabase.from('universities').select('*, university_campuses(*)').eq('is_active', true).order('name'),
        supabase.from('programs').select('*, universities(name, country, is_multisite)').eq('is_active', true).order('name'),
        supabase.from('pending_submissions').select('*, profiles:submitted_by(first_name, last_name, email)').order('created_at', { ascending: false })
      ])
      
      setUniversities(uniRes.data || [])
      setPrograms(progRes.data || [])
      setSubmissions(subRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.error('Failed to load program data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()

    const channel = supabase.channel('program-manager-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_submissions' }, fetchAll)
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn('[ProgramManager] channel error:', status)
        }
      })

    // Re-sync on visibility change (tab focus return)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchAll])

  // Submissions filtered by current user if they are just program_manager
  // The plan said "My Submissions", but since admin can also view this, maybe show all for admin?
  // Let's filter to current user's submissions unless admin? The implementation plan said:
  // "My Submissions" -> "eq('submitted_by', user?.id || '')" for submitted items.
  const mySubmissions = useMemo(() => {
    if (isAdmin) return submissions // Admin sees everything
    return submissions.filter(s => s.submitted_by === user?.id)
  }, [submissions, isAdmin, user?.id])

  if (loading && universities.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={40} className="spinning" style={{ margin: '0 auto 1rem', color: '#10b981' }} />
          <h2>Loading Program Manager Dashboard...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      
      {/* ══════════ TOP NAVBAR ══════════ */}
      <header style={{ height: '70px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate((isAdmin || isProgramManager) ? '/dashboard' : '/dashboard')} className="btn btn-outline btn-sm" style={{ padding: '8px', border: 'none', background: '#f1f5f9' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>Program Management</h1>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Universities & Courses Directory</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="admin-tabs" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
            <button className={`admin-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === 'overview' ? 'white' : 'transparent', boxShadow: tab === 'overview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: tab === 'overview' ? '#10b981' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <BarChart3 size={16} /> Overview
            </button>
            <button className={`admin-tab ${tab === 'universities' ? 'active' : ''}`} onClick={() => setTab('universities')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === 'universities' ? 'white' : 'transparent', boxShadow: tab === 'universities' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: tab === 'universities' ? '#10b981' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Building2 size={16} /> Institutions
            </button>
            <button className={`admin-tab ${tab === 'programs' ? 'active' : ''}`} onClick={() => setTab('programs')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === 'programs' ? 'white' : 'transparent', boxShadow: tab === 'programs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: tab === 'programs' ? '#10b981' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <BookOpen size={16} /> Programmes
            </button>
            <button className={`admin-tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: tab === 'submissions' ? 'white' : 'transparent', boxShadow: tab === 'submissions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: tab === 'submissions' ? '#10b981' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Clock size={16} /> 
              My Submissions
              {mySubmissions.filter(s => s.status === 'pending').length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '99px', fontWeight: 800 }}>{mySubmissions.filter(s => s.status === 'pending').length}</span>
              )}
            </button>
          </div>
          
          <button onClick={signOut} className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          {tab === 'overview' && (
            <ProgramAnalytics 
              universities={universities} 
              programs={programs} 
            />
          )}

          {tab === 'universities' && (
            <UniversityListTable 
              universities={universities} 
              refreshData={fetchAll}
            />
          )}

          {tab === 'programs' && (
            <ProgramListTable 
              programs={programs} 
              universities={universities}
              refreshData={fetchAll}
            />
          )}

          {tab === 'submissions' && (
            <MySubmissions 
              submissions={mySubmissions} 
              refreshData={fetchAll}
            />
          )}

        </div>
      </main>
    </div>
  )
}
