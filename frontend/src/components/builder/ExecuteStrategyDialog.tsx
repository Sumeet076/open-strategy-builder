import { useState } from 'react'
import { X, Play, Shield, CreditCard, AlertTriangle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { StrategyLeg } from '../../types'

interface ExecuteStrategyDialogProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (mode: 'PAPER' | 'LIVE') => void
  legs: StrategyLeg[]
}

export function ExecuteStrategyDialog({ isOpen, onClose, onExecute, legs }: ExecuteStrategyDialogProps) {
  if (!isOpen) return null

  const [selectedMode, setSelectedMode] = useState<'PAPER' | 'LIVE'>('PAPER')
  const [isExecuting, setIsExecuting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const totalLots = legs.reduce((sum, leg) => sum + leg.lots, 0)
  const estimatedMargin = legs.reduce((sum, leg) => {
    // Rough margin estimation
    const premium = leg.entryPrice || 100
    return sum + premium * leg.quantity * (leg.positionType === 'SELL' ? 1.5 : 1)
  }, 0)

  const handleExecute = () => {
    if (selectedMode === 'LIVE') {
      setShowConfirm(true)
    } else {
      onExecute('PAPER')
      onClose()
    }
  }

  const handleConfirmLive = () => {
    onExecute('LIVE')
    onClose()
    setShowConfirm(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-dark-900">Execute Strategy</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-100 text-dark-500"
            disabled={isExecuting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-dark-600">Choose execution mode</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Paper Trading */}
            <button
              type="button"
              onClick={() => setSelectedMode('PAPER')}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedMode === 'PAPER'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-dark-200 hover:border-primary-300'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className={clsx('w-5 h-5', selectedMode === 'PAPER' ? 'text-primary-600' : 'text-dark-400')} />
                <span className={clsx('font-semibold', selectedMode === 'PAPER' ? 'text-primary-600' : 'text-dark-900')}>
                  Paper Trading
                </span>
              </div>
              <p className="text-sm text-dark-500">Simulated orders, no real money</p>
              <p className="text-xs text-success-600 mt-1">✓ Zero risk</p>
            </button>

            {/* Live Trading */}
            <button
              type="button"
              onClick={() => setSelectedMode('LIVE')}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedMode === 'LIVE'
                  ? 'border-danger-500 bg-danger-50'
                  : 'border-dark-200 hover:border-danger-300'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className={clsx('w-5 h-5', selectedMode === 'LIVE' ? 'text-danger-600' : 'text-dark-400')} />
                <span className={clsx('font-semibold', selectedMode === 'LIVE' ? 'text-danger-600' : 'text-dark-900')}>
                  Live Trading
                </span>
              </div>
              <p className="text-sm text-dark-500">Real orders with real money</p>
              <p className="text-xs text-danger-600 mt-1">⚠ Real risk</p>
            </button>
          </div>

          {/* Strategy Summary */}
          <div className="bg-dark-50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-dark-700">Order Summary</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-dark-900">{legs.length}</p>
                <p className="text-xs text-dark-500">Legs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-900">{totalLots}</p>
                <p className="text-xs text-dark-500">Total Lots</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">~₹{estimatedMargin.toLocaleString()}</p>
                <p className="text-xs text-dark-500">Est. Margin</p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              {legs.map((leg) => (
                <div key={leg.id} className="flex justify-between text-dark-600">
                  <span className={clsx(leg.positionType === 'BUY' ? 'text-success-600' : 'text-danger-600')}>
                    {leg.positionType} {leg.optionType} {leg.strike.toLocaleString()}
                  </span>
                  <span>×{leg.lots}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {legs.some(l => l.positionType === 'SELL' && !l.stopLoss) && (
            <div className="flex items-start gap-2 p-3 bg-warning-50 rounded-lg border border-warning-200">
              <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-700">Short positions without stop loss</p>
                <p className="text-sm text-warning-600 mt-1">Unlimited risk exposure detected</p>
              </div>
            </div>
          )}

          {selectedMode === 'LIVE' && (
            <div className="flex items-start gap-2 p-3 bg-danger-50 rounded-lg border border-danger-200">
              <Info className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-danger-700">Live trading uses real capital</p>
                <p className="text-sm text-danger-600 mt-1">Ensure you have sufficient margin and understand the risks</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-200 bg-dark-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isExecuting}
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            className={clsx(
              'btn-primary gap-2',
              selectedMode === 'LIVE' ? 'bg-danger-600 hover:bg-danger-700' : ''
            )}
            disabled={isExecuting}
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : selectedMode === 'LIVE' ? 'Confirm Live Order' : 'Execute Paper Trade'}
          </button>
        </div>
      </div>

      {/* Live Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in">
            <div className="p-4 border-b border-dark-200">
              <h3 className="text-lg font-semibold text-dark-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
                Confirm Live Execution
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-dark-600">You are about to place REAL orders with REAL money.</p>
              <div className="bg-danger-50 rounded-lg p-3">
                <p className="font-medium text-danger-700">Please verify:</p>
                <ul className="text-sm text-danger-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Broker connection is active</li>
                  <li>Sufficient margin available</li>
                  <li>Market is open for trading</li>
                  <li>Strategy parameters are correct</li>
                </ul>
              </div>
              <p className="text-sm text-dark-500">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-dark-200">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLive}
                className="btn-danger gap-2"
              >
                <Play className="w-4 h-4" />
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}