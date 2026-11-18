"""
Upstox Data Provider
Official Upstox API v2/v3 integration for market data.
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
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


class UpstoxDataProvider(BaseDataProvider):
    """
    Upstox Data Provider (API v2/v3).

    Requires Upstox API subscription:
    - API Key and API Secret
    - Access token (OAuth 2.0)
    - Rate limits apply
    """

    BASE_URL_V2 = "https://api.upstox.com/v2"
    BASE_URL_V3 = "https://api.upstox.com/v3"
    WS_URL = "wss://ws.upstox.com"

    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        access_token: str = "",
        api_version: str = "v3",
        **config
    ):
        super().__init__(**config)
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.api_version = api_version
        self.base_url = self.BASE_URL_V3 if api_version == "v3" else self.BASE_URL_V2
        self.session: Optional[aiohttp.ClientSession] = None

    async def connect(self) -> bool:
        """Initialize Upstox API client."""
        try:
            if not self.api_key or not self.api_secret:
                logger.error("Upstox API key and secret required")
                return False

            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)

            if self.access_token:
                # Validate token
                if await self._validate_token():
                    self._connected = True
                    logger.info("Upstox provider connected successfully")
                    return True

            logger.info("Upstox initialized - access token required")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Upstox: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Close session."""
        if self.session:
            await self.session.close()
            self.session = None
        self._connected = False
        logger.info("Upstox provider disconnected")

    def _get_headers(self) -> Dict[str, str]:
        """Get authenticated headers."""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        } if self.access_token else {}

    async def _validate_token(self) -> bool:
        """Validate access token."""
        try:
            url = f"{self.base_url}/user/profile"
            async with self.session.get(url, headers=self._get_headers()) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate_login_url(self) -> str:
        """Generate Upstox OAuth login URL."""
        redirect_uri = "http://localhost:8000/callback"  # Configure as needed
        return (
            f"https://api.upstox.com/v2/login/authorization/dialog?"
            f"client_id={self.api_key}&redirect_uri={redirect_uri}&response_type=code"
        )

    async def generate_access_token(self, code: str) -> Optional[str]:
        """Generate access token from authorization code."""
        try:
            url = f"{self.base_url}/login/authorization/token"
            payload = {
                'code': code,
                'client_id': self.api_key,
                'client_secret': self.api_secret,
                'redirect_uri': "http://localhost:8000/callback",
                'grant_type': 'authorization_code',
            }
            async with self.session.post(url, json=payload) as resp:
                data = await resp.json()
                if 'access_token' in data:
                    self.access_token = data['access_token']
                    self._connected = True
                    return self.access_token
            return None
        except Exception as e:
            logger.error(f"Failed to generate Upstox access token: {e}")
            return None

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain from Upstox."""
        try:
            if not self._connected:
                return OptionChainResponse(status='error', message='Not authenticated')

            # Upstox uses different endpoints for option chain
            url = f"{self.base_url}/market/option-chain"
            payload = {
                'instrument_key': self._get_instrument_key(params.underlying, params.exchange),
                'expiry': params.expiry_date,
            }

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                if resp.status != 200:
                    return OptionChainResponse(
                        status='error',
                        message=f'HTTP {resp.status}'
                    )
                data = await resp.json()

            return self._parse_option_chain(data, params)
        except Exception as e:
            logger.error(f"Error fetching Upstox option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    def _get_instrument_key(self, underlying: str, exchange: ExchangeType) -> str:
        """Get instrument key for underlying."""
        exchange_map = {
            ExchangeType.NSE: 'NSE_EQ',
            ExchangeType.BSE: 'BSE_EQ',
            ExchangeType.NFO: 'NSE_FO',
            ExchangeType.BFO: 'BSE_FO',
        }
        return f"{exchange_map.get(exchange, 'NSE_EQ')}|{underlying}"

    def _parse_option_chain(self, data: dict, params: OptionChainParams) -> OptionChainResponse:
        """Parse Upstox option chain response."""
        # Upstox returns option chain in their format
        # This is a template - adjust based on actual API response
        chain_data = data.get('data', [])
        underlying = params.underlying

        chain = []
        for item in chain_data:
            strike = item.get('strike_price', 0)

            ce_data = item.get('call_options', {})
            pe_data = item.get('put_options', {})

            ce = OptionData(
                symbol=ce_data.get('instrument_key', ''),
                label=f"{strike} CE",
                strike=strike,
                option_type=OptionType.CE,
                ltp=ce_data.get('last_price', 0),
                bid=ce_data.get('bid_price', 0),
                ask=ce_data.get('ask_price', 0),
                bid_qty=ce_data.get('bid_quantity', 0),
                ask_qty=ce_data.get('ask_quantity', 0),
                open=ce_data.get('open', 0),
                high=ce_data.get('high', 0),
                low=ce_data.get('low', 0),
                prev_close=ce_data.get('close', 0),
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
                symbol=pe_data.get('instrument_key', ''),
                label=f"{strike} PE",
                strike=strike,
                option_type=OptionType.PE,
                ltp=pe_data.get('last_price', 0),
                bid=pe_data.get('bid_price', 0),
                ask=pe_data.get('ask_price', 0),
                bid_qty=pe_data.get('bid_quantity', 0),
                ask_qty=pe_data.get('ask_quantity', 0),
                open=pe_data.get('open', 0),
                high=pe_data.get('high', 0),
                low=pe_data.get('low', 0),
                prev_close=pe_data.get('close', 0),
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
            underlying_ltp=data.get('underlying_price', 0),
            underlying_prev_close=data.get('prev_close', 0),
            expiry_date=params.expiry_date,
            atm_strike=data.get('atm_strike', 0),
            chain=chain,
        )

    # ============================================
    # Underlying Quote
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote from Upstox."""
        try:
            if not self._connected:
                return self._empty_quote(underlying, exchange)

            url = f"{self.base_url}/market/quote/ltp"
            instrument_key = self._get_instrument_key(underlying, exchange)

            async with self.session.get(
                url,
                params={'instrument_key': instrument_key},
                headers=self._get_headers()
            ) as resp:
                data = await resp.json()

            quote_data = data.get('data', {}).get(instrument_key, {})
            return UnderlyingQuote(
                symbol=underlying,
                exchange=exchange,
                ltp=quote_data.get('last_price', 0),
                change=quote_data.get('change', 0),
                change_percent=quote_data.get('change_percent', 0),
                open=quote_data.get('open', 0),
                high=quote_data.get('high', 0),
                low=quote_data.get('low', 0),
                prev_close=quote_data.get('close', 0),
                volume=quote_data.get('volume', 0),
                timestamp=int(datetime.now().timestamp() * 1000),
            )
        except Exception as e:
            logger.error(f"Error fetching Upstox quote: {e}")
            return self._empty_quote(underlying, exchange)

    def _empty_quote(self, symbol: str, exchange: ExchangeType) -> UnderlyingQuote:
        return UnderlyingQuote(
            symbol=symbol, exchange=exchange, ltp=0, change=0, change_percent=0,
            open=0, high=0, low=0, prev_close=0, volume=0,
            timestamp=int(datetime.now().timestamp() * 1000)
        )

    # ============================================
    # Expiries
    # ============================================

    async def get_expiries(self, underlying: str, exchange: ExchangeType) -> list[ExpiryInfo]:
        """Get available expiry dates from Upstox."""
        try:
            url = f"{self.base_url}/market/option-chain/expiries"
            instrument_key = self._get_instrument_key(underlying, exchange)

            async with self.session.get(
                url,
                params={'instrument_key': instrument_key},
                headers=self._get_headers()
            ) as resp:
                data = await resp.json()

            expiries = []
            for exp in data.get('data', []):
                exp_dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
                days = (exp_dt - datetime.now()).days
                expiries.append(ExpiryInfo(
                    expiry_date=exp_dt.strftime('%Y-%m-%d'),
                    expiry_type='WEEKLY' if days <= 7 else 'MONTHLY',
                    days_to_expiry=days,
                    is_weekly=days <= 7
                ))
            return expiries
        except Exception as e:
            logger.error(f"Error fetching Upstox expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols."""
        try:
            url = f"{self.base_url}/market/instruments"
            params = {'exchange': exchange.value, 'search': query}

            async with self.session.get(url, params=params, headers=self._get_headers()) as resp:
                data = await resp.json()

            return data.get('data', [])
        except Exception as e:
            logger.error(f"Error searching Upstox symbols: {e}")
            return []

    # ============================================
    # Historical Data
    # ============================================

    async def get_historical_data(
        self,
        instrument_key: str,
        from_date: datetime,
        to_date: datetime,
        interval: str = "1minute"
    ) -> list[dict]:
        """Get historical candle data from Upstox."""
        try:
            url = f"{self.base_url}/market/historical-candles"
            params = {
                'instrument_key': instrument_key,
                'interval': interval,
                'from': from_date.strftime('%Y-%m-%d'),
                'to': to_date.strftime('%Y-%m-%d'),
            }

            async with self.session.get(url, params=params, headers=self._get_headers()) as resp:
                data = await resp.json()

            return data.get('data', [])
        except Exception as e:
            logger.error(f"Error fetching Upstox historical data: {e}")
            return []

    # ============================================
    # WebSocket
    # ============================================

    async def subscribe_market_data(self, instrument_keys: List[str]) -> asyncio.Queue:
        """Subscribe to real-time market data via WebSocket."""
        queue = asyncio.Queue()

        # Upstox WebSocket connection logic would go here
        # This is a placeholder for the actual implementation
        logger.info(f"Subscribing to {len(instrument_keys)} instruments")

        return queue