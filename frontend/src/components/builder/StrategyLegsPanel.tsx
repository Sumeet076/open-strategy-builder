import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Plus, Minus, Copy, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { StrategyLeg, OptionType, PositionType } from '../../types'

interface StrategyLegsPanelProps {
  legs: StrategyLeg[]
  onUpdateLeg: (id: string, updates: Partial<StrategyLeg>) => void
  onRemoveLeg: (id: string) => void
  atmStrike: number
  strikeInterval: number
  lotSize: number
}

export function StrategyLegsPanel({ legs, onUpdateLeg, onRemoveLeg, atmStrike, strikeInterval, lotSize }: StrategyLegsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDuplicate = (leg: StrategyLeg) => {
    const newLeg = {
      ...leg,
      id: `leg_${Date.now()}`,
      strike: leg.strike + strikeInterval,
    }
    onUpdateLeg(leg.id, { ...leg, strike: leg.strike + strikeInterval })
    // Actually we need to add a new leg - this should be handled by the store
  }

  if (legs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-dark-500 p-8">
        <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mb-4">
          <Plus className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-dark-900 mb-1">No legs added</h3>
        <p className="text-sm text-center max-w-xs">
          Select options from the Option Chain tab or use Templates to build your strategy
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-3 space-y-3">
      {legs.map((leg, index) => (
        <StrategyLegCard
          key={leg.id}
          leg={leg}
          index={index}
          isExpanded={expandedIds.has(leg.id)}
          onToggleExpand={() => toggleExpand(leg.id)}
          onUpdate={(updates) => onUpdateLeg(leg.id, updates)}
          onRemove={() => onRemoveLeg(leg.id)}
          onDuplicate={() => handleDuplicate(leg)}
          atmStrike={atmStrike}
          strikeInterval={strikeInterval}
          lotSize={lotSize}
        />
      ))}

      {/* Summary */}
      <LegsSummary legs={legs} />
    </div>
  )
}

