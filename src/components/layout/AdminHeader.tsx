import React from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search, Globe, ChevronDown } from 'lucide-react'
import AdminProfileDropdown from './AdminProfileDropdown'
import './DashboardLayout.css'

export default function AdminHeader() {
  return (
    <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img 
            src="/admission-desk-logo.png" 
            alt="AdmissionDesk" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }} 
          />
        </Link>
        
        <div className="header-search" style={{ position: 'relative', display: 'none' }}>
           {/* Search bar could go here for larger screens */}
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '99px', cursor: 'pointer' }}>
           <Globe size={16} className="text-slate-500" />
           <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>EN</span>
           <ChevronDown size={14} className="text-slate-400" />
        </div>

        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }}></div>

        <AdminProfileDropdown />
      </div>
    </header>
  )
}
