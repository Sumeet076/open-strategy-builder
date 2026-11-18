import { Link } from 'react-router-dom'
import {
  GitBranch,
  BarChart2,
  FileText,
  Settings,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

const stats = [
  { label: 'Strategies Built', value: '24', change: '+12%', icon: GitBranch, color: 'primary' },
  { label: 'Backtests Run', value: '156', change: '+23%', icon: BarChart2, color: 'success' },
  { label: 'Paper Trades', value: '89', change: '+5%', icon: FileText, color: 'warning' },
  { label: 'Win Rate', value: '67%', change: '+2%', icon: Target, color: 'purple' },
]

const quickActions = [
  { label: 'New Strategy', desc: 'Build options strategy', icon: Plus, href: '/builder', color: 'primary' },
  { label: 'Run Backtest', desc: 'Test strategy performance', icon: BarChart2, href: '/backtest', color: 'success' },
  { label: 'View Templates', desc: 'Pre-built strategies', icon: FileText, href: '/builder', color: 'warning' },
  { label: 'Settings', desc: 'Configure preferences', icon: Settings, href: '/settings', color: 'neutral' },
]

const recentStrategies = [
  { name: 'NIFTY Iron Condor', type: 'Income', pnl: '+2.4%', date: '2 hours ago', status: 'paper' },
  { name: 'BANKNIFTY Bull Call Spread', type: 'Directional', pnl: '-0.8%', date: '1 day ago', status: 'paper' },
  { name: 'FINNIFTY Short Strangle', type: 'Volatility', pnl: '+5.1%', date: '3 days ago', status: 'live' },
  { name: 'NIFTY Long Straddle', type: 'Event', pnl: '-1.2%', date: '1 week ago', status: 'closed' },
]

const marketOverview = [
  { symbol: 'NIFTY 50', price: '22,150.35', change: '+125.45 (+0.57%)', trend: 'up' },
  { symbol: 'BANK NIFTY', price: '48,230.10', change: '-45.20 (-0.09%)', trend: 'down' },
  { symbol: 'FIN NIFTY', price: '21,080.75', change: '+85.30 (+0.41%)', trend: 'up' },
  { symbol: 'SENSEX', price: '73,140.20', change: '+210.50 (+0.29%)', trend: 'up' },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Dashboard</h1>
          <p className="text-dark-500 mt-1">Welcome back! Here's your trading overview.</p>
        </div>
        <Link to="/builder" className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Strategy
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Recent */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-600" />
                Quick Actions
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, i) => (
                  <Link
                    key={i}
                    to={action.href}
                    className={clsx(
                      'card-hover p-4 flex flex-col items-center gap-3 text-center',
                      'transition-all duration-200'
                    )}
                  >
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', `bg-${action.color}-100`)}>
                      <action.icon className={clsx('w-6 h-6', `text-${action.color}-600`)} />
                    </div>
                    <div>
                      <p className="font-medium text-dark-900">{action.label}</p>
                      <p className="text-sm text-dark-500">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Strategies */}
          <div className="card">
            <div className="flex items-center justify-between p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" />
                Recent Strategies
              </h3>
              <Link to="/builder" className="text-sm text-primary-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="divide-y divide-dark-200">
              {recentStrategies.map((strategy, i) => (
                <div key={i} className="p-4 hover:bg-dark-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', strategy.status === 'live' ? 'bg-danger-100' : 'bg-primary-100')}>
                        {strategy.status === 'live' ? (
                          <Shield className="w-5 h-5 text-danger-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-dark-900">{strategy.name}</p>
                        <p className="text-sm text-dark-500 flex items-center gap-2">
                          <span className={clsx('badge text-xs', strategy.status === 'live' ? 'badge-danger' : strategy.status === 'paper' ? 'badge-primary' : 'badge-neutral')}>
                            {strategy.type}
                          </span>
                          <span>{strategy.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={clsx('font-mono font-semibold', strategy.pnl.startsWith('+') ? 'text-success-600' : 'text-danger-600')}>
                        {strategy.pnl}
                      </p>
                      <p className="text-xs text-dark-500 capitalize">{strategy.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Market Overview */}
        <div className="space-y-6">
          <div className="card">
            <div className="p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Market Overview
              </h3>
            </div>
            <div className="divide-y divide-dark-200">
              {marketOverview.map((market, i) => (
                <div key={i} className="p-4 hover:bg-dark-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-dark-900">{market.symbol}</p>
                      <p className="text-sm text-dark-500">₹{market.price}</p>
                    </div>
                    <div className="text-right">
                      <p className={clsx('font-mono font-semibold', market.trend === 'up' ? 'text-success-600' : 'text-danger-600')}>
                        {market.change}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                System Status
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <StatusItem label="Market Data Feed" status="connected" detail="NSE, BSE, NFO - Real-time" />
              <StatusItem label="WebSocket Connection" status="connected" detail="Option chain streaming active" />
              <StatusItem label="API Latency" status="warning" detail="45ms avg - Within limits" />
              <StatusItem label="Paper Trading Engine" status="connected" detail="Ready for order simulation" />
              <StatusItem label="Backtesting Engine" status="connected" detail="Historical data available" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, change, icon: Icon, color }: { label: string; value: string; change: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-dark-100 text-dark-700 border-dark-200',
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-dark-500">{label}</p>
          <p className="text-3xl font-bold text-dark-900 mt-1">{value}</p>
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-dark-200">
        <span className={clsx('text-sm font-medium', change.startsWith('+') ? 'text-success-600' : 'text-danger-600')}>
          {change} vs last month
        </span>
      </div>
    </div>
  )
}

function StatusItem({ label, status, detail }: { label: string; status: 'connected' | 'warning' | 'disconnected'; detail: string }) {
  const statusConfig = {
    connected: { icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-100', label: 'Connected' },
    warning: { icon: AlertCircle, color: 'text-warning-600', bg: 'bg-warning-100', label: 'Warning' },
    disconnected: { icon: AlertCircle, color: 'text-danger-600', bg: 'bg-danger-100', label: 'Disconnected' },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-3">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
        <config.icon className={clsx('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-dark-900 truncate">{label}</p>
        <p className="text-sm text-dark-500 truncate">{detail}</p>
      </div>
      <span className={clsx('badge text-xs', config.color.replace('text-', 'bg-').replace('600', '100') + ' ' + config.color)}>
        {config.label}
      </span>
    </div>
  )
}