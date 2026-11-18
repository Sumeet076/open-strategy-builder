"""
TrueData Data Provider
TrueData is a popular paid market data provider in India offering real-time and historical data.
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import aiohttp

from .base import (
    BaseDataProvider,
    OptionChainParams,
    OptionChainResponse,
    OptionStrike,
    OptionData,
    OptionGreeks,
    UnderlyingQuote,
    ExpiryInfo,
    ExchangeType,
    OptionType,
)

logger = logging.getLogger(__name__)


class TrueDataProvider(BaseDataProvider):
    """
    TrueData market data provider.

    Requires TrueData subscription with:
    - Username/Password for authentication
    - WebSocket for real-time data
    - REST API for historical data
    """

    BASE_URL = "https://api.truedata.in"
    WS_URL = "wss://api.truedata.in"

    def __init__(
        self,
        username: str = "",
        password: str = "",
        api_key: str = "",
        **config
    ):
        super().__init__(**config)
        self.username = username
        self.password = password
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._auth_token: Optional[str] = None
        self._subscriptions: Dict[str, asyncio.Queue] = {}

    async def connect(self) -> bool:
        """Authenticate and establish connection."""
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)

            # Authenticate
            auth_success = await self._authenticate()
            if not auth_success:
                return False

            self._connected = True
            logger.info("TrueData provider connected successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to TrueData: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Close connections."""
        if self.ws:
            await self.ws.close()
            self.ws = None
        if self.session:
            await self.session.close()
            self.session = None
        self._connected = False
        logger.info("TrueData provider disconnected")

    async def _authenticate(self) -> bool:
        """Authenticate with TrueData API."""
        try:
            auth_url = f"{self.BASE_URL}/auth/token"
            payload = {
                'username': self.username,
                'password': self.password,
            }
            if self.api_key:
                payload['api_key'] = self.api_key

            async with self.session.post(auth_url, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self._auth_token = data.get('token') or data.get('access_token')
                    return bool(self._auth_token)
                return False
        except Exception as e:
            logger.error(f"TrueData authentication failed: {e}")
            return False

    def _get_headers(self) -> Dict[str, str]:
        """Get authenticated headers."""
        return {
            'Authorization': f'Bearer {self._auth_token}',
            'Content-Type': 'application/json',
        } if self._auth_token else {}

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain from TrueData."""
        try:
            url = f"{self.BASE_URL}/v1/option-chain"
            payload = {
                'symbol': params.underlying,
                'exchange': params.exchange.value,
                'expiry': params.expiry_date,
                'strikes': params.strike_count,
            }

            async with self.session.post(
                url,
                json=payload,
                headers=self._get_headers()
            ) as resp:
                if resp.status != 200:
                    return OptionChainResponse(
                        status='error',
                        message=f'HTTP {resp.status}'
                    )
                data = await resp.json()

            return self._parse_option_chain(data, params)
        except Exception as e:
            logger.error(f"Error fetching TrueData option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    def _parse_option_chain(self, data: dict, params: OptionChainParams) -> OptionChainResponse:
        """Parse TrueData option chain response."""
        # TrueData returns data in their specific format
        # This is a template - adjust based on actual API response
        chain_data = data.get('data', [])
        underlying = params.underlying

        chain = []
        for item in chain_data:
            strike = item.get('strike', 0)

            ce_data = item.get('ce', {})
            pe_data = item.get('pe', {})

            ce = OptionData(
                symbol=ce_data.get('symbol', ''),
                label=f"{strike} CE",
                strike=strike,
                option_type=OptionType.CE,
                ltp=ce_data.get('ltp', 0),
                bid=ce_data.get('bid', 0),
                ask=ce_data.get('ask', 0),
                bid_qty=ce_data.get('bid_qty', 0),
                ask_qty=ce_data.get('ask_qty', 0),
                open=ce_data.get('open', 0),
                high=ce_data.get('high', 0),
                low=ce_data.get('low', 0),
                prev_close=ce_data.get('prev_close', 0),
                volume=ce_data.get('volume', 0),
                oi=ce_data.get('oi', 0),
                oi_change=ce_data.get('oi_change', 0),
                lot_size=ce_data.get('lot_size', 50),
                tick_size=0.05,
                implied_volatility=ce_data.get('iv'),
                greeks=OptionGreeks(
                    delta=ce_data.get('delta', 0),
                    gamma=ce_data.get('gamma', 0),
                    theta=ce_data.get('theta', 0),
                    vega=ce_data.get('vega', 0),
                    rho=ce_data.get('rho', 0),
                ) if ce_data.get('delta') is not None else None,
                expiry_date=params.expiry_date,
                exchange=ExchangeType(params.exchange),
                underlying=underlying,
            ) if ce_data else None

            pe = OptionData(
                symbol=pe_data.get('symbol', ''),
                label=f"{strike} PE",
                strike=strike,
                option_type=OptionType.PE,
                ltp=pe_data.get('ltp', 0),
                bid=pe_data.get('bid', 0),
                ask=pe_data.get('ask', 0),
                bid_qty=pe_data.get('bid_qty', 0),
                ask_qty=pe_data.get('ask_qty', 0),
                open=pe_data.get('open', 0),
                high=pe_data.get('high', 0),
                low=pe_data.get('low', 0),
                prev_close=pe_data.get('prev_close', 0),
                volume=pe_data.get('volume', 0),
                oi=pe_data.get('oi', 0),
                oi_change=pe_data.get('oi_change', 0),
                lot_size=pe_data.get('lot_size', 50),
                tick_size=0.05,
                implied_volatility=pe_data.get('iv'),
                greeks=OptionGreeks(
                    delta=pe_data.get('delta', 0),
                    gamma=pe_data.get('gamma', 0),
                    theta=pe_data.get('theta', 0),
                    vega=pe_data.get('vega', 0),
                    rho=pe_data.get('rho', 0),
                ) if pe_data.get('delta') is not None else None,
                expiry_date=params.expiry_date,
                exchange=ExchangeType(params.exchange),
                underlying=underlying,
            ) if pe_data else None

            chain.append(OptionStrike(strike=strike, ce=ce, pe=pe))

        return OptionChainResponse(
            status='success',
            underlying=underlying,
            underlying_symbol=underlying,
            underlying_exchange=ExchangeType(params.exchange),
            underlying_ltp=data.get('spot', 0),
            underlying_prev_close=data.get('prev_close', 0),
            expiry_date=params.expiry_date,
            atm_strike=data.get('atm_strike', 0),
            chain=chain,
        )

    # ============================================
    # Underlying Quote
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote from TrueData."""
        try:
            url = f"{self.BASE_URL}/v1/quote"
            payload = {'symbol': underlying, 'exchange': exchange.value}

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            quote_data = data.get('data', {})
            return UnderlyingQuote(
                symbol=underlying,
                exchange=exchange,
                ltp=quote_data.get('ltp', 0),
                change=quote_data.get('change', 0),
                change_percent=quote_data.get('change_pct', 0),
                open=quote_data.get('open', 0),
                high=quote_data.get('high', 0),
                low=quote_data.get('low', 0),
                prev_close=quote_data.get('prev_close', 0),
                volume=quote_data.get('volume', 0),
                timestamp=int(datetime.now().timestamp() * 1000),
            )
        except Exception as e:
            logger.error(f"Error fetching TrueData quote: {e}")
            return UnderlyingQuote(
                symbol=underlying, exchange=exchange, ltp=0, change=0, change_percent=0,
                open=0, high=0, low=0, prev_close=0, volume=0,
                timestamp=int(datetime.now().timestamp() * 1000)
            )

    # ============================================
    # Expiries
    # ============================================

    async def get_expiries(self, underlying: str, exchange: ExchangeType) -> list[ExpiryInfo]:
        """Get available expiry dates from TrueData."""
        try:
            url = f"{self.BASE_URL}/v1/expiries"
            payload = {'symbol': underlying, 'exchange': exchange.value}

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            expiries = []
            for exp in data.get('expiries', []):
                exp_dt = datetime.fromisoformat(exp['date'].replace('Z', '+00:00'))
                days = (exp_dt - datetime.now()).days
                expiries.append(ExpiryInfo(
                    expiry_date=exp_dt.strftime('%Y-%m-%d'),
                    expiry_type=exp.get('type', 'WEEKLY'),
                    days_to_expiry=days,
                    is_weekly=days <= 7
                ))
            return expiries
        except Exception as e:
            logger.error(f"Error fetching TrueData expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols."""
        try:
            url = f"{self.BASE_URL}/v1/search"
            payload = {'query': query, 'exchange': exchange.value}

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()
            return data.get('symbols', [])
        except Exception as e:
            logger.error(f"Error searching TrueData symbols: {e}")
            return []

    # ============================================
    # WebSocket for Real-time Data
    # ============================================

    async def subscribe_realtime(self, symbols: list[str]) -> asyncio.Queue:
        """Subscribe to real-time data via WebSocket."""
        queue = asyncio.Queue()

        if not self.ws:
            self.ws = await self.session.ws_connect(
                self.WS_URL,
                headers=self._get_headers()
            )
            # Start message handler
            asyncio.create_task(self._handle_ws_messages())

        # Subscribe to symbols
        sub_msg = {
            'action': 'subscribe',
            'symbols': symbols,
            'types': ['ltp', 'oi', 'greeks']
        }
        await self.ws.send_json(sub_msg)

        self._subscriptions[symbols[0]] = queue
        return queue

    async def _handle_ws_messages(self) -> None:
        """Handle incoming WebSocket messages."""
        try:
            async for msg in self.ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    # Route to appropriate queue
                    for queue in self._subscriptions.values():
                        await queue.put(data)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")

    async def unsubscribe_realtime(self, symbol: str) -> None:
        """Unsubscribe from real-time data."""
        if symbol in self._subscriptions:
            del self._subscriptions[symbol]
            if self.ws:
                await self.ws.send_json({
                    'action': 'unsubscribe',
                    'symbols': [symbol]
                })