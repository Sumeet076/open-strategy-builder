import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  GitBranch,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: keyof typeof icons
}

const icons = {
  LayoutDashboard,
  GitBranch,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  navItems: NavItem[]
  currentPath: string
}

export function Sidebar({ isCollapsed, onToggle, navItems, currentPath }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'flex flex-col bg-white border-r border-dark-200 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center h-16 px-4 border-b border-dark-200', isCollapsed && 'justify-center')}>
        {!isCollapsed && (
          <NavLink to="/builder" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-dark-900 text-lg">StrategyBuilder</span>
          </NavLink>
        )}
        {isCollapsed && (
          <NavLink to="/builder" className="p-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
          </NavLink>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto" aria-label="Main navigation">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
            const Icon = icons[item.icon]

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-dark-600 hover:bg-dark-100 hover:text-dark-900',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-dark-200">
        <button
          onClick={onToggle}
          className={clsx(
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-dark-600 hover:bg-dark-100 transition-colors',
            isCollapsed && 'justify-center'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}