"""
Base Data Provider Interface and Data Models
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class ExchangeType(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    NFO = "NFO"
    BFO = "BFO"
    MCX = "MCX"


class OptionType(str, Enum):
    CE = "CE"
    PE = "PE"


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


@dataclass
class OptionData:
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
    expiry_date: str = ""
    exchange: ExchangeType = ExchangeType.NSE
    underlying: str = ""


@dataclass
class OptionStrike:
    strike: float
    ce: Optional[OptionData] = None
    pe: Optional[OptionData] = None


@dataclass
class OptionChainParams:
    underlying: str
    exchange: ExchangeType = ExchangeType.NSE
    expiry_date: str = ""
    strike_count: int = 20


@dataclass
class OptionChainResponse:
    status: Literal['success', 'error'] = 'success'
    underlying: str = ""
    underlying_symbol: str = ""
    underlying_exchange: ExchangeType = ExchangeType.NSE
    underlying_ltp: float = 0.0
    underlying_prev_close: float = 0.0
    expiry_date: str = ""
    expiry_timestamp: Optional[int] = None
    server_timestamp: Optional[int] = None
    atm_strike: float = 0.0
    forward_price: Optional[float] = None
    greeks_included: Optional[bool] = None
    chain: list[OptionStrike] = field(default_factory=list)
    message: Optional[str] = None
    metrics: Optional[dict] = None


@dataclass
class UnderlyingQuote:
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


@dataclass
class ExpiryInfo:
    expiry_date: str
    expiry_type: Literal['WEEKLY', 'MONTHLY', 'QUARTERLY']
    days_to_expiry: int
    is_weekly: bool


class BaseDataProvider(ABC):
    """Abstract base class for market data providers."""

    def __init__(self, **config):
        self.config = config
        self._connected = False

    @property
    def name(self) -> str:
        return self.__class__.__name__.replace('DataProvider', '').lower()

    @property
    def is_connected(self) -> bool:
        return self._connected

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to data source."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to data source."""
        pass

    @abstractmethod
    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain for given parameters."""
        pass

    @abstractmethod
    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote."""
        pass

    @abstractmethod
    async def get_expiries(self, underlying: str, exchange: ExchangeType) -> list[ExpiryInfo]:
        """Get available expiry dates."""
        pass

    @abstractmethod
    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols."""
        pass

    async def health_check(self) -> dict:
        """Health check endpoint."""
        return {
            'provider': self.name,
            'connected': self._connected,
            'timestamp': datetime.now().isoformat()
        }