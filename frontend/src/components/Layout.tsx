import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Sidebar, Header } from './ui'
import { useSidebarStore } from '../stores/sidebarStore'

export function Layout() {
  const { isCollapsed, toggleSidebar } = useSidebarStore()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/builder', label: 'Strategy Builder', icon: 'GitBranch' },
    { path: '/backtest', label: 'Backtesting', icon: 'BarChart2' },
    { path: '/settings', label: 'Settings', icon: 'Settings' },
  ]

  return (
    <div className="flex h-screen bg-dark-50">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        navItems={navItems}
        currentPath={location.pathname}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}