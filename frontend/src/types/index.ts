// Core Type Definitions for Open Strategy Builder

// ============================================
// Enums
// ============================================

export type OptionType = 'CE' | 'PE';
export type PositionType = 'BUY' | 'SELL';
export type SegmentType = 'OPTIONS' | 'FUTURES' | 'EQUITY';
export type ExchangeType = 'NSE' | 'BSE' | 'NFO' | 'BFO' | 'MCX';
export type ExpiryType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type StrikeSelectionMode = 'ATM' | 'OTM' | 'ITM' | 'STRIKE' | 'DELTA';
export type ProductType = 'NRML' | 'MIS' | 'CNC';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
export type ExecutionMode = 'PAPER' | 'LIVE';

// ============================================
// Market Data Types
// ============================================

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  // Higher-order Greeks
  vanna?: number;
  charm?: number;
  vomma?: number;
  speed?: number;
  zomma?: number;
  color?: number;
  veta?: number;
  ultima?: number;
  dualDelta?: number;
  dualGamma?: number;
}

export interface OptionData {
  symbol: string;
  label: string;
  strike: number;
  optionType: OptionType;
  ltp: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  oi: number;
  oiChange: number;
  lotSize: number;
  tickSize: number;
  impliedVolatility?: number;
  greeks?: OptionGreeks;
  expiryDate: string;
  exchange: ExchangeType;
  underlying: string;
}

export interface OptionStrike {
  strike: number;
  ce: OptionData | null;
  pe: OptionData | null;
}

export interface OptionChainResponse {
  status: 'success' | 'error';
  underlying: string;
  underlyingSymbol: string;
  underlyingExchange: ExchangeType;
  underlyingLtp: number;
  underlyingPrevClose: number;
  expiryDate: string;
  expiryTimestamp?: number;
  serverTimestamp?: number;
  atmStrike: number;
  forwardPrice?: number;
  greeksIncluded?: boolean;
  chain: OptionStrike[];
  message?: string;
  metrics?: {
    totalCeOi: number;
    totalPeOi: number;
    totalCeVolume: number;
    totalPeVolume: number;
    pcr: number;
    maxPain?: number;
  };
}

export interface OptionChainParams {
  underlying: string;
  exchange: ExchangeType;
  expiryDate: string;
  strikeCount?: number;
}

export interface UnderlyingQuote {
  symbol: string;
  exchange: ExchangeType;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  timestamp: number;
}

// ============================================
// Strategy Types
// ============================================

export interface StrategyLeg {
  id: string;
  // Identity
  underlying: string;
  exchange: ExchangeType;
  expiryDate: string;
  strike: number;
  optionType: OptionType;
  // Position
  positionType: PositionType;
  lots: number;
  quantity: number; // lots * lotSize
  // Entry/Exit
  entryPrice?: number;
  exitPrice?: number;
  entryType: 'MARKET' | 'LIMIT' | 'STRIKE';
  // Risk Management
  stopLoss?: {
    type: 'PERCENTAGE' | 'POINTS' | 'PREMIUM';
    value: number;
  };
  target?: {
    type: 'PERCENTAGE' | 'POINTS' | 'PREMIUM';
    value: number;
  };
  trailingSl?: {
    type: 'PERCENTAGE' | 'POINTS';
    value: number;
  };
  // Greeks (computed)
  greeks?: OptionGreeks;
  // Metadata
  instrumentToken?: string;
  tradingSymbol?: string;
  lotSize: number;
  tickSize: number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  // Market
  underlying: string;
  exchange: ExchangeType;
  expiryDate: string;
  // Configuration
  legs: StrategyLeg[];
  productType: ProductType;
  orderType: OrderType;
  // Risk Management
  overallStopLoss?: number;
  overallTarget?: number;
  maxLossPerTrade?: number;
  // Execution
  executionMode: ExecutionMode;
  // Timing
  entryTime?: string; // HH:MM format
  exitTime?: string; // HH:MM format
  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'DIRECTIONAL' | 'NON_DIRECTIONAL' | 'VOLATILITY' | 'INCOME' | 'HEDGING';
  legs: Omit<StrategyLeg, 'id' | 'entryPrice' | 'exitPrice' | 'greeks'>[];
  minCapital?: number;
  maxRisk?: number;
  typicalIvRange?: [number, number];
  marketView?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' | 'RANGE_BOUND';
}

// ============================================
// Payoff Types
// ============================================

export interface PayoffPoint {
  spotPrice: number;
  totalPnl: number;
  legPnls: Map<string, number>;
  timestamp?: number;
}

export interface PayoffCurve {
  points: PayoffPoint[];
  breakevens: number[];
  maxProfit: number;
  maxLoss: number;
  probabilityOfProfit?: number;
  expectedValue?: number;
  riskRewardRatio?: number;
}

export interface PayoffConfig {
  spotRange: [number, number]; // [min, max] as percentage of current spot
  steps: number;
  includeGreeks: boolean;
  includeProbability: boolean;
  ivOverride?: number;
  daysToExpiryOverride?: number;
}

export interface ScenarioAnalysisResult {
  spotShift: number;
  ivShift: number;
  daysElapsed: number;
  payoffCurve: PayoffCurve;
  greeks: OptionGreeks;
}

// ============================================
// Backtesting Types
// ============================================

export interface BacktestConfig {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  lotSize: number;
  slippage: number; // in points
  commission: number; // per lot
  marginType: 'SPAN' | 'FULL';
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  maxDrawdown: number;
  maxRunup: number;
  holdingPeriod: number; // days
}

export interface BacktestResult {
  config: BacktestConfig;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  avgHoldingPeriod: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
  monthlyReturns: { month: string; return: number }[];
}

// ============================================
// Real-time Data Types
// ============================================

export interface MarketDataSnapshot {
  underlying: UnderlyingQuote;
  optionChain: OptionChainResponse;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'DATA' | 'ERROR' | 'HEARTBEAT';
  payload: any;
  subscriptionId?: string;
}

export interface SubscriptionConfig {
  symbols: string[];
  mode: 'LTP' | 'QUOTE' | 'DEPTH';
  exchange: ExchangeType;
}

// ============================================
// UI State Types
// ============================================

export interface StrategyBuilderState {
  // Identity
  selectedExchange: ExchangeType;
  selectedUnderlying: string;
  selectedExpiry: string;
  // Legs
  legs: StrategyLeg[];
  // Simulators
  spotShiftPct: number;
  ivShiftPct: number;
  daysElapsed: number;
  // UI
  activeTab: 'PAYOFF' | 'GREEKS' | 'PNL' | 'CHARTS' | 'ANALYSIS';
  saveDialogOpen: boolean;
  executeDialogOpen: boolean;
  loadedStrategyId?: string;
}

export interface OptionChainViewState {
  viewMode: 'PRICE' | 'GREEKS' | 'OI' | 'VOLUME';
  strikeCount: number;
  selectedStrike?: number;
  atmStrike: number;
  visibleColumns: string[];
  columnOrder: string[];
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface TimeframeData {
  timeframe: string;
  data: any[];
}

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
  metadata?: Record<string, any>;
}