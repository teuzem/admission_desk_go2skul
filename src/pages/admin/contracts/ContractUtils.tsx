// Contract Management — Shared UI Utilities
import React from 'react'
import { Loader2 } from 'lucide-react'
import { STATUS_CONFIG, CATEGORY_CONFIG, COMPLIANCE_CONFIG, ContractStatus, ContractCategory, ComplianceStatus } from './ContractTypes'

// ─── Spinner ───
export const Spinner = ({ size = 16 }: { size?: number }) => (
  <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
)

// ─── Status Badge ───
export const StatusBadge = ({ status }: { status: ContractStatus | string }) => {
  const cfg = STATUS_CONFIG[status as ContractStatus] ?? { label: status, color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Category Badge ───
export const CategoryBadge = ({ category }: { category: ContractCategory | string | null }) => {
  if (!category) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>
  const cfg = CATEGORY_CONFIG[category as ContractCategory] ?? { label: category, color: '#94a3b8', short: '?' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.short} · {cfg.label}
    </span>
  )
}

// ─── Compliance Badge ───
export const ComplianceBadge = ({ status }: { status: ComplianceStatus | string }) => {
  const cfg = COMPLIANCE_CONFIG[status as ComplianceStatus] ?? { label: status, color: '#94a3b8', bg: '#f8fafc' }
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Agent Avatar ───
export const AgentAvatar = ({ agent, size = 40 }: {
  agent: { avatar_url?: string | null; first_name?: string | null; email?: string }; size?: number
}) => {
  const [err, setErr] = React.useState(false)
  const initial = (agent.first_name?.[0] || agent.email?.[0] || '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: !agent.avatar_url || err ? 'linear-gradient(135deg,#3A4391,#00CCA0)' : 'transparent',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.38,
    }}>
      {agent.avatar_url && !err
        ? <img src={agent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
        : initial}
    </div>
  )
}

// ─── Section Title ───
export const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
    <div style={{ color: '#3A4391' }}>{icon}</div>
    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{children}</h2>
  </div>
)

// ─── Stat Card ───
export const StatCard = ({ icon, value, label, color, bg, onClick }: {
  icon: React.ReactNode; value: number; label: string; color: string; bg: string; onClick?: () => void
}) => (
  <div
    onClick={onClick}
    style={{
      background: 'white', borderRadius: 14, padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', gap: '1rem', cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.25s', borderLeft: `4px solid ${color}`,
    }}
    className="cm-stat-card"
  >
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  </div>
)
