import { Search, ChevronDown, Save, Play, Plus, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { ExchangeType } from '../../types'

interface StrategyBuilderHeaderProps {
  selectedExchange: ExchangeType
  onExchangeChange: (exchange: ExchangeType) => void
  selectedUnderlying: string
  onUnderlyingChange: (underlying: string) => void
  selectedExpiry: string
  onExpiryChange: (expiry: string) => void
  expiries: string[]
  currentSpot: number
  atmStrike: number
  onTemplatesClick: () => void
  onSaveClick: () => void
  onExecuteClick: () => void
  isLoading: boolean
}

const EXCHANGES: { value: ExchangeType; label: string }[] = [
  { value: 'NSE', label: 'NSE' },
  { value: 'BSE', label: 'BSE' },
  { value: 'NFO', label: 'NFO' },
  { value: 'BFO', label: 'BFO' },
  { value: 'MCX', label: 'MCX' },
]

const UNDERLYINGS = [
  { value: 'NIFTY', label: 'NIFTY 50' },
  { value: 'BANKNIFTY', label: 'BANK NIFTY' },
  { value: 'FINNIFTY', label: 'FIN NIFTY' },
  { value: 'MIDCPNIFTY', label: 'MIDCP NIFTY' },
  { value: 'SENSEX', label: 'SENSEX' },
  { value: 'BANKEX', label: 'BANKEX' },
]

export function StrategyBuilderHeader({
  selectedExchange,
  onExchangeChange,
  selectedUnderlying,
  onUnderlyingChange,
  selectedExpiry,
  onExpiryChange,
  expiries,
  currentSpot,
  atmStrike,
  onTemplatesClick,
  onSaveClick,
  onExecuteClick,
  isLoading,
}: StrategyBuilderHeaderProps) {
  return (
    <div className="bg-white border-b border-dark-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Exchange Selector */}
        <div className="relative">
          <label className="sr-only">Exchange</label>
          <select
            value={selectedExchange}
            onChange={(e) => onExchangeChange(e.target.value as ExchangeType)}
            className="input w-32 md:w-40 pr-8 appearance-none bg-no-repeat bg-right"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E")', backgroundSize: '16px' }}
          >
            {EXCHANGES.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label}
              </option>
            ))}
          </select>
        </div>

        {/* Underlying Selector */}
        <div className="relative">
          <label className="sr-only">Underlying</label>
          <select
            value={selectedUnderlying}
            onChange={(e) => onUnderlyingChange(e.target.value)}
            className="input w-40 md:w-48 pr-8 appearance-none bg-no-repeat bg-right"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E")', backgroundSize: '16px' }}
          >
            {UNDERLYINGS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry Selector */}
        <div className="relative">
          <label className="sr-only">Expiry</label>
          <select
            value={selectedExpiry}
            onChange={(e) => onExpiryChange(e.target.value)}
            className="input w-40 md:w-48 pr-8 appearance-none bg-no-repeat bg-right"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E")', backgroundSize: '16px' }}
            disabled={expiries.length === 0}
          >
            {expiries.map((expiry) => (
              <option key={expiry} value={expiry}>
                {formatExpiry(expiry)}
              </option>
            ))}
            {expiries.length === 0 && <option value="">Select underlying first</option>}
          </select>
        </div>

        {/* Spot & ATM Info */}
        <div className="flex-1 hidden md:flex items-center justify-end gap-6">
          <div className="text-right">
            <p className="text-xs text-dark-500">Spot</p>
            <p className="font-semibold text-dark-900">{currentSpot.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark-500">ATM Strike</p>
            <p className="font-semibold text-primary-600">{atmStrike.toLocaleString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTemplatesClick}
            className="btn-secondary gap-2"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            onClick={onSaveClick}
            className="btn-secondary gap-2"
            disabled={isLoading}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={onExecuteClick}
            className="btn-primary gap-2"
            disabled={isLoading}
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Execute</span>
          </button>

          {isLoading && <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />}
        </div>
      </div>

      {/* Mobile Spot/ATM */}
      <div className="md:hidden mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 p-3 bg-dark-50 rounded-lg">
          <div>
            <p className="text-xs text-dark-500">Spot</p>
            <p className="font-semibold text-dark-900">{currentSpot.toLocaleString()}</p>
          </div>
          <div className="border-l border-dark-200 pl-4">
            <p className="text-xs text-dark-500">ATM</p>
            <p className="font-semibold text-primary-600">{atmStrike.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatExpiry(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}