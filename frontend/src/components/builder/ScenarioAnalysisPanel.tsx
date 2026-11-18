import { useMemo } from 'react'
import { StrategyLeg } from '../../types'
import { clsx } from 'clsx'

interface ScenarioAnalysisPanelProps {
  legs: StrategyLeg[]
  currentSpot: number
  spotShiftPct: number
  onSpotShiftChange: (shift: number) => void
  ivShiftPct: number
  onIvShiftChange: (shift: number) => void
  daysElapsed: number
  onDaysElapsedChange: (days: number) => void
}

export function ScenarioAnalysisPanel({
  legs,
  currentSpot,
  spotShiftPct,
  onSpotShiftChange,
  ivShiftPct,
  onIvShiftChange,
  daysElapsed,
  onDaysElapsedChange,
}: ScenarioAnalysisPanelProps) {
  const scenarios = useMemo(() => {
    if (legs.length === 0 || !currentSpot) return []

    const spotShifts = [-10, -5, -2, 0, 2, 5, 10]
    const ivShifts = [-10, -5, 0, 5, 10]
    const dayShifts = [0, 1, 3, 7, 14]

    return { spotShifts, ivShifts, dayShifts }
  }, [legs.length, currentSpot])

  const payoffAtScenario = (spot: number, iv: number, days: number) => {
    if (legs.length === 0) return 0

    return legs.reduce((sum, leg) => {
      const flag = leg.optionType === 'CE' ? 'c' : 'p'
      const entryPrice = leg.entryPrice || estimatePremium(flag, currentSpot, leg.strike, 0.20, 30)
      const mult = leg.positionType === 'BUY' ? 1 : -1

      if (days <= 0) {
        const intrinsic = flag === 'c' ? Math.max(spot - leg.strike, 0) : Math.max(leg.strike - spot, 0)
        return sum + (intrinsic - entryPrice) * leg.quantity * mult
      }

      const t = days / 365
      const theoreticalPrice = blackScholesApprox(flag, spot, leg.strike, t, 0.07, iv)
      return sum + (theoreticalPrice - entryPrice) * leg.quantity * mult
    }, 0)
  }

  // Current scenario P&L
  const currentPnL = payoffAtScenario(
    currentSpot * (1 + spotShiftPct / 100),
    Math.max(0.01, 0.20 + ivShiftPct / 100),
    Math.max(0, 30 - daysElapsed)
  )

  return (
    <div className="space-y-4 p-4">
      {/* Scenario Controls */}
      <div className="card p-4 space-y-4">
        <h4 className="font-medium text-dark-900">Scenario Simulators</h4>

        {/* Spot Shift Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark-700">Spot Price Shift</span>
            <span className={clsx('font-mono text-lg', spotShiftPct > 0 ? 'text-success-600' : spotShiftPct < 0 ? 'text-danger-600' : 'text-primary-600')}>
              {spotShiftPct > 0 ? '+' : ''}{spotShiftPct}%
            </span>
          </div>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={spotShiftPct}
            onChange={(e) => onSpotShiftChange(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-200 rounded-lg appearance-none accent-primary-600"
          />
          <div className="flex justify-between text-xs text-dark-400 mt-1">
            <span>-20%</span>
            <span>Current: ₹{(currentSpot * (1 + spotShiftPct / 100)).toFixed(0)}</span>
            <span>+20%</span>
          </div>
        </div>

        {/* IV Shift Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark-700">Implied Volatility Shift</span>
            <span className={clsx('font-mono text-lg', ivShiftPct > 0 ? 'text-purple-600' : ivShiftPct < 0 ? 'text-pink-600' : 'text-primary-600')}>
              {ivShiftPct > 0 ? '+' : ''}{ivShiftPct}%
            </span>
          </div>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={ivShiftPct}
            onChange={(e) => onIvShiftChange(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-200 rounded-lg appearance-none accent-purple-600"
          />
          <div className="flex justify-between text-xs text-dark-400 mt-1">
            <span>-20%</span>
            <span>Base IV: ~20%</span>
            <span>+20%</span>
          </div>
        </div>

        {/* Time Decay Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark-700">Days Elapsed (Time Decay)</span>
            <span className="font-mono text-lg text-orange-600">{daysElapsed} days</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={daysElapsed}
            onChange={(e) => onDaysElapsedChange(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-200 rounded-lg appearance-none accent-orange-600"
          />
          <div className="flex justify-between text-xs text-dark-400 mt-1">
            <span>Today</span>
            <span>Days left: {Math.max(0, 30 - daysElapsed)}</span>
            <span>Expiry</span>
          </div>
        </div>

        {/* Quick Reset */}
        <div className="flex gap-2 pt-2 border-t border-dark-200">
          <button
            onClick={() => {
              onSpotShiftChange(0)
              onIvShiftChange(0)
              onDaysElapsedChange(0)
            }}
            className="btn-ghost text-sm"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Scenario Matrix */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-200 bg-dark-50">
          <h4 className="font-medium text-dark-900">P&L Matrix: Spot Shift vs IV Shift</h4>
          <p className="text-sm text-dark-500">Rows: IV Shift | Columns: Spot Shift | Current: {daysElapsed}d elapsed</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10">IV \ Spot</th>
                {scenarios.spotShifts.map((shift) => (
                  <th key={shift} className="text-center">
                    <span className={clsx('font-mono text-xs', shift > 0 ? 'text-success-600' : shift < 0 ? 'text-danger-600' : 'text-primary-600')}>
                      {shift > 0 ? '+' : ''}{shift}%
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.ivShifts.map((ivShift) => (
                <tr key={ivShift}>
                  <td className="sticky left-0 bg-white z-10 font-mono text-sm font-medium">
                    <span className={clsx(ivShift > 0 ? 'text-purple-600' : ivShift < 0 ? 'text-pink-600' : 'text-dark-900')}>
                      {ivShift > 0 ? '+' : ''}{ivShift}%
                    </span>
                  </td>
                  {scenarios.spotShifts.map((spotShift) => {
                    const spot = currentSpot * (1 + spotShift / 100)
                    const iv = Math.max(0.01, 0.20 + ivShift / 100)
                    const pnl = payoffAtScenario(spot, iv, Math.max(0, 30 - daysElapsed))
                    return (
                      <td key={spotShift} className="text-center">
                        <div className={clsx('font-mono text-sm px-2 py-1 rounded', pnl >= 0 ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700')}>
                          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Decay Analysis */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-200 bg-dark-50">
          <h4 className="font-medium text-dark-900">Time Decay Projection (Current Spot & IV)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Days Elapsed</th>
                <th>Days to Expiry</th>
                <th>Projected P&L</th>
                <th>Daily Theta</th>
                <th>Total Theta Burn</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.dayShifts.map((days) => {
                const spot = currentSpot * (1 + spotShiftPct / 100)
                const iv = Math.max(0.01, 0.20 + ivShiftPct / 100)
                const daysLeft = Math.max(0, 30 - days)
                const pnl = payoffAtScenario(spot, iv, daysLeft)

                // Estimate theta (simplified)
                const theta = legs.reduce((sum, leg) => {
                  if (!leg.greeks) return sum
                  return sum + (leg.greeks.theta || 0) * leg.quantity * (leg.positionType === 'BUY' ? 1 : -1)
                }, 0)

                const totalThetaBurn = theta * days

                return (
                  <tr key={days} className={days === daysElapsed ? 'bg-primary-50' : ''}>
                    <td className="font-mono">{days}</td>
                    <td className="font-mono">{daysLeft}</td>
                    <td className={clsx('font-mono font-medium', pnl >= 0 ? 'text-success-600' : 'text-danger-600')}>
                      {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={clsx('font-mono', theta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                      {theta >= 0 ? '+' : ''}{theta.toFixed(0)}/day
                    </td>
                    <td className={clsx('font-mono', totalThetaBurn >= 0 ? 'text-success-600' : 'text-danger-600')}>
                      {totalThetaBurn >= 0 ? '+' : ''}{totalThetaBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Levels */}
      <div className="card p-4">
        <h4 className="font-medium text-dark-900 mb-3">Key Levels at Current Scenario</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KeyLevel
            label="Current Spot"
            value={`₹${(currentSpot * (1 + spotShiftPct / 100)).toFixed(2)}`}
            color="primary"
          />
          <KeyLevel
            label="Scenario P&L"
            value={currentPnL >= 0 ? `+₹${currentPnL.toLocaleString()}` : `₹${currentPnL.toLocaleString()}`}
            color={currentPnL >= 0 ? 'success' : 'danger'}
          />
          <KeyLevel
            label="Effective IV"
            value={`${(0.20 + ivShiftPct / 100).toFixed(1)}%`}
            color="purple"
          />
          <KeyLevel
            label="Days to Expiry"
            value={`${Math.max(0, 30 - daysElapsed)} days`}
            color="orange"
          />
        </div>
      </div>
    </div>
  )
}

function KeyLevel({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    danger: 'bg-danger-50 text-danger-700 border-danger-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <div className={clsx('card p-3 text-center border', colors[color])}>
      <p className="text-xs text-dark-500 mb-1">{label}</p>
      <p className="font-mono font-semibold text-lg">{value}</p>
    </div>
  )
}

function estimatePremium(flag: 'c' | 'p', spot: number, strike: number, iv: number, days: number): number {
  if (days <= 0) {
    return flag === 'c' ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)
  }
  return blackScholesApprox(flag, spot, strike, days / 365, 0.07, iv)
}

function blackScholesApprox(flag: 'c' | 'p', S: number, K: number, t: number, r: number, sigma: number): number {
  if (t <= 0 || sigma <= 0) {
    return flag === 'c' ? Math.max(S - K, 0) : Math.max(K - S, 0)
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t))
  const d2 = d1 - sigma * Math.sqrt(t)

  const cdf = (x: number) => 0.5 * (1 + erf(x / Math.sqrt(2)))
  const erf = (x: number) => {
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
    const t = 1 / (1 + p * x)
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x))
    return sign * y
  }

  if (flag === 'c') {
    return S * cdf(d1) - K * Math.exp(-r * t) * cdf(d2)
  } else {
    return K * Math.exp(-r * t) * cdf(-d2) - S * cdf(-d1)
  }
}