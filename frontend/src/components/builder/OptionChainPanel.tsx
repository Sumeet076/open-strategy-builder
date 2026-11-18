import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { OptionChainResponse, OptionStrike, StrategyLeg, OptionType, PositionType } from '../../types'

interface OptionChainPanelProps {
  chain: OptionChainResponse | null
  atmStrike: number
  currentSpot: number
  onAddLeg: (leg: Omit<StrategyLeg, 'id'>) => void
  isLoading: boolean
}

const COLUMNS = [
  { key: 'ce_oi', label: 'OI', side: 'ce' as const },
  { key: 'ce_oi_change', label: 'Chg', side: 'ce' as const },
  { key: 'ce_volume', label: 'Vol', side: 'ce' as const },
  { key: 'ce_iv', label: 'IV', side: 'ce' as const },
  { key: 'ce_gamma', label: 'Γ', side: 'ce' as const },
  { key: 'ce_theta', label: 'Θ', side: 'ce' as const },
  { key: 'ce_vega', label: 'ν', side: 'ce' as const },
  { key: 'ce_ltp', label: 'LTP', side: 'ce' as const },
  { key: 'ce_change', label: 'Chg', side: 'ce' as const },
  { key: 'ce_bid_ask', label: 'Bid/Ask', side: 'ce' as const },
  { key: 'strike', label: 'Strike', side: 'center' as const },
  { key: 'pe_bid_ask', label: 'Bid/Ask', side: 'pe' as const },
  { key: 'pe_change', label: 'Chg', side: 'pe' as const },
  { key: 'pe_ltp', label: 'LTP', side: 'pe' as const },
  { key: 'pe_vega', label: 'ν', side: 'pe' as const },
  { key: 'pe_theta', label: 'Θ', side: 'pe' as const },
  { key: 'pe_gamma', label: 'Γ', side: 'pe' as const },
  { key: 'pe_iv', label: 'IV', side: 'pe' as const },
  { key: 'pe_volume', label: 'Vol', side: 'pe' as const },
  { key: 'pe_oi_change', label: 'Chg', side: 'pe' as const },
  { key: 'pe_oi', label: 'OI', side: 'pe' as const },
]

export function OptionChainPanel({ chain, atmStrike, currentSpot, onAddLeg, isLoading }: OptionChainPanelProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact')
  const [sortColumn, setSortColumn] = useState<string>('strike')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const strikes = useMemo(() => {
    if (!chain?.chain) return []

    let data = [...chain.chain]

    if (sortColumn !== 'strike') {
      data.sort((a, b) => {
        const aVal = getStrikeValue(a, sortColumn)
        const bVal = getStrikeValue(b, sortColumn)
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      })
    }

    return data
  }, [chain, sortColumn, sortDirection])

  function getStrikeValue(strike: OptionStrike, column: string): number {
    const side = column.startsWith('ce_') ? 'ce' : column.startsWith('pe_') ? 'pe' : 'center'
    const key = column.replace(/^(ce_|pe_)/, '')

    if (side === 'center') return strike.strike

    const option = side === 'ce' ? strike.ce : strike.pe
    if (!option) return 0

    switch (key) {
      case 'oi': return option.oi
      case 'oi_change': return option.oiChange
      case 'volume': return option.volume
      case 'iv': return option.impliedVolatility || 0
      case 'gamma': return option.greeks?.gamma || 0
      case 'theta': return option.greeks?.theta || 0
      case 'vega': return option.greeks?.vega || 0
      case 'ltp': return option.ltp
      case 'change': return option.ltp - option.prevClose
      case 'bid_ask': return option.bid
      default: return 0
    }
  }

  function handleAddLeg(strike: OptionStrike, optionType: OptionType, positionType: PositionType) {
    const option = optionType === 'CE' ? strike.ce : strike.pe
    if (!option) return

    onAddLeg({
      underlying: chain!.underlying,
      exchange: chain!.underlyingExchange as any,
      expiryDate: chain!.expiryDate,
      strike: strike.strike,
      optionType,
      positionType,
      lots: 1,
      quantity: option.lotSize,
      entryType: 'MARKET',
      lotSize: option.lotSize,
      tickSize: option.tickSize,
      greeks: option.greeks ? {
        delta: option.greeks.delta,
        gamma: option.greeks.gamma,
        theta: option.greeks.theta,
        vega: option.greeks.vega,
        rho: option.greeks.rho,
      } : undefined,
    })
  }

  if (isLoading && !chain) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!chain?.chain?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500">
        No option chain data available
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-dark-200 bg-dark-50 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('compact')}
            className={clsx('px-2 py-1 text-xs rounded', viewMode === 'compact' ? 'bg-primary-100 text-primary-700' : 'text-dark-500 hover:bg-dark-100')}
          >
            Compact
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={clsx('px-2 py-1 text-xs rounded', viewMode === 'full' ? 'bg-primary-100 text-primary-700' : 'text-dark-500 hover:bg-dark-100')}
          >
            Full
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-dark-500">
          <span>PCR: {chain.metrics?.pcr?.toFixed(2)}</span>
          <span>Max Pain: {chain.metrics?.maxPain?.toLocaleString()}</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="sticky top-10 z-10 bg-white border-b border-dark-200">
        <div className="grid grid-cols-[50px_repeat(10,minmax(0,1fr))_40px_repeat(10,minmax(0,1fr))] gap-1 px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={clsx(
                'flex items-center justify-center gap-1 cursor-pointer select-none',
                col.side === 'ce' && 'bg-green-50',
                col.side === 'pe' && 'bg-red-50',
                col.side === 'center' && 'bg-primary-50'
              )}
              onClick={() => {
                setSortColumn(col.key)
                setSortDirection(sortColumn === col.key && sortDirection === 'asc' ? 'desc' : 'asc')
              }}
            >
              <span>{col.label}</span>
              {sortColumn === col.key && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </div>
          ))}
        </div>
      </div>

      {/* Strikes */}
      <div className="divide-y divide-dark-100">
        {strikes.map((strike, index) => (
          <OptionChainRow
            key={`${strike.strike}-${index}`}
            strike={strike}
            index={index}
            atmStrike={atmStrike}
            currentSpot={currentSpot}
            viewMode={viewMode}
            onAddLeg={handleAddLeg}
          />
        ))}
      </div>
    </div>
  )
}

