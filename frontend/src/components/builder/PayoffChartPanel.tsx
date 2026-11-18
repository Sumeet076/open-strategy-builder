import { useMemo, useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Zoom, Pan } from 'chartjs-plugin-zoom'
import { StrategyLeg } from '../../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  Zoom,
  Pan
)

interface PayoffChartPanelProps {
  legs: StrategyLeg[]
  currentSpot: number
  atmStrike: number
  spotShiftPct: number
  ivShiftPct: number
  daysElapsed: number
}

export function PayoffChartPanel({ legs, currentSpot, atmStrike, spotShiftPct, ivShiftPct, daysElapsed }: PayoffChartPanelProps) {
  const chartRef = useRef<ChartJS<'line'>>(null)

  const { data, breakevens, maxProfit, maxLoss, probabilityOfProfit } = useMemo(() => {
    if (legs.length === 0 || !currentSpot) {
      return { data: { labels: [], datasets: [] }, breakevens: [], maxProfit: 0, maxLoss: 0, probabilityOfProfit: 0 }
    }

    // Calculate payoff
    const spotMin = currentSpot * 0.85
    const spotMax = currentSpot * 1.15
    const steps = 100
    const spotRange = Array.from({ length: steps }, (_, i) => spotMin + (spotMax - spotMin) * i / (steps - 1))

    // Apply scenario shifts
    const shiftedSpot = currentSpot * (1 + spotShiftPct / 100)
    const shiftedIV = Math.max(0.01, 0.20 + ivShiftPct / 100) // base IV 20%
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30 - daysElapsed)
    const daysToExpiry = Math.max(0, (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    const labels = spotRange.map(s => s.toFixed(0))
    const datasets: any[] = []

    // Individual leg payoffs (dashed lines)
    legs.forEach((leg, index) => {
      const legPayoff = spotRange.map(spot => calculateLegPayoff(leg, spot, shiftedSpot, shiftedIV, daysToExpiry))
      datasets.push({
        label: `${leg.positionType} ${leg.optionType} ${leg.strike}`,
        data: legPayoff,
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      })
    })

    // Total payoff (solid line)
    const totalPayoff = spotRange.map((spot, i) =>
      legs.reduce((sum, leg) => sum + calculateLegPayoff(leg, spot, shiftedSpot, shiftedIV, daysToExpiry), 0)
    )

    datasets.push({
      label: 'Total P&L',
      data: totalPayoff,
      borderColor: '#0ea5e9',
      borderWidth: 3,
      fill: true,
      backgroundColor: (ctx: any) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400)
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)')
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
        return gradient
      },
      pointRadius: 0,
      tension: 0.1,
    })

    // Calculate breakevens
    const breakevens: number[] = []
    for (let i = 0; i < totalPayoff.length - 1; i++) {
      if (totalPayoff[i] === 0) breakevens.push(spotRange[i])
      else if (totalPayoff[i] * totalPayoff[i + 1] < 0) {
        const be = spotRange[i] - totalPayoff[i] * (spotRange[i + 1] - spotRange[i]) / (totalPayoff[i + 1] - totalPayoff[i])
        breakevens.push(be)
      }
    }

    const maxProfitVal = Math.max(...totalPayoff)
    const maxLossVal = Math.min(...totalPayoff)

    // Simple probability estimate
    const probProfit = totalPayoff.filter(p => p > 0).length / totalPayoff.length

    return {
      data: { labels, datasets },
      breakevens,
      maxProfit: maxProfitVal,
      maxLoss: maxLossVal,
      probabilityOfProfit: probProfit,
    }
  }, [legs, currentSpot, spotShiftPct, ivShiftPct, daysElapsed])

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 11, family: 'monospace' },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ₹${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Spot Price', font: { size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          maxTicksLimit: 8,
          callback: (value) => `₹${parseFloat(value as string).toLocaleString()}`,
          font: { size: 10 },
        },
      },
      y: {
        title: { display: true, text: 'P&L (₹)', font: { size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          callback: (value) => `₹${(value as number).toLocaleString()}`,
          font: { size: 10 },
        },
      },
    },
    elements: {
      line: { tension: 0.1 },
    },
  }), [])

  // Add annotation lines for current spot, breakevens, ATM
  const plugins = useMemo(() => ({
    annotation: {
      annotations: {
        currentSpot: {
          type: 'line' as const,
          mode: 'x' as const,
          scaleID: 'x',
          value: currentSpot,
          borderColor: '#0ea5e9',
          borderWidth: 2,
          borderDash: [4, 4],
          label: {
            enabled: true,
            content: 'Current Spot',
            position: 'start',
            backgroundColor: '#0ea5e9',
            color: 'white',
            font: { size: 10 },
          },
        },
        zeroLine: {
          type: 'line' as const,
          mode: 'y' as const,
          scaleID: 'y',
          value: 0,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderWidth: 1,
        },
        ...breakevens.reduce((acc, be, i) => ({
          ...acc,
          [`breakeven${i}`]: {
            type: 'line' as const,
            mode: 'x' as const,
            scaleID: 'x',
            value: be,
            borderColor: '#22c55e',
            borderWidth: 1,
            borderDash: [2, 2],
            label: {
              enabled: true,
              content: `BE: ₹${be.toFixed(0)}`,
              position: 'center',
              backgroundColor: '#22c55e',
              color: 'white',
              font: { size: 10 },
            },
          },
        }), {}),
      },
    },
  }), [currentSpot, breakevens])

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-3 bg-dark-50 rounded-lg">
        <div className="flex items-center gap-6">
          <MetricItem
            label="Max Profit"
            value={maxProfit >= 0 ? `+₹${maxProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₹${maxProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            color="success"
          />
          <MetricItem
            label="Max Loss"
            value={`₹${maxLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            color="danger"
          />
          <MetricItem
            label="Prob. Profit"
            value={`${(probabilityOfProfit * 100).toFixed(1)}%`}
            color="primary"
          />
          {breakevens.length > 0 && (
            <MetricItem
              label="Breakevens"
              value={breakevens.map(b => `₹${b.toFixed(0)}`).join(', ')}
              color="neutral"
            />
          )}
        </div>

        {/* Scenario Indicators */}
        <div className="flex items-center gap-3 text-xs text-dark-500">
          {spotShiftPct !== 0 && (
            <span className={clsx('px-2 py-0.5 rounded', spotShiftPct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              Spot {spotShiftPct > 0 ? '+' : ''}{spotShiftPct}%
            </span>
          )}
          {ivShiftPct !== 0 && (
            <span className={clsx('px-2 py-0.5 rounded', ivShiftPct > 0 ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700')}>
              IV {ivShiftPct > 0 ? '+' : ''}{ivShiftPct}%
            </span>
          )}
          {daysElapsed > 0 && (
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">
              {daysElapsed}d elapsed
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[400px] relative">
        <Line
          ref={chartRef}
          data={data.data}
          options={options}
          plugins={plugins}
        />
      </div>

      {/* Legend / Key Points */}
      <div className="mt-4 pt-4 border-t border-dark-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-primary-500" />
            <span className="font-medium">Total P&L</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 border-t border-dashed border-dark-400" />
            <span className="text-dark-500">Individual Legs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-dark-500">Current Spot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-dark-500">Breakevens</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    success: 'text-success-600',
    danger: 'text-danger-600',
    primary: 'text-primary-600',
    neutral: 'text-dark-600',
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-xs text-dark-500">{label}</span>
      <span className={clsx('font-mono font-semibold text-sm', colors[color])}>{value}</span>
    </div>
  )
}

function calculateLegPayoff(
  leg: StrategyLeg,
  spot: number,
  currentSpot: number,
  iv: number,
  daysToExpiry: number
): number {
  const flag = leg.optionType === 'CE' ? 'c' : 'p'
  const strike = leg.strike
  const entryPrice = leg.entryPrice || estimatePremium(flag, currentSpot, strike, iv, daysToExpiry)
  const mult = leg.positionType === 'BUY' ? 1 : -1

  if (daysToExpiry <= 0) {
    // At expiry - intrinsic value
    const intrinsic = flag === 'c' ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)
    return (intrinsic - entryPrice) * leg.quantity * mult
  }

  // Use Black-Scholes approximation for theoretical value
  const t = daysToExpiry / 365
  const theoreticalPrice = blackScholesApprox(flag, spot, strike, t, 0.07, iv)
  return (theoreticalPrice - entryPrice) * leg.quantity * mult
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
    // Approximation
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

