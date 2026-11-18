"""
Type definitions for Open Strategy Builder Python modules.
These mirror the TypeScript types from the frontend.
"""

from dataclasses import dataclass
from typing import Literal, Optional
from enum import Enum

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


class StrategyCategory(str, Enum):
    DIRECTIONAL = "DIRECTIONAL"
    NON_DIRECTIONAL = "NON_DIRECTIONAL"
    VOLATILITY = "VOLATILITY"
    INCOME = "INCOME"
    HEDGING = "HEDGING"


class MarketView(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"
    VOLATILE = "VOLATILE"
    RANGE_BOUND = "RANGE_BOUND"


# ============================================
# Strategy Types
# ============================================

@dataclass
class StrategyLeg:
    id: str
    underlying: str
    exchange: ExchangeType
    expiry_date: str
    strike: float
    option_type: OptionType
    position_type: PositionType
    lots: int
    quantity: int
    lot_size: int
    tick_size: float = 0.05
    entry_type: Literal['MARKET', 'LIMIT', 'STRIKE'] = 'MARKET'
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    stop_loss: Optional[dict] = None
    target: Optional[dict] = None
    trailing_sl: Optional[dict] = None
    greeks: Optional[dict] = None
    instrument_token: Optional[str] = None
    trading_symbol: Optional[str] = None
    lot_size: int
    tick_size: float = 0.05


@dataclass
class StrategyTemplate:
    id: str
    name: str
    description: str
    category: StrategyCategory
    market_view: MarketView
    legs: list[dict]
    min_capital: Optional[float] = None
    max_risk: Optional[float] = None
    typical_iv_range: tuple[float, float] = (0.15, 0.35)
    tags: list[str] = None


# ============================================
# Greeks
# ============================================

@dataclass
class OptionGreeks:
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