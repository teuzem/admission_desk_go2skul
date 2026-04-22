import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Globe, ExternalLink } from 'lucide-react'

export default function AdminFooter() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ 
      padding: '2rem', 
      background: '#f8fafc', 
      borderTop: '1px solid #e2e8f0',
      marginTop: '4rem'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/admission-desk-logo.png" 
              alt="AdmissionDesk" 
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/admin" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
            <Link to="/admin/profile" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Profile</Link>
            <a href="mailto:support@admissiondesk.com" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Support</a>
            <Link to="/dashboard" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Main Site <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        <div style={{ 
          height: '1px', 
          background: '#e2e8f0', 
          width: '100%' 
        }}></div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            © {year} Admission Desk Portal. All rights reserved. Built for enterprise excellence.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Shield size={14} />
                <span>Enterprise Secure</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Globe size={14} />
                <span>Global Infrastructure</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