function OptionChainRow({
  strike,
  atmStrike,
  currentSpot,
  viewMode,
  onAddLeg,
}: {
  strike: OptionStrike
  index: number
  atmStrike: number
  currentSpot: number
  viewMode: 'compact' | 'full'
  onAddLeg: (strike: OptionStrike, optionType: 'CE' | 'PE', positionType: 'BUY' | 'SELL') => void
}) {
  const isATM = strike.strike === atmStrike
  const isITM_CE = strike.ce && strike.strike < currentSpot
  const isITM_PE = strike.pe && strike.strike > currentSpot

  const formatNumber = (num: number | undefined, decimals = 0): string => {
    if (num === undefined || num === null) return '—'
    if (Math.abs(num) >= 100000) return (num / 100000).toFixed(1) + 'L'
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toFixed(decimals)
  }

  const formatChange = (current: number, prev: number): { value: string; isPositive: boolean; isNegative: boolean } => {
    const change = current - prev
    const isPositive = change > 0
    const isNegative = change < 0
    return {
      value: `${isPositive ? '+' : ''}${change.toFixed(2)}`,
      isPositive,
      isNegative,
    }
  }

  const ceChange = strike.ce ? formatChange(strike.ce.ltp, strike.ce.prevClose) : { value: '—', isPositive: false, isNegative: false }
  const peChange = strike.pe ? formatChange(strike.pe.ltp, strike.pe.prevClose) : { value: '—', isPositive: false, isNegative: false }

  return (
    <div
      className={clsx(
        'grid grid-cols-[50px_repeat(10,minmax(0,1fr))_40px_repeat(10,minmax(0,1fr))] gap-1 px-2 py-1.5',
        'transition-colors hover:bg-dark-50',
        isATM && 'bg-primary-50',
        index % 2 === 0 && 'bg-dark-50/30'
      )}
    >
      {/* CE Side */}
      <OptionCell
        option={strike.ce}
        side="ce"
        isATM={isATM}
        isITM={isITM_CE}
        viewMode={viewMode}
        formatNumber={formatNumber}
        change={ceChange}
        onBuy={() => strike.ce && onAddLeg(strike, 'CE', 'BUY')}
        onSell={() => strike.ce && onAddLeg(strike, 'CE', 'SELL')}
      />

      {/* Strike */}
      <div className="flex items-center justify-center font-mono font-bold text-dark-900 relative">
        {strike.strike.toLocaleString()}
        {isATM && <span className="absolute -top-1 right-1 w-1.5 h-1.5 bg-primary-500 rounded-full" />}
      </div>

      {/* PE Side */}
      <OptionCell
        option={strike.pe}
        side="pe"
        isATM={isATM}
        isITM={isITM_PE}
        viewMode={viewMode}
        formatNumber={formatNumber}
        change={peChange}
        onBuy={() => strike.pe && onAddLeg(strike, 'PE', 'BUY')}
        onSell={() => strike.pe && onAddLeg(strike, 'PE', 'SELL')}
      />
    </div>
  )
}

