"""
Kite Connect (Zerodha) Data Provider
Official Zerodha Kite Connect API integration for market data.
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import aiohttp
from kiteconnect import KiteConnect

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


class KiteDataProvider(BaseDataProvider):
    """
    Kite Connect (Zerodha) Data Provider.

    Requires Kite Connect API subscription:
    - API Key and API Secret
    - Access token (generated via login flow)
    - Rate limits: 3 requests/second for quotes, 1/second for historical
    """

    BASE_URL = "https://api.kite.trade"
    WS_URL = "wss://ws.kite.trade"

    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        access_token: str = "",
        **config
    ):
        super().__init__(**config)
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.kite: Optional[KiteConnect] = None
        self.session: Optional[aiohttp.ClientSession] = None

    async def connect(self) -> bool:
        """Initialize Kite Connect client."""
        try:
            if not self.api_key or not self.api_secret:
                logger.error("Kite API key and secret required")
                return False

            self.kite = KiteConnect(api_key=self.api_key)

            if self.access_token:
                self.kite.set_access_token(self.access_token)
                # Validate token
                try:
                    self.kite.profile()
                    self._connected = True
                    logger.info("Kite Connect provider connected successfully")
                    return True
                except Exception:
                    logger.warning("Invalid access token, need to re-authenticate")
                    return False

            logger.info("Kite Connect initialized - access token required")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Kite: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Disconnect from Kite."""
        self.kite = None
        if self.session:
            await self.session.close()
        self._connected = False
        logger.info("Kite Connect provider disconnected")

    def _get_headers(self) -> Dict[str, str]:
        """Get authenticated headers."""
        return {
            'Authorization': f'token {self.api_key}:{self.access_token}',
            'Content-Type': 'application/json',
        } if self.access_token else {}

    def generate_login_url(self) -> str:
        """Generate Kite login URL for OAuth flow."""
        if self.kite:
            return self.kite.login_url()
        return ""

    def set_access_token(self, access_token: str) -> bool:
        """Set access token after OAuth callback."""
        try:
            self.access_token = access_token
            self.kite.set_access_token(access_token)
            # Validate
            self.kite.profile()
            self._connected = True
            return True
        except Exception as e:
            logger.error(f"Failed to set access token: {e}")
            return False

    def generate_session(self, request_token: str) -> Optional[str]:
        """Generate access token from request token (OAuth callback)."""
        try:
            data = self.kite.generate_session(request_token, api_secret=self.api_secret)
            self.access_token = data['access_token']
            self.kite.set_access_token(self.access_token)
            self._connected = True
            return self.access_token
        except Exception as e:
            logger.error(f"Failed to generate session: {e}")
            return None

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get option chain from Kite Connect."""
        try:
            if not self._connected:
                return OptionChainResponse(status='error', message='Not authenticated')

            # Get instruments for the underlying
            instruments = await self._get_instruments(params.underlying, params.exchange)

            # Filter for options with given expiry
            option_instruments = [
                inst for inst in instruments
                if inst['segment'] in ['NFO-OPT', 'BFO-OPT']
                and inst['expiry'] == params.expiry_date
                and inst['name'] == params.underlying
            ]

            if not option_instruments:
                return OptionChainResponse(status='error', message='No instruments found')

            # Get quotes for all instruments
            instrument_tokens = [str(inst['instrument_token']) for inst in option_instruments]
            quotes = self.kite.quote(instrument_tokens)

            return self._parse_option_chain(quotes, option_instruments, params)
        except Exception as e:
            logger.error(f"Error fetching Kite option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    async def _get_instruments(self, underlying: str, exchange: ExchangeType) -> List[dict]:
        """Get instruments list from Kite."""
        try:
            segment = 'NFO' if exchange == ExchangeType.NSE else 'BFO'
            instruments = self.kite.instruments(segment)
            return [inst for inst in instruments if inst['name'] == underlying]
        except Exception as e:
            logger.error(f"Error fetching instruments: {e}")
            return []

    def _parse_option_chain(self, quotes: dict, instruments: List[dict], params: OptionChainParams) -> OptionChainResponse:
        """Parse Kite quotes into option chain format."""
        # Build instrument lookup
        inst_by_token = {str(inst['instrument_token']): inst for inst in instruments}
        inst_by_strike = {}
        for inst in instruments:
            strike = inst['strike']
            if strike not in inst_by_strike:
                inst_by_strike[strike] = {'CE': None, 'PE': None}
            if inst['instrument_type'] == 'CE':
                inst_by_strike[strike]['CE'] = inst
            elif inst['instrument_type'] == 'PE':
                inst_by_strike[strike]['PE'] = inst

        chain = []
        underlying_ltp = 0
        atm_strike = 0

        for strike in sorted(inst_by_strike.keys()):
            ce_inst = inst_by_strike[strike]['CE']
            pe_inst = inst_by_strike[strike]['PE']

            ce_quote = quotes.get(str(ce_inst['instrument_token'])) if ce_inst else None
            pe_quote = quotes.get(str(pe_inst['instrument_token'])) if pe_inst else None

            # Get underlying LTP from futures or first option
            if not underlying_ltp and ce_quote:
                underlying_ltp = ce_quote.get('last_price', 0)

            ce = self._parse_option_quote(ce_quote, ce_inst, OptionType.CE, params.underlying) if ce_quote and ce_inst else None
            pe = self._parse_option_quote(pe_quote, pe_inst, OptionType.PE, params.underlying) if pe_quote and pe_inst else None

            if ce:
                ce.expiry_date = params.expiry_date
                ce.exchange = ExchangeType(params.exchange)
                ce.underlying = params.underlying
            if pe:
                pe.expiry_date = params.expiry_date
                pe.exchange = ExchangeType(params.exchange)
                pe.underlying = params.underlying

            chain.append(OptionStrike(strike=strike, ce=ce, pe=pe))

        # Calculate ATM strike
        if underlying_ltp:
            atm_strike = min(inst_by_strike.keys(), key=lambda x: abs(x - underlying_ltp))

        return OptionChainResponse(
            status='success',
            underlying=params.underlying,
            underlying_symbol=params.underlying,
            underlying_exchange=ExchangeType(params.exchange),
            underlying_ltp=underlying_ltp,
            underlying_prev_close=0,  # Not directly available
            expiry_date=params.expiry_date,
            atm_strike=atm_strike,
            chain=chain,
        )

    def _parse_option_quote(self, quote: dict, instrument: dict, opt_type: OptionType, underlying: str) -> OptionData:
        """Parse Kite quote into OptionData."""
        depth = quote.get('depth', {})
        buy = depth.get('buy', [{}])[0] if depth.get('buy') else {}
        sell = depth.get('sell', [{}])[0] if depth.get('sell') else {}

        return OptionData(
            symbol=instrument.get('tradingsymbol', ''),
            label=f"{instrument['strike']} {opt_type.value}",
            strike=instrument['strike'],
            option_type=opt_type,
            ltp=quote.get('last_price', 0),
            bid=buy.get('price', 0),
            ask=sell.get('price', 0),
            bid_qty=buy.get('quantity', 0),
            ask_qty=sell.get('quantity', 0),
            open=quote.get('ohlc', {}).get('open', 0),
            high=quote.get('ohlc', {}).get('high', 0),
            low=quote.get('ohlc', {}).get('low', 0),
            prev_close=quote.get('ohlc', {}).get('close', 0),
            volume=quote.get('volume', 0),
            oi=quote.get('oi', 0),
            oi_change=0,  # Not directly available
            lot_size=instrument.get('lot_size', 50),
            tick_size=instrument.get('tick_size', 0.05),
            implied_volatility=None,  # Not provided by Kite
            greeks=None,  # Not provided by Kite
            expiry_date='',
            exchange=ExchangeType.NSE,
            underlying=underlying,
        )

    # ============================================
    # Underlying Quote
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get underlying spot quote from Kite."""
        try:
            if not self._connected:
                return self._empty_quote(underlying, exchange)

            # Get futures instrument for underlying
            instruments = await self._get_instruments(underlying, exchange)
            futures = [inst for inst in instruments if inst['instrument_type'] == 'FUT']

            if futures:
                # Use nearest expiry future
                future = min(futures, key=lambda x: x['expiry'])
                quote = self.kite.quote(str(future['instrument_token']))
                q = quote.get(str(future['instrument_token']), {})

                return UnderlyingQuote(
                    symbol=underlying,
                    exchange=exchange,
                    ltp=q.get('last_price', 0),
                    change=q.get('change', 0),
                    change_percent=0,
                    open=q.get('ohlc', {}).get('open', 0),
                    high=q.get('ohlc', {}).get('high', 0),
                    low=q.get('ohlc', {}).get('low', 0),
                    prev_close=q.get('ohlc', {}).get('close', 0),
                    volume=q.get('volume', 0),
                    timestamp=int(datetime.now().timestamp() * 1000),
                )

            return self._empty_quote(underlying, exchange)
        except Exception as e:
            logger.error(f"Error fetching Kite quote: {e}")
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
        """Get available expiry dates from Kite instruments."""
        try:
            instruments = await self._get_instruments(underlying, exchange)
            expiries = set()

            for inst in instruments:
                if inst['segment'] in ['NFO-OPT', 'BFO-OPT']:
                    expiries.add(inst['expiry'])

            result = []
            for exp in sorted(expiries):
                exp_dt = datetime.strptime(str(exp), '%Y-%m-%d')
                days = (exp_dt - datetime.now()).days
                result.append(ExpiryInfo(
                    expiry_date=exp_dt.strftime('%Y-%m-%d'),
                    expiry_type='WEEKLY' if days <= 7 else 'MONTHLY',
                    days_to_expiry=days,
                    is_weekly=days <= 7
                ))
            return result
        except Exception as e:
            logger.error(f"Error fetching Kite expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for trading symbols in Kite instruments."""
        try:
            instruments = await self._get_instruments('', exchange)
            results = []
            query_lower = query.lower()

            for inst in instruments:
                if query_lower in inst['tradingsymbol'].lower() or query_lower in inst['name'].lower():
                    results.append({
                        'symbol': inst['tradingsymbol'],
                        'name': inst['name'],
                        'exchange': inst['exchange'],
                        'instrument_type': inst['instrument_type'],
                        'segment': inst['segment'],
                    })
                    if len(results) >= 20:
                        break

            return results
        except Exception as e:
            logger.error(f"Error searching Kite symbols: {e}")
            return []

    # ============================================
    # Historical Data
    # ============================================

    async def get_historical_data(
        self,
        instrument_token: int,
        from_date: datetime,
        to_date: datetime,
        interval: str = "minute"
    ) -> list[dict]:
        """Get historical candle data from Kite."""
        try:
            data = self.kite.historical_data(
                instrument_token=instrument_token,
                from_date=from_date,
                to_date=to_date,
                interval=interval
            )
            return data
        except Exception as e:
            logger.error(f"Error fetching Kite historical data: {e}")
            return []

    # ============================================
    # WebSocket (Ticker)
    # ============================================

    def get_ticker(self):
        """Get Kite ticker for real-time data."""
        if self.kite and self._connected:
            return self.kite.ticker()
        return None