"""
Pydantic models for the Open Strategy Builder API.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from uuid import UUID, uuid4


# ============================================
# Enums
# ============================================

OptionType = Literal['CE', 'PE']
PositionType = Literal['BUY', 'SELL']
SegmentType = Literal['OPTIONS', 'FUTURES', 'EQUITY']
ExchangeType = Literal['NSE', 'BSE', 'NFO', 'BFO', 'MCX']
ExpiryType = Literal['WEEKLY', 'MONTHLY', 'QUARTERLY']
ProductType = Literal['NRML', 'MIS', 'CNC']
OrderType = Literal['MARKET', 'LIMIT', 'SL', 'SL-M']
ExecutionMode = Literal['PAPER', 'LIVE']


# ============================================
# Market Data Models
# ============================================

class OptionGreeks(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    vanna: Optional[float] = None
    charm: Optional[float] = None
    vomma: Optional[float] = None
    speed: Optional[float] = None
    zomma: Optional[float] = None
    color: Optional[float] = None
    veta: Optional[float] = None
    ultima: Optional[float] = None
    dual_delta: Optional[float] = None
    dual_gamma: Optional[float] = None


class OptionData(BaseModel):
    symbol: str
    label: str
    strike: float
    option_type: OptionType
    ltp: float
    bid: float
    ask: float
    bid_qty: int
    ask_qty: int
    open: float
    high: float
    low: float
    prev_close: float
    volume: int
    oi: int
    oi_change: int
    lot_size: int
    tick_size: float
    implied_volatility: Optional[float] = None
    greeks: Optional[OptionGreeks] = None
    expiry_date: str
    exchange: ExchangeType
    underlying: str


class OptionStrike(BaseModel):
    strike: float
    ce: Optional[OptionData] = None
    pe: Optional[OptionData] = None


class OptionChainResponse(BaseModel):
    status: Literal['success', 'error']
    underlying: str
    underlying_symbol: str
    underlying_exchange: ExchangeType
    underlying_ltp: float
    underlying_prev_close: float
    expiry_date: str
    expiry_timestamp: Optional[int] = None
    server_timestamp: Optional[int] = None
    atm_strike: float
    forward_price: Optional[float] = None
    greeks_included: Optional[bool] = None
    chain: List[OptionStrike]
    message: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class UnderlyingQuote(BaseModel):
    symbol: str
    exchange: ExchangeType
    ltp: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    prev_close: float
    volume: int
    timestamp: int


# ============================================
# Strategy Models
# ============================================

class StrategyLeg(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    underlying: str
    exchange: ExchangeType
    expiry_date: str
    strike: float
    option_type: OptionType
    position_type: PositionType
    lots: int
    quantity: int
    entry_type: Literal['MARKET', 'LIMIT', 'STRIKE'] = 'MARKET'
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    stop_loss: Optional[Dict[str, Any]] = None
    target: Optional[Dict[str, Any]] = None
    trailing_sl: Optional[Dict[str, Any]] = None
    greeks: Optional[OptionGreeks] = None
    instrument_token: Optional[str] = None
    trading_symbol: Optional[str] = None
    lot_size: int
    tick_size: float = 0.05


class StrategyConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    underlying: str
    exchange: ExchangeType
    expiry_date: str
    legs: List[StrategyLeg]
    product_type: ProductType = 'NRML'
    order_type: OrderType = 'MARKET'
    overall_stop_loss: Optional[float] = None
    overall_target: Optional[float] = None
    max_loss_per_trade: Optional[float] = None
    execution_mode: ExecutionMode = 'PAPER'
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1


class StrategyTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: Literal['DIRECTIONAL', 'NON_DIRECTIONAL', 'VOLATILITY', 'INCOME', 'HEDGING']
    market_view: Literal['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE', 'RANGE_BOUND']
    legs: List[Dict[str, Any]]
    min_capital: Optional[float] = None
    max_risk: Optional[float] = None
    typical_iv_range: Optional[List[float]] = None
    tags: List[str] = []


# ============================================
# Analytics Models
# ============================================

class PayoffPoint(BaseModel):
    spot_price: float
    total_pnl: float
    leg_pnls: Dict[str, float]


class PayoffCurve(BaseModel):
    points: List[PayoffPoint]
    breakevens: List[float]
    max_profit: float
    max_loss: float
    probability_of_profit: Optional[float] = None
    expected_value: Optional[float] = None
    risk_reward_ratio: Optional[float] = None


class GreeksResponse(BaseModel):
    total_greeks: OptionGreeks
    leg_greeks: Dict[str, OptionGreeks]


class ScenarioResult(BaseModel):
    spot_shift: float
    iv_shift: float
    days_elapsed: int
    payoff: PayoffCurve
    greeks: OptionGreeks


# ============================================
# Backtesting Models
# ============================================

class BacktestConfig(BaseModel):
    strategy_id: str
    start_date: str
    end_date: str
    initial_capital: float = 100000
    lot_size: int = 50
    slippage: float = 0.05
    commission: float = 20
    margin_type: Literal['SPAN', 'FULL'] = 'SPAN'


class BacktestTrade(BaseModel):
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    quantity: int
    pnl: float
    pnl_percent: float
    max_drawdown: float
    max_runup: float
    holding_period: int


class BacktestResult(BaseModel):
    config: BacktestConfig
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    total_pnl_percent: float
    max_drawdown: float
    max_drawdown_percent: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    profit_factor: float
    expectancy: float
    avg_win: float
    avg_loss: float
    avg_holding_period: float
    trades: List[BacktestTrade]
    equity_curve: List[Dict[str, Any]]
    monthly_returns: List[Dict[str, Any]]


# ============================================
# Request/Response Models
# ============================================

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class OptionChainRequest(BaseModel):
    underlying: str
    exchange: ExchangeType = 'NSE'
    expiry_date: str
    strike_count: int = 20


class StrategyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    underlying: str
    exchange: ExchangeType
    expiry_date: str
    legs: List[StrategyLeg]
    product_type: ProductType = 'NRML'
    order_type: OrderType = 'MARKET'
    execution_mode: ExecutionMode = 'PAPER'
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None


class PayoffRequest(BaseModel):
    strategy_id: Optional[str] = None
    legs: List[StrategyLeg]
    underlying: str
    exchange: ExchangeType
    expiry_date: str
    spot_range_pct: List[float] = [-10, 10]
    steps: int = 100
    iv_override: Optional[float] = None
    days_to_expiry_override: Optional[float] = None
    risk_free_rate: float = 0.07


class GreeksRequest(BaseModel):
    legs: List[StrategyLeg]
    spot: float
    iv: float
    days_to_expiry: float
    risk_free_rate: float = 0.07


class TemplateGenerateRequest(BaseModel):
    template_id: str
    underlying: str
    exchange: ExchangeType = 'NSE'
    expiry_date: str
    atm_strike: float
    strike_interval: float
    lot_size: int
    custom_params: Optional[Dict[str, Any]] = None


class BacktestRequest(BaseModel):
    strategy_id: str
    start_date: str
    end_date: str
    initial_capital: float = 100000
    lot_size: int = 50
    slippage: float = 0.05
    commission: float = 20
    margin_type: Literal['SPAN', 'FULL'] = 'SPAN'