function OptionCell({
  option,
  side,
  isATM,
  isITM,
  viewMode,
  formatNumber,
  change,
  onBuy,
  onSell,
}: {
  option: any
  side: 'ce' | 'pe'
  isATM: boolean
  isITM: boolean
  viewMode: 'compact' | 'full'
  formatNumber: (num: number | undefined, decimals?: number) => string
  change: { value: string; isPositive: boolean; isNegative: boolean }
  onBuy: () => void
  onSell: () => void
}) {
  if (!option) {
    return Array(10).fill(null).map((_, i) => (
      <div key={i} className="text-dark-300 text-center text-xs">—</div>
    ))
  }

  const bgColor = side === 'ce' ? 'bg-green-50' : 'bg-red-50'
  const textColor = side === 'ce' ? 'text-green-700' : 'text-red-700'
  const itmColor = side === 'ce' ? 'bg-green-100' : 'bg-red-100'

  const cells = [
    // OI
    <div key="oi" className={clsx('text-right text-xs font-mono', isATM && 'font-bold')}>{formatNumber(option.oi)}</div>,
    // OI Change
    <div key="oi_chg" className={clsx('text-right text-xs', option.oiChange > 0 ? 'text-green-600' : option.oiChange < 0 ? 'text-red-600' : 'text-dark-500')}>
      {option.oiChange > 0 ? '+' : ''}{formatNumber(option.oiChange)}
    </div>,
    // Volume
    <div key="vol" className="text-right text-xs text-dark-500">{formatNumber(option.volume)}</div>,
    // IV
    <div key="iv" className={clsx('text-right text-xs font-mono', isATM && 'font-bold')}>
      {(option.impliedVolatility || 0).toFixed(1)}%
    </div>,
    // Gamma
    <div key="gamma" className="text-right text-xs text-dark-500 font-mono">
      {(option.greeks?.gamma || 0).toFixed(4)}
    </div>,
    // Theta
    <div key="theta" className={clsx('text-right text-xs font-mono', (option.greeks?.theta || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
      {(option.greeks?.theta || 0).toFixed(2)}
    </div>,
    // Vega
    <div key="vega" className="text-right text-xs text-dark-500 font-mono">
      {(option.greeks?.vega || 0).toFixed(2)}
    </div>,
    // LTP
    <div key="ltp" className={clsx('text-right text-sm font-mono font-bold', isATM && 'text-lg')}>
      {option.ltp.toFixed(2)}
    </div>,
    // Change
    <div key="chg" className={clsx('text-right text-xs font-mono', change.isPositive ? 'text-green-600' : change.isNegative ? 'text-red-600' : 'text-dark-500')}>
      {change.value}
    </div>,
    // Bid/Ask
    <div key="ba" className="text-right text-xs text-dark-500 font-mono">
      {option.bid.toFixed(1)}/{option.ask.toFixed(1)}
    </div>,
  ]

  if (viewMode === 'compact') {
    return (
      <>
        <div key="buy" className="flex items-center justify-center">
          <button
            onClick={onBuy}
            className={clsx('w-6 h-6 rounded text-xs font-medium transition-colors', side === 'ce' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200')}
            title="Buy"
          >
            B
          </button>
        </div>
        <div key="ltp_main" className={clsx('text-right text-sm font-mono font-bold', isATM && 'text-lg text-primary-600')}>
          {option.ltp.toFixed(2)}
        </div>
        <div key="sell" className="flex items-center justify-center">
          <button
            onClick={onSell}
            className={clsx('w-6 h-6 rounded text-xs font-medium transition-colors', side === 'ce' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200')}
            title="Sell"
          >
            S
          </button>
        </div>
      </>
    )
  }

  return cells.map((cell, i) => (
    <div key={i} className={clsx(cell.props?.className, isITM && itmColor)}>{cell.props?.children}</div>
  ))
}