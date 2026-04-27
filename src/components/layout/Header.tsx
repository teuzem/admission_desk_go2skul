import { Menu } from 'lucide-react'
import ProfileDropdown from './ProfileDropdown'
import './DashboardLayout.css'

interface HeaderProps {
  toggleSidebar: () => void
}

export default function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>

      <div className="header-right">
        <ProfileDropdown />
      </div>
    </header>
  )
}
