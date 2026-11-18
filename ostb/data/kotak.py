"""
Kotak Neo Data Provider
Kotak Securities Neo API integration for market data.
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


class KotakNeoDataProvider(BaseDataProvider):
    """
    Kotak Securities Neo Data Provider.

    Requires Kotak Neo API subscription:
    - Consumer Key and Consumer Secret
    - Access Token (OAuth 2.0)
    - Rate limits apply
    """

    BASE_URL = "https://neoapi.kotaksecurities.com"
    WS_URL = "wss://neoapi.kotaksecurities.com"

    def __init__(
        self,
        consumer_key: str = "",
        consumer_secret: str = "",
        access_token: str = "",
        **config
    ):
        super().__init__(**config)
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.access_token = access_token
        self.session: Optional[aiohttp.ClientSession] = None
        self.sid: Optional[str] = None  # Session ID
        self.auth_token: Optional[str] = None

    async def connect(self) -> bool:
        """Initialize Kotak Neo API client."""
        try:
            if not self.consumer_key or not self.consumer_secret:
                logger.error("Kotak Neo consumer key and secret required")
                return False

            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)

            if self.access_token:
                # Authenticate and get session
                if await self._authenticate():
                    self._connected = True
                    logger.info("Kotak Neo provider connected successfully")
                    return True

            logger.info("Kotak Neo initialized - authentication required")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Kotak Neo: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Close session and logout."""
        if self.sid:
            await self._logout()
        if self.session:
            await self.session.close()
            self.session = None
        self._connected = False
        self.sid = None
        self.auth_token = None
        logger.info("Kotak Neo provider disconnected")

    def _get_headers(self, include_sid: bool = True) -> Dict[str, str]:
        """Get authenticated headers."""
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if include_sid and self.sid:
            headers['Sid'] = self.sid
        return headers

    async def _authenticate(self) -> bool:
        """Authenticate with Kotak Neo API."""
        try:
            # Step 1: Generate auth token
            auth_url = f"{self.BASE_URL}/auth/token"
            payload = {
                'consumerKey': self.consumer_key,
                'consumerSecret': self.consumer_secret,
            }

            async with self.session.post(auth_url, json=payload) as resp:
                if resp.status != 200:
                    return False
                auth_data = await resp.json()
                self.auth_token = auth_data.get('token') or auth_data.get('accessToken')

            # Step 2: Generate session (Sid)
            session_url = f"{self.BASE_URL}/auth/session"
            session_payload = {
                'token': self.auth_token,
            }
            headers = {'Authorization': f'Bearer {self.auth_token}', 'Content-Type': 'application/json'}

            async with self.session.post(session_url, json=session_payload, headers=headers) as resp:
                if resp.status != 200:
                    return False
                session_data = await resp.json()
                self.sid = session_data.get('sid') or session_data.get('data', {}).get('sid')

            return bool(self.sid)
        except Exception as e:
            logger.error(f"Kotak Neo authentication failed: {e}")
            return False

    async def _logout(self) -> None:
        """Logout and invalidate session."""
        try:
            url = f"{self.BASE_URL}/auth/logout"
            async with self.session.post(url, headers=self._get_headers()) as resp:
                pass
        except Exception:
            pass

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain from Kotak Neo."""
        try:
            if not self._connected:
                return OptionChainResponse(status='error', message='Not authenticated')

            url = f"{self.BASE_URL}/market/option-chain"
            payload = {
                'symbol': params.underlying,
                'exchange': params.exchange.value,
                'expiry': params.expiry_date,
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
            logger.error(f"Error fetching Kotak Neo option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    def _parse_option_chain(self, data: dict, params: OptionChainParams) -> OptionChainResponse:
        """Parse Kotak Neo option chain response."""
        # Kotak Neo returns option chain in their format
        chain_data = data.get('data', {}).get('optionChain', [])
        underlying = params.underlying

        chain = []
        for item in chain_data:
            strike = item.get('strikePrice', 0)

            ce_data = item.get('callOption', {})
            pe_data = item.get('putOption', {})

            ce = OptionData(
                symbol=ce_data.get('symbol', ''),
                label=f"{strike} CE",
                strike=strike,
                option_type=OptionType.CE,
                ltp=ce_data.get('lastPrice', 0),
                bid=ce_data.get('bidPrice', 0),
                ask=ce_data.get('askPrice', 0),
                bid_qty=ce_data.get('bidQty', 0),
                ask_qty=ce_data.get('askQty', 0),
                open=ce_data.get('open', 0),
                high=ce_data.get('high', 0),
                low=ce_data.get('low', 0),
                prev_close=ce_data.get('prevClose', 0),
                volume=ce_data.get('volume', 0),
                oi=ce_data.get('oi', 0),
                oi_change=ce_data.get('oiChange', 0),
                lot_size=ce_data.get('lotSize', 50),
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
                ltp=pe_data.get('lastPrice', 0),
                bid=pe_data.get('bidPrice', 0),
                ask=pe_data.get('askPrice', 0),
                bid_qty=pe_data.get('bidQty', 0),
                ask_qty=pe_data.get('askQty', 0),
                open=pe_data.get('open', 0),
                high=pe_data.get('high', 0),
                low=pe_data.get('low', 0),
                prev_close=pe_data.get('prevClose', 0),
                volume=pe_data.get('volume', 0),
                oi=pe_data.get('oi', 0),
                oi_change=pe_data.get('oiChange', 0),
                lot_size=pe_data.get('lotSize', 50),
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
            underlying_ltp=data.get('data', {}).get('underlyingPrice', 0),
            underlying_prev_close=data.get('data', {}).get('prevClose', 0),
            expiry_date=params.expiry_date,
            atm_strike=data.get('data', {}).get('atmStrike', 0),
            chain=chain,
        )

    # ============================================
    # Underlying Quote
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote from Kotak Neo."""
        try:
            if not self._connected:
                return self._empty_quote(underlying, exchange)

            url = f"{self.BASE_URL}/market/quote"
            payload = {
                'symbol': underlying,
                'exchange': exchange.value,
            }

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            quote_data = data.get('data', {})
            return UnderlyingQuote(
                symbol=underlying,
                exchange=exchange,
                ltp=quote_data.get('lastPrice', 0),
                change=quote_data.get('change', 0),
                change_percent=quote_data.get('changePercent', 0),
                open=quote_data.get('open', 0),
                high=quote_data.get('high', 0),
                low=quote_data.get('low', 0),
                prev_close=quote_data.get('prevClose', 0),
                volume=quote_data.get('volume', 0),
                timestamp=int(datetime.now().timestamp() * 1000),
            )
        except Exception as e:
            logger.error(f"Error fetching Kotak Neo quote: {e}")
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
        """Get available expiry dates from Kotak Neo."""
        try:
            url = f"{self.BASE_URL}/market/expiries"
            payload = {
                'symbol': underlying,
                'exchange': exchange.value,
            }

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            expiries = []
            for exp in data.get('data', {}).get('expiries', []):
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
            logger.error(f"Error fetching Kotak Neo expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols."""
        try:
            url = f"{self.BASE_URL}/market/search"
            payload = {
                'query': query,
                'exchange': exchange.value,
            }

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            return data.get('data', [])
        except Exception as e:
            logger.error(f"Error searching Kotak Neo symbols: {e}")
            return []

    # ============================================
    # Historical Data
    # ============================================

    async def get_historical_data(
        self,
        symbol: str,
        exchange: ExchangeType,
        from_date: datetime,
        to_date: datetime,
        interval: str = "1m"
    ) -> list[dict]:
        """Get historical candle data from Kotak Neo."""
        try:
            url = f"{self.BASE_URL}/market/history"
            payload = {
                'symbol': symbol,
                'exchange': exchange.value,
                'from': from_date.strftime('%Y-%m-%d'),
                'to': to_date.strftime('%Y-%m-%d'),
                'interval': interval,
            }

            async with self.session.post(url, json=payload, headers=self._get_headers()) as resp:
                data = await resp.json()

            return data.get('data', [])
        except Exception as e:
            logger.error(f"Error fetching Kotak Neo historical data: {e}")
            return []

    # ============================================
    # WebSocket
    # ============================================

    async def subscribe_market_data(self, symbols: List[str]) -> asyncio.Queue:
        """Subscribe to real-time market data via WebSocket."""
        queue = asyncio.Queue()

        # Kotak Neo WebSocket connection logic would go here
        logger.info(f"Subscribing to {len(symbols)} instruments")

        return queue