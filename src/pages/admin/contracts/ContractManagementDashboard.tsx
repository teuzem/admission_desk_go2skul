// Contract Management — Main Dashboard
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import {
  LayoutDashboard, Users, ShieldCheck, AlertTriangle, Clock,
  CheckCircle, XCircle, Ban, Activity, BarChart3, LogOut
} from 'lucide-react'
import AdminHeader from '../../../components/layout/AdminHeader'
import AdminFooter from '../../../components/layout/AdminFooter'
import { AgentWithContract, STATUS_CONFIG } from './ContractTypes'
import { StatCard } from './ContractUtils'
import AgentContractList from './AgentContractList'
import AgentDetailPanel from './AgentDetailPanel'
import AgentCategoryManagement from '../admissions/AgentCategoryManagement'
import './ContractManagement.css'

type Tab = 'overview' | 'all_agents' | 'pending' | 'approved' | 'flagged' | 'categories'

export default function ContractManagementDashboard() {
  const navigate = useNavigate()
  const { user, profile, signOut, isContractManager, isSuperAdmin, isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [agents, setAgents] = useState<AgentWithContract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentWithContract | null>(null)

  // Guard: only contract managers or admins
  useEffect(() => {
    if (!isContractManager && !isSuperAdmin && !isAdmin) {
      navigate('/admin', { replace: true })
    }
  }, [isContractManager, isSuperAdmin, isAdmin, navigate])

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agent')
      .order('created_at', { ascending: false })

    if (!profiles) { setLoading(false); return }

    const agentIds = profiles.map(p => p.id)
    const { data: contracts } = await supabase
      .from('agent_contracts' as any)
      .select('*')
      .in('agent_id', agentIds) as any

    const contractMap = new Map((contracts || []).map((c: any) => [c.agent_id, c]))

    setAgents(profiles.map(p => ({ ...p, contract: (contractMap.get(p.id) as any) ?? null })))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAgents()
    const ch = supabase.channel('contract-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAgents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_contracts' as any }, fetchAgents)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAgents])

  // ─── Stats ───
  const stats = {
    total: agents.length,
    pending: agents.filter(a => !a.contract || a.contract.status === 'pending_review').length,
    under_verification: agents.filter(a => a.contract?.status === 'under_verification').length,
    approved: agents.filter(a => a.contract?.status === 'approved').length,
    suspended: agents.filter(a => a.contract?.status === 'suspended').length,
    revoked: agents.filter(a => a.contract?.status === 'revoked' || a.contract?.status === 'blocked').length,
    rejected: agents.filter(a => a.contract?.status === 'rejected').length,
    flagged: agents.filter(a => a.contract?.has_policy_violation).length,
  }

  const TABS: [Tab, string, React.ReactNode, number?][] = [
    ['overview',    'Overview',       <LayoutDashboard size={15} />],
    ['all_agents',  `All Agents (${stats.total})`, <Users size={15} />],
    ['pending',     `Pending (${stats.pending})`,  <Clock size={15} />, stats.pending],
    ['approved',    'Approved',       <CheckCircle size={15} />],
    ['flagged',     'Flagged',        <AlertTriangle size={15} />, stats.flagged],
    ['categories',  'Categories',     <BarChart3 size={15} />],
  ]

  const agentsForTab = (): AgentWithContract[] => {
    switch (tab) {
      case 'pending':    return agents.filter(a => !a.contract || a.contract.status === 'pending_review')
      case 'approved':   return agents.filter(a => a.contract?.status === 'approved')
      case 'flagged':    return agents.filter(a => a.contract?.has_policy_violation)
      default:           return agents
    }
  }

  return (
    <div className="cm-dashboard">
      <AdminHeader />

      {/* Page Title */}
      <div style={{ padding: '2rem 2.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3A4391,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Contract Management</h1>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Agent onboarding, verification, compliance and lifecycle management
            </p>
          </div>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cm-tabs">
        {TABS.map(([key, label, icon, badge]) => (
          <button key={key} className={`cm-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {icon} {label}
            {typeof badge === 'number' && badge > 0 && <span className="cm-tab-badge">{badge}</span>}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="cm-body">

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === 'overview' && (
          <div>
            {/* Stats */}
            <div className="cm-stats-grid" style={{ marginBottom: '2rem' }}>
              <StatCard icon={<Users size={20} />}        value={stats.total}              label="Total Agents"         color="#3A4391"  bg="#eef2ff"  onClick={() => setTab('all_agents')} />
              <StatCard icon={<Clock size={20} />}        value={stats.pending}            label="Pending Review"       color="#f59e0b"  bg="#fffbeb"  onClick={() => setTab('pending')} />
              <StatCard icon={<Activity size={20} />}     value={stats.under_verification} label="Under Verification"   color="#3b82f6"  bg="#eff6ff" />
              <StatCard icon={<CheckCircle size={20} />}  value={stats.approved}           label="Approved"             color="#10b981"  bg="#f0fdf4"  onClick={() => setTab('approved')} />
              <StatCard icon={<Ban size={20} />}          value={stats.suspended}          label="Suspended"            color="#f97316"  bg="#fff7ed" />
              <StatCard icon={<XCircle size={20} />}      value={stats.revoked}            label="Revoked / Blocked"    color="#ef4444"  bg="#fef2f2" />
              <StatCard icon={<XCircle size={20} />}      value={stats.rejected}           label="Rejected"             color="#64748b"  bg="#f8fafc" />
              <StatCard icon={<AlertTriangle size={20} />}value={stats.flagged}            label="Policy Violations"    color="#dc2626"  bg="#fef2f2"  onClick={() => setTab('flagged')} />
            </div>

            {/* Status Breakdown */}
            <div className="cm-card">
              <div className="cm-card-header">
                <h2 className="cm-card-title"><BarChart3 size={16} /> Contract Status Breakdown</h2>
              </div>
              <div className="cm-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(Object.entries(STATUS_CONFIG) as [string, any][]).map(([key, cfg]) => {
                    const count = agents.filter(a => (a.contract?.status ?? 'pending_review') === key).length
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 100, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>{cfg.label}</div>
                        <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ width: 32, textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: cfg.color, flexShrink: 0 }}>{count}</div>
                        <div style={{ width: 36, textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="cm-card">
              <div className="cm-card-header">
                <h2 className="cm-card-title"><Users size={16} /> Recent Registrations</h2>
                <button className="cm-btn cm-btn-outline cm-btn-sm" onClick={() => setTab('all_agents')}>View All</button>
              </div>
              <div>
                {agents.slice(0, 8).map(agent => {
                  const status = agent.contract?.status ?? 'pending_review'
                  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
                  return (
                    <div key={agent.id} onClick={() => setSelectedAgent(agent)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 1.5rem',
                      borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${cfg?.color ?? '#94a3b8'}15`, border: `2px solid ${cfg?.color ?? '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg?.color ?? '#94a3b8', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                        {(agent.first_name?.[0] || agent.email[0]).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{agent.first_name} {agent.last_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{agent.agency_name || agent.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ background: cfg?.bg, color: cfg?.color, border: `1px solid ${cfg?.border}`, padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700 }}>{cfg?.label}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ AGENT LIST TABS ═══ */}
        {(tab === 'all_agents' || tab === 'pending' || tab === 'approved' || tab === 'flagged') && (
          <AgentContractList
            agents={agentsForTab()}
            loading={loading}
            onSelect={setSelectedAgent}
            onRefresh={fetchAgents}
          />
        )}

        {/* ═══ CATEGORIES TAB ═══ */}
        {tab === 'categories' && (
          <AgentCategoryManagement
            userId={user?.id || ''}
            userRole={profile?.role || ''}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </div>

      <AdminFooter />

      {/* Agent Detail Side Panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          currentUserId={user?.id || ''}
          onClose={() => setSelectedAgent(null)}
          onRefresh={() => {
            fetchAgents()
            // Re-select updated agent
            setSelectedAgent(prev => prev ? { ...prev } : null)
          }}
        />
      )}
    </div>
  )
}
