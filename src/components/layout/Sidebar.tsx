import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Home, 
  FileText, 
  BookOpen, 
  User, 
  Users, 
  HelpCircle, 
  X,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './DashboardLayout.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { signOut, isSuperAgent } = useAuth()

  // Desktop always shows, mobile shows if isOpen
  const navItems = [
    { icon: <Home size={20} />, label: t('dashboard.nav.home'), path: '/dashboard' },
    { icon: <FileText size={20} />, label: t('dashboard.nav.applications'), path: '/dashboard/applications' },
    { icon: <BookOpen size={20} />, label: t('dashboard.nav.courses'), path: '/dashboard/courses' },
    
    { header: t('dashboard.nav.settings') },
    
    { icon: <User size={20} />, label: t('dashboard.nav.profile'), path: '/dashboard/profile' },
    ...(isSuperAgent ? [
      { icon: <Users size={20} />, label: t('dashboard.nav.team'), path: '/dashboard/team' }
    ] : []),
    { icon: <HelpCircle size={20} />, label: t('dashboard.nav.support'), path: '/dashboard/support' },
  ]

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <Link to="/dashboard" className="sidebar-logo" onClick={onClose}>
          <img
            src="/admission-desk-logo.png"
            alt="Admission Desk — International University Admissions Portal"
            className="sidebar-logo-img"
            width="160"
            height="100"
          />
        </Link>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          if (item.header) {
            return <div key={`header-${index}`} className="sidebar-nav-header">{item.header}</div>
          }

          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path!))
          
          return (
            <Link
              key={item.path}
              to={item.path!}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={() => signOut()}>
          <LogOut size={20} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </div>
  )
}
