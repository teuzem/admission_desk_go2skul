import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import SystemAlertBanner from './SystemAlertBanner'
import './DashboardLayout.css'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="dashboard-layout">
      <SystemAlertBanner />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="dashboard-main">
        {/* Top Header */}
        <Header toggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <div className="dashboard-content-scroll">
          <div className="dashboard-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
