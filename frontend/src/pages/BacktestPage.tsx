import { useState } from 'react'
import { Play, Download, BarChart2, Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface BacktestConfig {
  strategyId: string
  startDate: string
  endDate: string
  initialCapital: number
  lotSize: number
  slippage: number
  commission: number
  marginType: 'SPAN' | 'FULL'
}

const mockResults = {
  totalTrades: 45,
  winningTrades: 28,
  losingTrades: 17,
  winRate: 62.2,
  totalPnl: 125430,
  totalPnlPercent: 25.1,
  maxDrawdown: -45200,
  maxDrawdownPercent: -9.1,
  sharpeRatio: 1.84,
  sortinoRatio: 2.45,
  calmarRatio: 2.76,
  profitFactor: 1.89,
  expectancy: 2787,
  avgWin: 6850,
  avgLoss: -4120,
  avgHoldingPeriod: 3.2,
  equityCurve: Array.from({ length: 45 }, (_, i) => ({
    date: new Date(Date.now() - (44 - i) * 86400000).toISOString().split('T')[0],
    equity: 500000 + i * 2500 + Math.sin(i * 0.5) * 15000,
  })),
  monthlyReturns: [
    { month: 'Jan 2024', return: 8.2 },
    { month: 'Feb 2024', return: 5.1 },
    { month: 'Mar 2024', return: -2.3 },
    { month: 'Apr 2024', return: 12.4 },
    { month: 'May 2024', return: 3.7 },
  ],
}

export function BacktestPage() {
  const [config, setConfig] = useState<BacktestConfig>({
    strategyId: '',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 500000,
    lotSize: 50,
    slippage: 0.05,
    commission: 20,
    marginType: 'SPAN',
  })
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config')

  const strategies = [
    { id: '1', name: 'NIFTY Iron Condor', type: 'Income' },
    { id: '2', name: 'BANKNIFTY Bull Call Spread', type: 'Directional' },
    { id: '3', name: 'FINNIFTY Short Strangle', type: 'Volatility' },
    { id: '4', name: 'NIFTY Long Straddle', type: 'Event' },
  ]

  const handleRunBacktest = async () => {
    if (!config.strategyId) return

    setIsRunning(true)
    setActiveTab('results')

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setResults(mockResults)
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Backtesting</h1>
          <p className="text-dark-500 mt-1">Test your strategies against historical data</p>
        </div>
      </div>

      {/* Config Panel */}
      <div className="card">
        <div className="p-4 border-b border-dark-200">
          <h3 className="font-semibold text-dark-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-600" />
            Backtest Configuration
          </h3>
        </div>
        <div className="p-4 space-y-6">
          {/* Strategy Selection */}
          <div>
            <label className="label">Strategy</label>
            <select
              value={config.strategyId}
              onChange={(e) => setConfig({ ...config, strategyId: e.target.value })}
              className="input"
              disabled={isRunning}
            >
              <option value="">Select a strategy</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  className="input pl-10"
                  disabled={isRunning}
                />
              </div>
            </div>
            <div>
              <label className="label">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                  className="input pl-10"
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Capital & Risk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Initial Capital (₹)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => setConfig({ ...config, initialCapital: parseInt(e.target.value) })}
                  className="input pl-10"
                  disabled={isRunning}
                  min="10000"
                />
              </div>
            </div>
            <div>
              <label className="label">Lot Size</label>
              <input
                type="number"
                value={config.lotSize}
                onChange={(e) => setConfig({ ...config, lotSize: parseInt(e.target.value) })}
                className="input"
                disabled={isRunning}
                min="1"
              />
            </div>
            <div>
              <label className="label">Margin Type</label>
              <select
                value={config.marginType}
                onChange={(e) => setConfig({ ...config, marginType: e.target.value as any })}
                className="input"
                disabled={isRunning}
              >
                <option value="SPAN">SPAN Margin</option>
                <option value="FULL">Full Margin</option>
              </select>
            </div>
          </div>

          {/* Execution Costs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Slippage (points)</label>
              <input
                type="number"
                step="0.01"
                value={config.slippage}
                onChange={(e) => setConfig({ ...config, slippage: parseFloat(e.target.value) })}
                className="input"
                disabled={isRunning}
                min="0"
              />
            </div>
            <div>
              <label className="label">Commission per Lot (₹)</label>
              <input
                type="number"
                value={config.commission}
                onChange={(e) => setConfig({ ...config, commission: parseInt(e.target.value) })}
                className="input"
                disabled={isRunning}
                min="0"
              />
            </div>
          </div>

          {/* Run Button */}
          <div className="flex gap-3 pt-4 border-t border-dark-200">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning || !config.strategyId}
              className="btn-primary gap-2 flex-1"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running...' : 'Run Backtest'}
            </button>
            <button
              className="btn-secondary"
              disabled={!results}
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ResultCard
              label="Total P&L"
              value={`₹${results.totalPnl.toLocaleString()}`}
              subValue={`${results.totalPnlPercent > 0 ? '+' : ''}${results.totalPnlPercent}%`}
              icon={TrendingUp}
              color={results.totalPnl >= 0 ? 'success' : 'danger'}
            />
            <ResultCard
              label="Win Rate"
              value={`${results.winRate}%`}
              subValue={`${results.winningTrades}/${results.totalTrades} trades`}
              icon={CheckCircle}
              color="primary"
            />
            <ResultCard
              label="Max Drawdown"
              value={`₹${Math.abs(results.maxDrawdown).toLocaleString()}`}
              subValue={`${results.maxDrawdownPercent}%`}
              icon={AlertCircle}
              color="danger"
            />
            <ResultCard
              label="Sharpe Ratio"
              value={results.sharpeRatio.toFixed(2)}
              subValue={`Sortino: ${results.sortinoRatio.toFixed(2)}`}
              icon={TrendingUp}
              color="purple"
            />
            <ResultCard
              label="Profit Factor"
              value={results.profitFactor.toFixed(2)}
              subValue={`Expectancy: ₹${results.expectancy.toLocaleString()}`}
              icon={TrendingUp}
              color="warning"
            />
          </div>

          {/* Equity Curve */}
          <div className="card">
            <div className="p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900">Equity Curve</h3>
            </div>
            <div className="p-4 h-[400px]">
              <EquityCurveChart data={results.equityCurve} />
            </div>
          </div>

          {/* Monthly Returns */}
          <div className="card">
            <div className="p-4 border-b border-dark-200">
              <h3 className="font-semibold text-dark-900">Monthly Returns</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {results.monthlyReturns.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium">{m.month}</td>
                      <td className="text-right">
                        <span className={clsx('font-mono font-semibold', m.return >= 0 ? 'text-success-600' : 'text-danger-600')}>
                          {m.return >= 0 ? '+' : ''}{m.return}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatGroup title="Trade Analysis" items={[
              { label: 'Total Trades', value: results.totalTrades },
              { label: 'Winning Trades', value: results.winningTrades, color: 'success' },
              { label: 'Losing Trades', value: results.losingTrades, color: 'danger' },
              { label: 'Avg Holding Period', value: `${results.avgHoldingPeriod} days` },
            ]} />
            <StatGroup title="Risk Metrics" items={[
              { label: 'Max Drawdown', value: `₹${Math.abs(results.maxDrawdown).toLocaleString()}`, color: 'danger' },
              { label: 'Max Drawdown %', value: `${Math.abs(results.maxDrawdownPercent)}%`, color: 'danger' },
              { label: 'Calmar Ratio', value: results.calmarRatio.toFixed(2) },
              { label: 'Avg Win', value: `₹${results.avgWin.toLocaleString()}`, color: 'success' },
              { label: 'Avg Loss', value: `₹${Math.abs(results.avgLoss).toLocaleString()}`, color: 'danger' },
            ]} />
            <StatGroup title="Performance" items={[
              { label: 'Total Return', value: `${results.totalPnlPercent}%`, color: results.totalPnlPercent >= 0 ? 'success' : 'danger' },
              { label: 'Sharpe Ratio', value: results.sharpeRatio.toFixed(2) },
              { label: 'Sortino Ratio', value: results.sortinoRatio.toFixed(2) },
              { label: 'Profit Factor', value: results.profitFactor.toFixed(2) },
              { label: 'Expectancy', value: `₹${results.expectancy.toLocaleString()}`, color: results.expectancy >= 0 ? 'success' : 'danger' },
            ]} />
          </div>
        </div>
      )}
    </div>
  )
}

