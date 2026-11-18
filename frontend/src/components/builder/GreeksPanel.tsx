import { clsx } from 'clsx'
import { StrategyLeg, Greeks } from '../../types'

interface GreeksPanelProps {
  legs: StrategyLeg[]
  portfolioGreeks: Greeks | null
  currentSpot: number
}

export function GreeksPanel({ legs, portfolioGreeks, currentSpot }: GreeksPanelProps) {
  if (legs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500">
        <p>Add legs to see Greeks analysis</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Portfolio Greeks Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'delta', label: 'Delta (Δ)', color: 'blue', desc: 'Directional risk' },
          { key: 'gamma', label: 'Gamma (Γ)', color: 'purple', desc: 'Delta acceleration' },
          { key: 'theta', label: 'Theta (Θ)', color: 'orange', desc: 'Time decay/day' },
          { key: 'vega', label: 'Vega (ν)', color: 'pink', desc: 'Volatility risk' },
          { key: 'rho', label: 'Rho (ρ)', color: 'gray', desc: 'Interest rate risk' },
        ].map((g) => (
          <PortfolioGreekCard
            key={g.key}
            label={g.label}
            value={portfolioGreeks?.[g.key as keyof Greeks] || 0}
            color={g.color}
            description={g.desc}
          />
        ))}
      </div>

      {/* Net Position Greeks */}
      {portfolioGreeks && (
        <div className="card p-4 border-l-4 border-primary-500">
          <h4 className="font-medium text-dark-900 mb-3">Net Position Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-dark-500">Net Delta</p>
              <p className={clsx('font-mono font-semibold', portfolioGreeks.delta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                {portfolioGreeks.delta >= 0 ? '+' : ''}{portfolioGreeks.delta.toFixed(2)}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {portfolioGreeks.delta > 0 ? 'Bullish bias' : portfolioGreeks.delta < 0 ? 'Bearish bias' : 'Neutral'}
              </p>
            </div>
            <div>
              <p className="text-dark-500">Net Theta</p>
              <p className={clsx('font-mono font-semibold', portfolioGreeks.theta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                {portfolioGreeks.theta >= 0 ? '+' : ''}{portfolioGreeks.theta.toFixed(2)}/day
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {portfolioGreeks.theta > 0 ? 'Time decay helps' : 'Time decay hurts'}
              </p>
            </div>
            <div>
              <p className="text-dark-500">Net Vega</p>
              <p className={clsx('font-mono font-semibold', portfolioGreeks.vega >= 0 ? 'text-success-600' : 'text-danger-600')}>
                {portfolioGreeks.vega >= 0 ? '+' : ''}{portfolioGreeks.vega.toFixed(2)}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {portfolioGreeks.vega > 0 ? 'Long volatility' : 'Short volatility'}
              </p>
            </div>
            <div>
              <p className="text-dark-500">Net Gamma</p>
              <p className="font-mono font-semibold text-dark-900">{portfolioGreeks.gamma.toFixed(4)}</p>
              <p className="text-xs text-dark-500 mt-1">
                {portfolioGreeks.gamma > 0 ? 'Delta increases with spot' : 'Delta decreases with spot'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leg-by-leg Greeks Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-200 bg-dark-50">
          <h4 className="font-medium text-dark-900">Leg Greeks Breakdown</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-20">Leg</th>
                <th className="w-24">Type</th>
                <th>Delta</th>
                <th>Gamma</th>
                <th>Theta</th>
                <th>Vega</th>
                <th>Rho</th>
                <th className="w-28">IV</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg) => (
                <LegGreeksRow key={leg.id} leg={leg} />
              ))}
              {portfolioGreeks && (
                <tr className="bg-dark-50 font-semibold border-t-2 border-dark-200">
                  <td className="text-dark-500">Total</td>
                  <td>—</td>
                  <td className={clsx('font-mono', portfolioGreeks.delta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                    {portfolioGreeks.delta >= 0 ? '+' : ''}{portfolioGreeks.delta.toFixed(2)}
                  </td>
                  <td className="font-mono">{portfolioGreeks.gamma.toFixed(4)}</td>
                  <td className={clsx('font-mono', portfolioGreeks.theta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                    {portfolioGreeks.theta >= 0 ? '+' : ''}{portfolioGreeks.theta.toFixed(2)}
                  </td>
                  <td className={clsx('font-mono', portfolioGreeks.vega >= 0 ? 'text-success-600' : 'text-danger-600')}>
                    {portfolioGreeks.vega >= 0 ? '+' : ''}{portfolioGreeks.vega.toFixed(2)}
                  </td>
                  <td className="font-mono">{portfolioGreeks.rho.toFixed(2)}</td>
                  <td>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RiskMetric
          label="Delta per ₹1 Move"
          value={portfolioGreeks ? `₹${(portfolioGreeks.delta * currentSpot / 100).toFixed(0)}` : '—'}
          desc="P&L change for 1% spot move"
        />
        <RiskMetric
          label="Theta Burn/Day"
          value={portfolioGreeks ? `₹${portfolioGreeks.theta.toFixed(0)}` : '—'}
          desc="Daily time decay cost/income"
        />
        <RiskMetric
          label="Vega Exposure"
          value={portfolioGreeks ? `₹${portfolioGreeks.vega.toFixed(0)}` : '—'}
          desc="P&L change per 1% IV move"
        />
        <RiskMetric
          label="Gamma Risk"
          value={portfolioGreeks ? portfolioGreeks.gamma.toFixed(4) : '—'}
          desc="Delta change per ₹1 spot move"
        />
      </div>
    </div>
  )
}

function PortfolioGreekCard({
  label,
  value,
  color,
  description,
}: {
  label: string
  value: number
  color: string
  description: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className={clsx('card p-4 border', colors[color])}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="text-xs text-dark-400">{description}</span>
      </div>
      <p className="font-mono font-bold text-2xl">{value >= 0 ? '+' : ''}{value.toFixed(value < 0.01 ? 4 : 2)}</p>
    </div>
  )
}

function LegGreeksRow({ leg }: { leg: StrategyLeg }) {
  const greeks = leg.greeks
  if (!greeks) return null

  const mult = leg.positionType === 'BUY' ? 1 : -1
  const positionColor = leg.positionType === 'BUY' ? 'text-success-600' : 'text-danger-600'

  return (
    <tr className="hover:bg-dark-50">
      <td className="font-mono text-sm text-dark-900">{leg.strike.toLocaleString()}</td>
      <td>
        <span className={clsx('badge px-2 py-0.5 text-xs', leg.optionType === 'CE' ? 'badge-primary' : 'badge-warning')}>
          {leg.positionType} {leg.optionType}
        </span>
      </td>
      <td className={clsx('font-mono', greeks.delta * mult >= 0 ? 'text-success-600' : 'text-danger-600')}>
        {greeks.delta * mult >= 0 ? '+' : ''}{(greeks.delta * mult).toFixed(2)}
      </td>
      <td className="font-mono text-dark-900">{(greeks.gamma * mult).toFixed(4)}</td>
      <td className={clsx('font-mono', greeks.theta * mult >= 0 ? 'text-success-600' : 'text-danger-600')}>
        {greeks.theta * mult >= 0 ? '+' : ''}{(greeks.theta * mult).toFixed(2)}
      </td>
      <td className={clsx('font-mono', greeks.vega * mult >= 0 ? 'text-success-600' : 'text-danger-600')}>
        {greeks.vega * mult >= 0 ? '+' : ''}{(greeks.vega * mult).toFixed(2)}
      </td>
      <td className="font-mono text-dark-900">{(greeks.rho * mult).toFixed(2)}</td>
      <td className="font-mono text-dark-500">
        {leg.greeks && 'iv' in leg.greeks ? (leg.greeks as any).iv?.toFixed(1) + '%' : '—'}
      </td>
    </tr>
  )
}

function RiskMetric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-dark-500 mb-1">{label}</p>
      <p className="font-mono font-semibold text-dark-900">{value}</p>
      <p className="text-xs text-dark-400 mt-1">{desc}</p>
    </div>
  )
}