function StrategyLegCard({
  leg,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onDuplicate,
  atmStrike,
  strikeInterval,
  lotSize,
}: {
  leg: StrategyLeg
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<StrategyLeg>) => void
  onRemove: () => void
  onDuplicate: () => void
  atmStrike: number
  strikeInterval: number
  lotSize: number
}) {
  const [localStrike, setLocalStrike] = useState(leg.strike)
  const [localLots, setLocalLots] = useState(leg.lots)

  const moneyness = getMoneyness(leg.optionType, leg.strike, atmStrike)
  const premium = leg.entryPrice || leg.greeks?.delta || 0

  return (
    <div className="card overflow-hidden animate-in">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 border-b border-dark-100">
        <span className="w-6 text-center text-dark-400 font-mono text-sm">{index + 1}</span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={clsx('badge px-2 py-1', leg.positionType === 'BUY' ? 'badge-success' : 'badge-danger')}>
            {leg.positionType}
          </span>
          <span className={clsx('badge px-2 py-1', leg.optionType === 'CE' ? 'badge-primary' : 'badge-warning')}>
            {leg.optionType}
          </span>
          <span className="font-mono font-semibold text-dark-900">
            {leg.strike.toLocaleString()}
          </span>
          <span className={clsx('badge badge-neutral text-xs', moneyness)}>
            {moneyness}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded hover:bg-dark-100 text-dark-500 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded hover:bg-dark-100 text-dark-500 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-danger-50 text-danger-500 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-t border-dark-100 bg-dark-50">
          <div className="grid grid-cols-2 gap-3">
            {/* Lots */}
            <div>
              <label className="label">Lots</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newLots = Math.max(1, localLots - 1)
                    setLocalLots(newLots)
                    onUpdate({ lots: newLots, quantity: newLots * lotSize })
                  }}
                  className="w-8 h-8 rounded border border-dark-300 flex items-center justify-center hover:bg-dark-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={localLots}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1)
                    setLocalLots(val)
                    onUpdate({ lots: val, quantity: val * lotSize })
                  }}
                  className="input w-20 text-center font-mono"
                  min="1"
                />
                <button
                  onClick={() => {
                    const newLots = localLots + 1
                    setLocalLots(newLots)
                    onUpdate({ lots: newLots, quantity: newLots * lotSize })
                  }}
                  className="w-8 h-8 rounded border border-dark-300 flex items-center justify-center hover:bg-dark-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm text-dark-500">× {lotSize} = {localLots * lotSize} qty</span>
              </div>
            </div>

            {/* Strike Selection */}
            <div>
              <label className="label">Strike</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localStrike}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || atmStrike
                    setLocalStrike(val)
                    onUpdate({ strike: val })
                  }}
                  className="input w-24 font-mono"
                  step={strikeInterval}
                />
                <select
                  value={leg.strike === atmStrike ? 'ATM' : leg.strike > atmStrike ? 'OTM' : 'ITM'}
                  onChange={(e) => {
                    let newStrike = atmStrike
                    if (e.target.value === 'OTM') {
                      newStrike = leg.optionType === 'CE' ? atmStrike + strikeInterval * 2 : atmStrike - strikeInterval * 2
                    } else if (e.target.value === 'ITM') {
                      newStrike = leg.optionType === 'CE' ? atmStrike - strikeInterval * 2 : atmStrike + strikeInterval * 2
                    }
                    setLocalStrike(newStrike)
                    onUpdate({ strike: newStrike })
                  }}
                  className="input w-24 text-xs"
                >
                  <option value="ATM">ATM</option>
                  <option value="OTM">OTM</option>
                  <option value="ITM">ITM</option>
                </select>
                <div className="flex items-center gap-1 text-xs text-dark-500">
                  <ChevronDown className="w-3 h-3" />
                  <span>{strikeInterval} pts</span>
                </div>
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <label className="label">Entry Price</label>
              <input
                type="number"
                value={leg.entryPrice || ''}
                onChange={(e) => onUpdate({ entryPrice: parseFloat(e.target.value) || undefined })}
                placeholder="Market"
                className="input font-mono"
                step="0.05"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="label">Stop Loss</label>
              <div className="flex items-center gap-2">
                <select
                  value={leg.stopLoss?.type || 'PERCENTAGE'}
                  onChange={(e) => onUpdate({ stopLoss: { ...leg.stopLoss, type: e.target.value as any } })}
                  className="input w-28 text-xs"
                >
                  <option value="PERCENTAGE">%</option>
                  <option value="POINTS">Points</option>
                  <option value="PREMIUM">Premium</option>
                </select>
                <input
                  type="number"
                  value={leg.stopLoss?.value || ''}
                  onChange={(e) => onUpdate({ stopLoss: { ...leg.stopLoss, value: parseFloat(e.target.value) || 0 } })}
                  className="input flex-1"
                  step="0.1"
                  placeholder="Value"
                />
              </div>
            </div>

            {/* Target */}
            <div>
              <label className="label">Target</label>
              <div className="flex items-center gap-2">
                <select
                  value={leg.target?.type || 'PERCENTAGE'}
                  onChange={(e) => onUpdate({ target: { ...leg.target, type: e.target.value as any } })}
                  className="input w-28 text-xs"
                >
                  <option value="PERCENTAGE">%</option>
                  <option value="POINTS">Points</option>
                  <option value="PREMIUM">Premium</option>
                </select>
                <input
                  type="number"
                  value={leg.target?.value || ''}
                  onChange={(e) => onUpdate({ target: { ...leg.target, value: parseFloat(e.target.value) || 0 } })}
                  className="input flex-1"
                  step="0.1"
                  placeholder="Value"
                />
              </div>
            </div>
          </div>

          {/* Greeks Display */}
          {leg.greeks && (
            <div className="pt-2 border-t border-dark-200">
              <h4 className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-2">Greeks (per lot)</h4>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <GreekBadge label="Δ" value={leg.greeks.delta} color="blue" />
                <GreekBadge label="Γ" value={leg.greeks.gamma} color="purple" decimals={6} />
                <GreekBadge label="Θ" value={leg.greeks.theta} color="orange" />
                <GreekBadge label="ν" value={leg.greeks.vega} color="pink" />
                <GreekBadge label="ρ" value={leg.greeks.rho} color="gray" />
              </div>
            </div>
          )}

          {/* Warnings */}
          {leg.positionType === 'SELL' && !leg.stopLoss && (
            <div className="flex items-center gap-2 p-2 bg-warning-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning-600" />
              <span className="text-xs text-warning-700">Short position without stop loss - unlimited risk</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GreekBadge({ label, value, color, decimals = 4 }: { label: string; value: number; color: string; decimals?: number }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
    gray: 'bg-gray-50 text-gray-700',
  }

  return (
    <div className={clsx('px-2 py-1 rounded text-center', colors[color])}>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
      <div className="font-mono font-medium">{value.toFixed(decimals)}</div>
    </div>
  )
}

function LegsSummary({ legs }: { legs: StrategyLeg[] }) {
  const totals = legs.reduce(
    (acc, leg) => {
      const mult = leg.positionType === 'BUY' ? 1 : -1
      const qty = leg.quantity
      acc.netQty += mult * qty
      acc.longQty += leg.positionType === 'BUY' ? qty : 0
      acc.shortQty += leg.positionType === 'SELL' ? qty : 0
      acc.legs++
      return acc
    },
    { legs: 0, netQty: 0, longQty: 0, shortQty: 0 }
  )

  return (
    <div className="card p-3 border-t-2 border-primary-500">
      <h4 className="font-medium text-dark-900 mb-2">Strategy Summary</h4>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-dark-900">{totals.legs}</p>
          <p className="text-xs text-dark-500">Total Legs</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-success-600">{totals.longQty.toLocaleString()}</p>
          <p className="text-xs text-dark-500">Long Qty</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-danger-600">{totals.shortQty.toLocaleString()}</p>
          <p className="text-xs text-dark-500">Short Qty</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-primary-600">{totals.netQty.toLocaleString()}</p>
          <p className="text-xs text-dark-500">Net Qty</p>
        </div>
      </div>
    </div>
  )
}

function getMoneyness(optionType: OptionType, strike: number, atmStrike: number): string {
  if (strike === atmStrike) return 'ATM'
  if (optionType === 'CE') {
    return strike < atmStrike ? 'ITM' : 'OTM'
  }
  return strike > atmStrike ? 'ITM' : 'OTM'
}