function ResultCard({ label, value, subValue, icon: Icon, color }: { label: string; value: string; subValue: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700',
    success: 'bg-success-50 text-success-700',
    danger: 'bg-danger-50 text-danger-700',
    warning: 'bg-warning-50 text-warning-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-500">{label}</p>
          <p className="text-2xl font-bold text-dark-900 mt-1">{value}</p>
          <p className="text-sm text-dark-500 mt-1">{subValue}</p>
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function StatGroup({ title, items }: { title: string; items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="card p-4">
      <h4 className="font-medium text-dark-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-dark-600">{item.label}</span>
            <span className={clsx('font-mono font-semibold', item.color)}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EquityCurveChart({ data }: { data: { date: string; equity: number }[] }) {
  // Simple SVG-based equity curve
  const width = '100%'
  const height = 350
  const padding = 50

  const equityValues = data.map(d => d.equity)
  const minEquity = Math.min(...equityValues)
  const maxEquity = Math.max(...equityValues)
  const range = maxEquity - minEquity || 1

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (100 - 2 * padding) // percentage
    const y = height - padding - ((d.equity - minEquity) / range) * (height - 2 * padding)
    return `${x}% ${y}`
  }).join(' ')

  const initialEquity = data[0]?.equity || 0
  const finalEquity = data[data.length - 1]?.equity || 0
  const isProfitable = finalEquity >= initialEquity

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isProfitable ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isProfitable ? '#22c55e' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <g stroke="#e2e8f0" strokeWidth="0.5">
        {[0, 25, 50, 75, 100].map(p => (
          <line key={p} x1={`${p}%`} y1={padding} x2={`${p}%`} y2={height - padding} />
        ))}
        {[0, 25, 50, 75, 100].map(p => (
          <line key={p} x1={padding} y1={`${p}%`} x2={100 - padding} y2={`${p}%`} />
        ))}
      </g>

      {/* Area */}
      <path
        d={`M${padding} ${height - padding} L${points} L${100 - padding} ${height - padding} Z`}
        fill="url(#equityGradient)"
      />

      {/* Line */}
      <path
        d={`M${points}`}
        stroke={isProfitable ? '#22c55e' : '#ef4444'}
        strokeWidth="2"
        fill="none"
      />

      {/* Starting point */}
      <circle cx={padding} cy={height - padding - ((initialEquity - minEquity) / range) * (height - 2 * padding)} r="4" fill="#0ea5e9" />
    </svg>
  )
}