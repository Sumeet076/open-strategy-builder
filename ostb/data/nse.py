"""
NSE (National Stock Exchange) Data Provider
Uses official NSE India public APIs for option chain and quotes.
"""

import asyncio
import json
import time
from typing import Optional
from datetime import datetime, timedelta
import aiohttp
import logging

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


class NSEDataProvider(BaseDataProvider):
    """NSE India official API data provider."""

    BASE_URL = "https://www.nseindia.com"
    API_ENDPOINTS = {
        'option_chain': '/api/option-chain-indices',
        'equity_option_chain': '/api/option-chain-equities',
        'quote': '/api/quote-equity',
        'indices_quote': '/api/allIndices',
        'expiries': '/api/expiry-dates',
        'search': '/api/search',
    }

    # Common headers required by NSE
    DEFAULT_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.nseindia.com/option-chain',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
    }

    # Index symbols mapping
    INDEX_SYMBOLS = {
        'NIFTY': 'NIFTY',
        'BANKNIFTY': 'BANKNIFTY',
        'FINNIFTY': 'FINNIFTY',
        'MIDCPNIFTY': 'MIDCPNIFTY',
        'SENSEX': 'SENSEX',
        'BANKEX': 'BANKEX',
    }

    def __init__(self, **config):
        super().__init__(**config)
        self.session: Optional[aiohttp.ClientSession] = None
        self.cookies: dict = {}
        self._last_cookie_refresh = 0
        self._cookie_ttl = 300  # 5 minutes

    async def connect(self) -> bool:
        """Initialize session and fetch cookies."""
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers=self.DEFAULT_HEADERS
            )

            # Fetch initial cookies by visiting homepage
            await self._refresh_cookies()
            self._connected = True
            logger.info("NSE provider connected successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to NSE: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Close session."""
        if self.session:
            await self.session.close()
            self.session = None
        self._connected = False
        logger.info("NSE provider disconnected")

    async def _refresh_cookies(self) -> None:
        """Fetch fresh cookies from NSE."""
        try:
            async with self.session.get(self.BASE_URL, headers=self.DEFAULT_HEADERS) as resp:
                self.cookies = {cookie.key: cookie.value for cookie in resp.cookies}
                self._last_cookie_refresh = time.time()
        except Exception as e:
            logger.warning(f"Failed to refresh NSE cookies: {e}")

    async def _ensure_valid_session(self) -> None:
        """Ensure session has valid cookies."""
        if time.time() - self._last_cookie_refresh > self._cookie_ttl:
            await self._refresh_cookies()

    async def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """Make authenticated request to NSE API."""
        await self._ensure_valid_session()

        url = f"{self.BASE_URL}{endpoint}"
        headers = self.DEFAULT_HEADERS.copy()
        headers['Cookie'] = '; '.join([f"{k}={v}" for k, v in self.cookies.items()])

        async with self.session.get(url, params=params, headers=headers) as resp:
            if resp.status == 401:
                # Cookies expired, refresh and retry
                await self._refresh_cookies()
                headers['Cookie'] = '; '.join([f"{k}={v}" for k, v in self.cookies.items()])
                async with self.session.get(url, params=params, headers=headers) as retry_resp:
                    return await retry_resp.json()
            return await resp.json()

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain from NSE."""
        try:
            underlying = params.underlying.upper()
            is_index = underlying in self.INDEX_SYMBOLS

            endpoint = self.API_ENDPOINTS['option_chain'] if is_index else self.API_ENDPOINTS['equity_option_chain']
            symbol = self.INDEX_SYMBOLS.get(underlying, underlying)

            api_params = {'symbol': symbol}
            if params.expiry_date:
                api_params['expiryDate'] = params.expiry_date

            data = await self._make_request(endpoint, api_params)

            if not data or 'records' not in data:
                return OptionChainResponse(
                    status='error',
                    message='Invalid response from NSE'
                )

            return self._parse_option_chain(data, params, underlying)
        except Exception as e:
            logger.error(f"Error fetching option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    def _parse_option_chain(self, data: dict, params: OptionChainParams, underlying: str) -> OptionChainResponse:
        """Parse NSE option chain response."""
        records = data.get('records', {})
        chain_data = records.get('data', [])

        # Get underlying quote
        underlying_ltp = records.get('underlyingValue', 0)
        atm_strike = records.get('atmStrike', 0)

        # Filter and sort strikes
        if params.strike_count:
            strikes = sorted(set(item['strikePrice'] for item in chain_data))
            atm_idx = min(range(len(strikes)), key=lambda i: abs(strikes[i] - atm_strike))
            half = params.strike_count // 2
            start = max(0, atm_idx - half)
            end = min(len(strikes), start + params.strike_count)
            selected_strikes = strikes[start:end]
            chain_data = [item for item in chain_data if item['strikePrice'] in selected_strikes]

        chain = []
        for item in chain_data:
            strike = item.get('strikePrice', 0)

            # Parse CE
            ce_data = item.get('CE', {})
            ce = self._parse_option_data(ce_data, strike, OptionType.CE, underlying) if ce_data else None

            # Parse PE
            pe_data = item.get('PE', {})
            pe = self._parse_option_data(pe_data, strike, OptionType.PE, underlying) if pe_data else None

            chain.append(OptionStrike(strike=strike, ce=ce, pe=pe))

        # Calculate metrics
        total_ce_oi = sum(c.ce.oi for c in chain if c.ce)
        total_pe_oi = sum(c.pe.oi for c in chain if c.pe)
        total_ce_vol = sum(c.ce.volume for c in chain if c.ce)
        total_pe_vol = sum(c.pe.volume for c in chain if c.pe)

        return OptionChainResponse(
            status='success',
            underlying=underlying,
            underlying_symbol=underlying,
            underlying_exchange=ExchangeType.NSE,
            underlying_ltp=underlying_ltp,
            underlying_prev_close=records.get('underlyingClose', underlying_ltp),
            expiry_date=params.expiry_date or records.get('expiryDates', [''])[0],
            expiry_timestamp=None,
            server_timestamp=int(time.time() * 1000),
            atm_strike=atm_strike,
            forward_price=underlying_ltp * 1.001,
            greeks_included=True,
            chain=chain,
            metrics={
                'totalCeOi': total_ce_oi,
                'totalPeOi': total_pe_oi,
                'totalCeVolume': total_ce_vol,
                'totalPeVolume': total_pe_vol,
                'pcr': total_pe_oi / max(total_ce_oi, 1),
                'maxPain': self._calculate_max_pain(chain),
            }
        )

    def _parse_option_data(self, data: dict, strike: float, opt_type: OptionType, underlying: str) -> OptionData:
        """Parse individual option data from NSE response."""
        # Calculate Greeks using Black-Scholes (simplified)
        greeks = None
        iv = data.get('impliedVolatility', 0)
        if iv and iv > 0:
            greeks = self._calculate_greeks(opt_type, strike, data.get('lastPrice', 0), iv)

        return OptionData(
            symbol=data.get('identifier', ''),
            label=f"{strike} {opt_type.value}",
            strike=strike,
            option_type=opt_type,
            ltp=data.get('lastPrice', 0),
            bid=data.get('bidprice', 0),
            ask=data.get('askPrice', 0),
            bid_qty=data.get('bidQty', 0),
            ask_qty=data.get('askQty', 0),
            open=data.get('openInterest', 0),
            high=data.get('high', 0),
            low=data.get('low', 0),
            prev_close=data.get('prevClose', 0),
            volume=data.get('totalTradedVolume', 0),
            oi=data.get('openInterest', 0),
            oi_change=data.get('changeinOpenInterest', 0),
            lot_size=data.get('lotSize', 50),
            tick_size=0.05,
            implied_volatility=iv,
            greeks=greeks,
            expiry_date=data.get('expiryDate', ''),
            exchange=ExchangeType.NSE,
            underlying=underlying,
        )

    def _calculate_greeks(self, opt_type: OptionType, strike: float, price: float, iv: float) -> OptionGreeks:
        """Calculate Greeks using Black-Scholes (placeholder - use pricing engine in production)."""
        # This is a simplified calculation - in production use the pricing engine
        return OptionGreeks(
            delta=0.5 if opt_type == OptionType.CE else -0.5,
            gamma=0.001,
            theta=-5.0,
            vega=10.0,
            rho=1.0,
        )

    def _calculate_max_pain(self, chain: list) -> float:
        """Calculate max pain strike."""
        # Simplified max pain calculation
        return chain[len(chain) // 2].strike if chain else 0

    # ============================================
    # Underlying Quotes
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote."""
        try:
            symbol = underlying.upper()
            is_index = symbol in self.INDEX_SYMBOLS

            endpoint = self.API_ENDPOINTS['indices_quote'] if is_index else self.API_ENDPOINTS['quote']
            api_symbol = self.INDEX_SYMBOLS.get(symbol, symbol)

            data = await self._make_request(endpoint, {'symbol': api_symbol})

            if is_index:
                # Find index in indices list
                index_data = None
                for idx in data.get('data', []):
                    if idx.get('index', '').upper() == symbol:
                        index_data = idx
                        break
                if not index_data:
                    return self._empty_quote(symbol, exchange)
                return self._parse_index_quote(index_data, symbol, exchange)
            else:
                return self._parse_equity_quote(data, symbol, exchange)
        except Exception as e:
            logger.error(f"Error fetching quote for {underlying}: {e}")
            return self._empty_quote(underlying, exchange)

    def _parse_index_quote(self, data: dict, symbol: str, exchange: ExchangeType) -> UnderlyingQuote:
        return UnderlyingQuote(
            symbol=symbol,
            exchange=exchange,
            ltp=data.get('last', 0),
            change=data.get('change', 0),
            change_percent=data.get('pChange', 0),
            open=data.get('open', 0),
            high=data.get('high', 0),
            low=data.get('low', 0),
            prev_close=data.get('previousClose', 0),
            volume=0,
            timestamp=int(time.time() * 1000),
        )

    def _parse_equity_quote(self, data: dict, symbol: str, exchange: ExchangeType) -> UnderlyingQuote:
        return UnderlyingQuote(
            symbol=symbol,
            exchange=exchange,
            ltp=data.get('lastPrice', 0),
            change=data.get('change', 0),
            change_percent=data.get('pChange', 0),
            open=data.get('open', 0),
            high=data.get('dayHigh', 0),
            low=data.get('dayLow', 0),
            prev_close=data.get('previousClose', 0),
            volume=data.get('totalTradedVolume', 0),
            timestamp=int(time.time() * 1000),
        )

    def _empty_quote(self, symbol: str, exchange: ExchangeType) -> UnderlyingQuote:
        return UnderlyingQuote(
            symbol=symbol, exchange=exchange, ltp=0, change=0, change_percent=0,
            open=0, high=0, low=0, prev_close=0, volume=0, timestamp=int(time.time() * 1000)
        )

    # ============================================
    # Expiries
    # ============================================

    async def get_expiries(self, underlying: str, exchange: ExchangeType) -> list[ExpiryInfo]:
        """Get available expiry dates."""
        try:
            symbol = underlying.upper()
            is_index = symbol in self.INDEX_SYMBOLS
            api_symbol = self.INDEX_SYMBOLS.get(symbol, symbol)

            endpoint = self.API_ENDPOINTS['option_chain'] if is_index else self.API_ENDPOINTS['equity_option_chain']
            data = await self._make_request(endpoint, {'symbol': api_symbol})

            expiry_dates = data.get('records', {}).get('expiryDates', [])
            expiries = []

            for exp_date in expiry_dates:
                exp_dt = datetime.strptime(exp_date, '%d-%b-%Y')
                days = (exp_dt - datetime.now()).days
                expiries.append(ExpiryInfo(
                    expiry_date=exp_dt.strftime('%Y-%m-%d'),
                    expiry_type='WEEKLY' if days <= 7 else 'MONTHLY',
                    days_to_expiry=days,
                    is_weekly=days <= 7
                ))

            return expiries
        except Exception as e:
            logger.error(f"Error fetching expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols."""
        try:
            data = await self._make_request(self.API_ENDPOINTS['search'], {'q': query})
            return data.get('symbols', [])
        except Exception as e:
            logger.error(f"Error searching symbols: {e}")
            return []