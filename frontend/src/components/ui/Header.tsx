import { Menu, Bell, Moon, Sun, User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notifications = [
    { id: 1, message: 'Strategy "Iron Condor" saved successfully', time: '2 min ago', read: false },
    { id: 2, message: 'Backtest completed for "Bull Call Spread"', time: '15 min ago', read: false },
    { id: 3, message: 'Market data connection restored', time: '1 hour ago', read: true },
  ]

  return (
    <header className="h-16 bg-white border-b border-dark-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-dark-600 hover:bg-dark-100"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:flex items-center gap-2 bg-dark-100 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-dark-700">NIFTY</span>
          <span className="text-sm text-dark-500 px-2">|</span>
          <span className="text-sm font-semibold text-dark-900">22,150.35</span>
          <span className="text-sm font-medium text-success-600">+125.45 (+0.57%)</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg text-dark-600 hover:bg-dark-100 transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-dark-600 hover:bg-dark-100 transition-colors"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-dark-200 shadow-lg animate-in z-50">
              <div className="px-4 py-3 border-b border-dark-200 flex items-center justify-between">
                <h3 className="font-semibold text-dark-900">Notifications</h3>
                <button className="text-sm text-primary-600 hover:underline">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    className={clsx(
                      'w-full px-4 py-3 text-left hover:bg-dark-50 transition-colors',
                      !n.read && 'bg-primary-50/50'
                    )}
                  >
                    <p className="text-sm text-dark-900">{n.message}</p>
                    <p className="text-xs text-dark-400 mt-0.5">{n.time}</p>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-dark-200">
                <button className="w-full text-sm text-primary-600 hover:underline">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-100 transition-colors"
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <span className="hidden md:block text-sm font-medium text-dark-700">Trader</span>
            <ChevronDown className="w-4 h-4 text-dark-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-dark-200 shadow-lg animate-in z-50">
              <div className="px-4 py-3 border-b border-dark-200">
                <p className="font-medium text-dark-900">Trader</p>
                <p className="text-sm text-dark-500">trader@example.com</p>
              </div>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-50">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-50">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <hr className="my-1 border-dark-200" />
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}