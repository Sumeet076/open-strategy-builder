import { create } from 'zustand'
import { StrategyLeg, StrategyTemplate, ExchangeType, OptionChainResponse, UnderlyingQuote } from '../types'

interface StrategyBuilderState {
  // Identity
  selectedExchange: ExchangeType
  setSelectedExchange: (exchange: ExchangeType) => void
  selectedUnderlying: string
  setSelectedUnderlying: (underlying: string) => void
  selectedExpiry: string
  setSelectedExpiry: (expiry: string) => void

  // Legs
  legs: StrategyLeg[]
  addLeg: (leg: Omit<StrategyLeg, 'id'>) => void
  updateLeg: (id: string, updates: Partial<StrategyLeg>) => void
  removeLeg: (id: string) => void
  clearLegs: () => void

  // Simulators
  spotShiftPct: number
  setSpotShiftPct: (shift: number) => void
  ivShiftPct: number
  setIvShiftPct: (shift: number) => void
  daysElapsed: number
  setDaysElapsed: (days: number) => void

  // UI
  activeTab: 'CHAIN' | 'LEGS' | 'PAYOFF' | 'GREEKS' | 'PNL' | 'SCENARIO'
  setActiveTab: (tab: StrategyBuilderState['activeTab']) => void
  saveDialogOpen: boolean
  setSaveDialogOpen: (open: boolean) => void
  executeDialogOpen: boolean
  setExecuteDialogOpen: (open: boolean) => void
  templatesDialogOpen: boolean
  setTemplatesDialogOpen: (open: boolean) => void

  // Data
  optionChain: OptionChainResponse | null
  setOptionChain: (chain: OptionChainResponse | null) => void
  underlyingQuote: UnderlyingQuote | null
  setUnderlyingQuote: (quote: UnderlyingQuote | null) => void
  expiries: string[]
  setExpiries: (expiries: string[]) => void
  templates: StrategyTemplate[]
  setTemplates: (templates: StrategyTemplate[]) => void
}

export const useStrategyBuilderStore = create<StrategyBuilderState>((set) => ({
  // Identity
  selectedExchange: 'NSE',
  setSelectedExchange: (exchange) => set({ selectedExchange: exchange }),

  selectedUnderlying: 'NIFTY',
  setSelectedUnderlying: (underlying) => set({ selectedUnderlying: underlying }),

  selectedExpiry: '',
  setSelectedExpiry: (expiry) => set({ selectedExpiry: expiry }),

  // Legs
  legs: [],
  addLeg: (leg) =>
    set((state) => ({
      legs: [...state.legs, { ...leg, id: `leg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }],
    })),
  updateLeg: (id, updates) =>
    set((state) => ({
      legs: state.legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)),
    })),
  removeLeg: (id) =>
    set((state) => ({
      legs: state.legs.filter((leg) => leg.id !== id),
    })),
  clearLegs: () => set({ legs: [] }),

  // Simulators
  spotShiftPct: 0,
  setSpotShiftPct: (shift) => set({ spotShiftPct: Math.max(-20, Math.min(20, shift)) }),

  ivShiftPct: 0,
  setIvShiftPct: (shift) => set({ ivShiftPct: Math.max(-50, Math.min(50, shift)) }),

  daysElapsed: 0,
  setDaysElapsed: (days) => set({ daysElapsed: Math.max(0, days) }),

  // UI
  activeTab: 'CHAIN',
  setActiveTab: (tab) => set({ activeTab: tab }),

  saveDialogOpen: false,
  setSaveDialogOpen: (open) => set({ saveDialogOpen: open }),

  executeDialogOpen: false,
  setExecuteDialogOpen: (open) => set({ executeDialogOpen: open }),

  templatesDialogOpen: false,
  setTemplatesDialogOpen: (open) => set({ templatesDialogOpen: open }),

  // Data
  optionChain: null,
  setOptionChain: (chain) => set({ optionChain: chain }),

  underlyingQuote: null,
  setUnderlyingQuote: (quote) => set({ underlyingQuote: quote }),

  expiries: [],
  setExpiries: (expiries) => set({ expiries }),

  templates: [],
  setTemplates: (templates) => set({ templates }),
}))