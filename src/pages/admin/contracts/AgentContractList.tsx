// Contract Management — Agent List Tab
import { useState, useMemo } from 'react'
import { Search, Filter, RefreshCw, Eye, ShieldCheck, AlertTriangle } from 'lucide-react'
import { AgentWithContract, ContractStatus, ContractCategory, STATUS_CONFIG, CATEGORY_CONFIG } from './ContractTypes'
import { StatusBadge, CategoryBadge, AgentAvatar } from './ContractUtils'

interface Props {
  agents: AgentWithContract[]
  loading: boolean
  onSelect: (agent: AgentWithContract) => void
  onRefresh: () => void
}

export default function AgentContractList({ agents, loading, onSelect, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let list = agents
    if (statusFilter !== 'all') list = list.filter(a => (a.contract?.status ?? 'pending_review') === statusFilter)
    if (categoryFilter !== 'all') list = list.filter(a => (a.contract?.category ?? 'pending_classification') === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.email?.toLowerCase().includes(q) ||
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.agency_name?.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q)
      )
    }
    return list
  }, [agents, search, statusFilter, categoryFilter])

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search agent, agency, email, country..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.84rem', background: 'white', cursor: 'pointer', outline: 'none', minWidth: 160 }}>
          <option value="all">All Statuses</option>
          {(Object.entries(STATUS_CONFIG) as [ContractStatus, any][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.84rem', background: 'white', cursor: 'pointer', outline: 'none', minWidth: 180 }}>
          <option value="all">All Categories</option>
          {(Object.entries(CATEGORY_CONFIG) as [ContractCategory, any][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={onRefresh} style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Count */}
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>
        Showing {filtered.length} of {agents.length} agents
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>Loading agents...</div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Filter size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: '#64748b' }}>No agents match your filters</div>
          <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Try adjusting your search or filters</div>
        </div>
      )}

      {/* Agent Rows */}
      {!loading && filtered.map(agent => {
        const status = agent.contract?.status ?? 'pending_review'
        const cfg = STATUS_CONFIG[status as ContractStatus]
        return (
          <div key={agent.id} onClick={() => onSelect(agent)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.25rem',
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 8,
            cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${cfg?.color ?? '#94a3b8'}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(58,67,145,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <AgentAvatar agent={agent} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{agent.first_name} {agent.last_name}</span>
                {agent.contract?.has_policy_violation && <AlertTriangle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />}
              </div>
              {agent.agency_name && <div style={{ fontSize: '0.78rem', color: '#3A4391', fontWeight: 600 }}>{agent.agency_name}</div>}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{agent.email}{agent.country ? ` · ${agent.country}` : ''}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <StatusBadge status={status} />
              <CategoryBadge category={agent.contract?.category ?? 'pending_classification'} />
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                {new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <Eye size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
