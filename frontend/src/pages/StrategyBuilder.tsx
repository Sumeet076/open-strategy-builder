import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import {
  StrategyBuilderHeader,
  OptionChainPanel,
  StrategyLegsPanel,
  PayoffChartPanel,
  GreeksPanel,
  ScenarioAnalysisPanel,
  StrategyTemplatesDialog,
  SaveStrategyDialog,
  ExecuteStrategyDialog,
} from '../components/builder'
import { useStrategyBuilderStore } from '../stores/strategyBuilderStore'
import { StrategyLeg, StrategyTemplate } from '../types'
import { toast } from '../stores/toastStore'

export function StrategyBuilder() {
  const {
    // Identity
    selectedExchange,
    setSelectedExchange,
    selectedUnderlying,
    setSelectedUnderlying,
    selectedExpiry,
    setSelectedExpiry,
    // Legs
    legs,
    addLeg,
    updateLeg,
    removeLeg,
    // Simulators
    spotShiftPct,
    setSpotShiftPct,
    ivShiftPct,
    setIvShiftPct,
    daysElapsed,
    setDaysElapsed,
    // UI
    activeTab,
    setActiveTab,
    saveDialogOpen,
    setSaveDialogOpen,
    executeDialogOpen,
    setExecuteDialogOpen,
    templatesDialogOpen,
    setTemplatesDialogOpen,
    // Data
    optionChain,
    underlyingQuote,
    expiries,
    templates,
  } = useStrategyBuilderStore()

  const queryClient = useQueryClient()

  // Fetch expiries when underlying/exchange changes
  useEffect(() => {
    if (selectedUnderlying && selectedExchange) {
      api.getExpiries(selectedUnderlying, selectedExchange).then((data) => {
        if (data.expiries.length > 0 && !expiries.includes(data.expiries[0])) {
          // Update expiries in store
        }
      })
    }
  }, [selectedUnderlying, selectedExchange])

  // Fetch option chain
  const { data: chainData, isLoading: chainLoading } = useQuery({
    queryKey: ['optionChain', selectedExchange, selectedUnderlying, selectedExpiry],
    queryFn: () => api.getOptionChain(selectedUnderlying, selectedExchange, selectedExpiry, 30),
    enabled: !!selectedUnderlying && !!selectedExchange && !!selectedExpiry,
    refetchInterval: 30000, // 30 seconds
  })

  // Fetch underlying quote
  const { data: quoteData, isLoading: quoteLoading } = useQuery({
    queryKey: ['underlyingQuote', selectedExchange, selectedUnderlying],
    queryFn: () => api.getUnderlyingQuote(selectedUnderlying, selectedExchange),
    enabled: !!selectedUnderlying && !!selectedExchange,
    refetchInterval: 5000, // 5 seconds
  })

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.getTemplates(),
  })

  // Update store with fetched data
  useEffect(() => {
    if (chainData) {
      useStrategyBuilderStore.setState({ optionChain: chainData })
    }
  }, [chainData])

  useEffect(() => {
    if (quoteData) {
      useStrategyBuilderStore.setState({ underlyingQuote: quoteData })
    }
  }, [quoteData])

  useEffect(() => {
    if (templatesData) {
      useStrategyBuilderStore.setState({ templates: templatesData.templates })
    }
  }, [templatesData])

  // Computed values
  const atmStrike = chainData?.atmStrike || 0
  const currentSpot = quoteData?.ltp || chainData?.underlyingLtp || 0
  const strikeInterval = chainData?.chain[1]?.strike - chainData?.chain[0]?.strike || 50

  // Generate legs from template
  const handleTemplateSelect = useCallback((template: StrategyTemplate) => {
    const newLegs = template.legs.map((leg, i) => ({
      ...leg,
      id: `leg_${Date.now()}_${i}`,
      underlying: selectedUnderlying,
      exchange: selectedExchange,
      expiryDate: selectedExpiry,
      strike: leg.strike || atmStrike,
      quantity: leg.lots * (leg.lotSize || 50),
    }))

    useStrategyBuilderStore.setState({ legs: newLegs })
    setTemplatesDialogOpen(false)
    toast.success('Template Applied', `${template.name} loaded with ${newLegs.length} legs`)
  }, [selectedUnderlying, selectedExchange, selectedExpiry, atmStrike])

  // Calculate portfolio Greeks
  const portfolioGreeks = useMemo(() => {
    if (legs.length === 0 || !currentSpot) return null

    let totalDelta = 0
    let totalGamma = 0
    let totalTheta = 0
    let totalVega = 0
    let totalRho = 0

    legs.forEach((leg) => {
      const legGreeks = leg.greeks
      if (!legGreeks) return

      const mult = leg.positionType === 'BUY' ? 1 : -1
      totalDelta += legGreeks.delta * leg.quantity * mult
      totalGamma += legGreeks.gamma * leg.quantity * mult
      totalTheta += legGreeks.theta * leg.quantity * mult
      totalVega += legGreeks.vega * leg.quantity * mult
      totalRho += legGreeks.rho * leg.quantity * mult
    })

    return { delta: totalDelta, gamma: totalGamma, theta: totalTheta, vega: totalVega, rho: totalRho }
  }, [legs, currentSpot])

  // Calculate current P&L
  const currentPnL = useMemo(() => {
    if (legs.length === 0) return 0

    return legs.reduce((total, leg) => {
      const entryPrice = leg.entryPrice || leg.greeks?.delta || 0 // fallback
      const currentPrice = leg.greeks?.delta || 0 // This should come from real-time data
      const pnlPerUnit = (currentPrice - entryPrice) * (leg.positionType === 'BUY' ? 1 : -1)
      return total + pnlPerUnit * leg.quantity
    }, 0)
  }, [legs])

  // Save strategy mutation
  const saveMutation = useMutation({
    mutationFn: (strategy: any) => api.saveStrategy(strategy),
    onSuccess: () => {
      toast.success('Strategy Saved', 'Your strategy has been saved successfully')
      setSaveDialogOpen(false)
    },
    onError: () => toast.error('Save Failed', 'Failed to save strategy'),
  })

  // Execute strategy mutation
  const executeMutation = useMutation({
    mutationFn: (data: { strategyId: string; mode: 'PAPER' | 'LIVE' }) => api.executeStrategy(data),
    onSuccess: () => {
      toast.success('Order Placed', 'Strategy executed successfully')
      setExecuteDialogOpen(false)
    },
    onError: () => toast.error('Execution Failed', 'Failed to execute strategy'),
  })

  const handleSave = (strategyData: any) => {
    saveMutation.mutate({
      ...strategyData,
      underlying: selectedUnderlying,
      exchange: selectedExchange,
      expiryDate: selectedExpiry,
      legs: legs.map((l) => ({ ...l, entryPrice: l.entryPrice || l.greeks?.delta })),
    })
  }

  const handleExecute = (mode: 'PAPER' | 'LIVE') => {
    if (legs.length === 0) {
      toast.error('No Legs', 'Add at least one leg to execute')
      return
    }
    executeMutation.mutate({ strategyId: 'temp', mode })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Identity Selectors */}
      <StrategyBuilderHeader
        selectedExchange={selectedExchange}
        onExchangeChange={setSelectedExchange}
        selectedUnderlying={selectedUnderlying}
        onUnderlyingChange={setSelectedUnderlying}
        selectedExpiry={selectedExpiry}
        onExpiryChange={setSelectedExpiry}
        expiries={expiries}
        currentSpot={currentSpot}
        atmStrike={atmStrike}
        onTemplatesClick={() => setTemplatesDialogOpen(true)}
        onSaveClick={() => setSaveDialogOpen(true)}
        onExecuteClick={() => setExecuteDialogOpen(true)}
        isLoading={chainLoading || quoteLoading}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Option Chain & Leg Builder */}
        <div className="w-full lg:w-2/5 xl:w-3/8 border-r border-dark-200 flex flex-col">
          {/* Tabs for Option Chain / Leg Builder */}
          <div className="tabs border-b border-dark-200">
            <button
              className={clsx('tab', activeTab === 'CHAIN' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('CHAIN')}
            >
              Option Chain
            </button>
            <button
              className={clsx('tab', activeTab === 'LEGS' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('LEGS')}
            >
              Strategy Legs ({legs.length})
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'CHAIN' && (
              <OptionChainPanel
                chain={chainData}
                atmStrike={atmStrike}
                currentSpot={currentSpot}
                onAddLeg={addLeg}
                isLoading={chainLoading}
              />
            )}

            {activeTab === 'LEGS' && (
              <StrategyLegsPanel
                legs={legs}
                onUpdateLeg={updateLeg}
                onRemoveLeg={removeLeg}
                atmStrike={atmStrike}
                strikeInterval={strikeInterval}
                lotSize={50}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Analysis */}
        <div className="w-full lg:w-3/5 xl:w-5/8 flex flex-col">
          {/* Analysis Tabs */}
          <div className="tabs border-b border-dark-200 flex-wrap">
            <button
              className={clsx('tab', activeTab === 'PAYOFF' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('PAYOFF')}
            >
              Payoff
            </button>
            <button
              className={clsx('tab', activeTab === 'GREEKS' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('GREEKS')}
            >
              Greeks
            </button>
            <button
              className={clsx('tab', activeTab === 'PNL' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('PNL')}
            >
              P&L
            </button>
            <button
              className={clsx('tab', activeTab === 'SCENARIO' ? 'tab-active' : 'tab-inactive')}
              onClick={() => setActiveTab('SCENARIO')}
            >
              Scenarios
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {activeTab === 'PAYOFF' && (
              <PayoffChartPanel
                legs={legs}
                currentSpot={currentSpot}
                atmStrike={atmStrike}
                spotShiftPct={spotShiftPct}
                ivShiftPct={ivShiftPct}
                daysElapsed={daysElapsed}
              />
            )}

            {activeTab === 'GREEKS' && (
              <GreeksPanel
                legs={legs}
                portfolioGreeks={portfolioGreeks}
                currentSpot={currentSpot}
              />
            )}

            {activeTab === 'PNL' && (
              <div className="card p-4">
                <h3 className="font-semibold text-dark-900 mb-4">Current P&L Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-dark-50 rounded-lg">
                    <p className="text-sm text-dark-500">Unrealized P&L</p>
                    <p className={clsx('text-2xl font-bold', currentPnL >= 0 ? 'text-success-600' : 'text-danger-600')}>
                      {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-dark-50 rounded-lg">
                    <p className="text-sm text-dark-500">Day P&L</p>
                    <p className="text-2xl font-bold text-dark-900">—</p>
                  </div>
                  <div className="p-4 bg-dark-50 rounded-lg">
                    <p className="text-sm text-dark-500">Max Profit</p>
                    <p className="text-2xl font-bold text-success-600">—</p>
                  </div>
                  <div className="p-4 bg-dark-50 rounded-lg">
                    <p className="text-sm text-dark-500">Max Loss</p>
                    <p className="text-2xl font-bold text-danger-600">—</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SCENARIO' && (
              <ScenarioAnalysisPanel
                legs={legs}
                currentSpot={currentSpot}
                spotShiftPct={spotShiftPct}
                onSpotShiftChange={setSpotShiftPct}
                ivShiftPct={ivShiftPct}
                onIvShiftChange={setIvShiftPct}
                daysElapsed={daysElapsed}
                onDaysElapsedChange={setDaysElapsed}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <StrategyTemplatesDialog
        isOpen={templatesDialogOpen}
        onClose={() => setTemplatesDialogOpen(false)}
        templates={templates}
        onSelect={handleTemplateSelect}
        atmStrike={atmStrike}
      />

      <SaveStrategyDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSave}
        legs={legs}
        underlying={selectedUnderlying}
      />

      <ExecuteStrategyDialog
        isOpen={executeDialogOpen}
        onClose={() => setExecuteDialogOpen(false)}
        onExecute={handleExecute}
        legs={legs}
      />
    </div>
  )
}

// Need to import clsx
import { clsx } from 'clsx'