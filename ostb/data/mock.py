"""
Mock Data Provider for Development and Testing
Returns realistic mock option chain and quote data.
"""

import asyncio
import logging
import random
import numpy as np
from typing import Optional, List
from datetime import datetime, timedelta

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


class MockDataProvider(BaseDataProvider):
    """
    Mock data provider for development and testing.
    Returns realistic mock option chain and quote data.
    """

    # Base prices for common underlyings
    BASE_PRICES = {
        'NIFTY': 22000,
        'BANKNIFTY': 48000,
        'FINNIFTY': 21000,
        'MIDCPNIFTY': 12000,
        'SENSEX': 73000,
        'BANKEX': 50000,
    }

    def __init__(self, **config):
        super().__init__(**config)
        self._price_cache = {}

    async def connect(self) -> bool:
        """Initialize mock provider."""
        self._connected = True
        logger.info("Mock data provider connected successfully")
        return True

    async def disconnect(self) -> None:
        """Disconnect mock provider."""
        self._connected = False
        logger.info("Mock data provider disconnected")

    def _get_base_price(self, underlying: str) -> float:
        """Get base price for underlying, with some randomness."""
        base = self.BASE_PRICES.get(underlying.upper(), 1000)
        # Add small random variation
        return base + random.uniform(-50, 50)

    def _generate_greeks(self, opt_type: OptionType, strike: float, spot: float, iv: float) -> OptionGreeks:
        """Generate realistic Greeks using simplified Black-Scholes."""
        from math import log, sqrt, exp
        from scipy.stats import norm

        # Simplified Black-Scholes Greeks
        S = spot
        K = strike
        T = 30 / 365  # 30 days to expiry
        r = 0.07
        sigma = iv

        d1 = (log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt(T))
        d2 = d1 - sigma * sqrt(T)

        if opt_type == OptionType.CE:
            delta = norm.cdf(d1)
            theta = (-S * norm.pdf(d1) * sigma / (2 * sqrt(T)) - r * K * exp(-r * T) * norm.cdf(d2)) / 365
        else:
            delta = norm.cdf(d1) - 1
            theta = (-S * norm.pdf(d1) * sigma / (2 * sqrt(T)) + r * K * exp(-r * T) * norm.cdf(-d2)) / 365

        gamma = norm.pdf(d1) / (S * sigma * sqrt(T))
        vega = S * norm.pdf(d1) * sqrt(T) * 0.01  # per 1% vol
        rho = K * T * exp(-r * T) * (norm.cdf(d2) if opt_type == OptionType.CE else -norm.cdf(-d2)) * 0.01

        return OptionGreeks(
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            rho=rho,
        )

    def _generate_mock_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Generate mock option chain."""
        underlying = params.underlying.upper()
        base_price = self._get_base_price(underlying)

        # Calculate ATM strike
        strike_interval = 50 if 'NIFTY' in underlying else 100
        atm_strike = round(base_price / strike_interval) * strike_interval

        # Generate strikes around ATM
        strikes = [atm_strike + (i - params.strike_count // 2) * strike_interval for i in range(params.strike_count)]

        chain = []
        for strike in strikes:
            # Generate IV with smile/skew
            moneyness = strike / base_price
            if moneyness < 0.95:
                iv = 0.20 + 0.05 * (0.95 - moneyness) * 20
            elif moneyness > 1.05:
                iv = 0.20 + 0.05 * (moneyness - 1.05) * 20
            else:
                iv = 0.18 + random.uniform(-0.02, 0.02)

            # CE
            ce_iv = iv + random.uniform(-0.01, 0.01)
            ce_greeks = self._generate_greeks(OptionType.CE, strike, self._get_base_price(params.underlying), ce_iv)
            ce_price = max(base_price - strike, 0) + random.uniform(10, 200)

            ce = OptionData(
                symbol=f"{params.underlying}{params.expiry_date[:7]}{strike}CE",
                label=f"{strike} CE",
                strike=strike,
                option_type=OptionType.CE,
                ltp=round(ce_price, 2),
                bid=round(ce_price - 0.5, 2),
                ask=round(ce_price + 0.5, 2),
                bid_qty=random.randint(100, 5000),
                ask_qty=random.randint(100, 5000),
                open=round(ce_price * random.uniform(0.9, 1.1), 2),
                high=round(ce_price * random.uniform(1.0, 1.2), 2),
                low=round(ce_price * random.uniform(0.8, 1.0), 2),
                prev_close=round(ce_price * random.uniform(0.95, 1.05), 2),
                volume=random.randint(1000, 100000),
                oi=random.randint(10000, 500000),
                oi_change=random.randint(-50000, 50000),
                lot_size=50 if 'NIFTY' in params.underlying else 15,
                tick_size=0.05,
                implied_volatility=round(ce_iv, 4),
                greeks=ce_greeks,
                expiry_date=params.expiry_date,
                exchange=params.exchange,
                underlying=params.underlying,
            )

            # PE
            pe_iv = iv + random.uniform(-0.01, 0.01)
            pe_greeks = self._generate_greeks(OptionType.PE, strike, self._get_base_price(params.underlying), pe_iv)
            pe_price = max(strike - base_price, 0) + random.uniform(10, 200)

            pe = OptionData(
                symbol=f"{params.underlying}{params.expiry_date[:7]}{strike}PE",
                label=f"{strike} PE",
                strike=strike,
                option_type=OptionType.PE,
                ltp=round(pe_price, 2),
                bid=round(pe_price - 0.5, 2),
                ask=round(pe_price + 0.5, 2),
                bid_qty=random.randint(100, 5000),
                ask_qty=random.randint(100, 5000),
                open=round(pe_price * random.uniform(0.9, 1.1), 2),
                high=round(pe_price * random.uniform(1.0, 1.2), 2),
                low=round(pe_price * random.uniform(0.8, 1.0), 2),
                prev_close=round(pe_price * random.uniform(0.95, 1.05), 2),
                volume=random.randint(1000, 100000),
                oi=random.randint(10000, 500000),
                oi_change=random.randint(-50000, 50000),
                lot_size=50 if 'NIFTY' in params.underlying else 15,
                tick_size=0.05,
                implied_volatility=round(pe_iv, 4),
                greeks=pe_greeks,
                expiry_date=params.expiry_date,
                exchange=params.exchange,
                underlying=params.underlying,
            )

            chain.append(OptionStrike(strike=strike, ce=ce, pe=pe))

        # Calculate metrics
        total_ce_oi = sum(c.ce.oi for c in chain if c.ce)
        total_pe_oi = sum(c.pe.oi for c in chain if c.pe)
        total_ce_vol = sum(c.ce.volume for c in chain if c.ce)
        total_pe_vol = sum(c.pe.volume for c in chain if c.pe)

        # Find ATM strike
        atm_strike_val = min((c.strike for c in chain), key=lambda x: abs(x - self._get_base_price(params.underlying)))

        return OptionChainResponse(
            status='success',
            underlying=params.underlying,
            underlying_symbol=params.underlying,
            underlying_exchange=params.exchange,
            underlying_ltp=self._get_base_price(params.underlying),
            underlying_prev_close=self._get_base_price(params.underlying) * 0.99,
            expiry_date=params.expiry_date,
            expiry_timestamp=int((datetime.now() + timedelta(days=7)).timestamp()),
            server_timestamp=int(datetime.now().timestamp() * 1000),
            atm_strike=atm_strike_val,
            forward_price=self._get_base_price(params.underlying) * 1.001,
            greeks_included=True,
            chain=chain,
            metrics={
                'totalCeOi': total_ce_oi,
                'totalPeOi': total_pe_oi,
                'totalCeVolume': total_ce_vol,
                'totalPeVolume': total_pe_vol,
                'pcr': total_pe_oi / max(total_ce_oi, 1),
                'maxPain': atm_strike_val,
            }
        )

    # ============================================
    # Option Chain
    # ============================================

    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        """Get mock option chain."""
        try:
            return self._generate_mock_option_chain(params)
        except Exception as e:
            logger.error(f"Error generating mock option chain: {e}")
            return OptionChainResponse(status='error', message=str(e))

    # ============================================
    # Underlying Quote
    # ============================================

    async def get_underlying_quote(self, underlying: str, exchange: ExchangeType) -> UnderlyingQuote:
        """Get mock underlying quote."""
        try:
            base_price = self._get_base_price(underlying)
            return UnderlyingQuote(
                symbol=underlying,
                exchange=exchange,
                ltp=base_price + random.uniform(-50, 50),
                change=random.uniform(-100, 100),
                change_percent=random.uniform(-2, 2),
                open=base_price + random.uniform(-50, 50),
                high=base_price + random.uniform(0, 100),
                low=base_price - random.uniform(0, 100),
                prev_close=base_price,
                volume=random.randint(100000, 1000000),
                timestamp=int(datetime.now().timestamp() * 1000),
            )
        except Exception as e:
            logger.error(f"Error generating mock quote: {e}")
            return UnderlyingQuote(
                symbol=underlying, exchange=exchange, ltp=0, change=0, change_percent=0,
                open=0, high=0, low=0, prev_close=0, volume=0,
                timestamp=int(datetime.now().timestamp() * 1000)
            )

    # ============================================
    # Expiries
    # ============================================

    async def get_expiries(self, underlying: str, exchange: ExchangeType) -> list[ExpiryInfo]:
        """Get mock expiry dates."""
        try:
            expiries = []
            today = datetime.now()
            for i in range(12):
                # Next Thursday
                days_ahead = (3 - today.weekday()) % 7  # Thursday = 3
                if days_ahead == 0:
                    days_ahead = 7
                expiry = today + timedelta(days=days_ahead + i * 7)
                days = (expiry - today).days
                expiries.append(ExpiryInfo(
                    expiry_date=expiry.strftime('%Y-%m-%d'),
                    expiry_type='WEEKLY' if days <= 7 else 'MONTHLY',
                    days_to_expiry=days,
                    is_weekly=days <= 7
                ))
            return expiries
        except Exception as e:
            logger.error(f"Error generating mock expiries: {e}")
            return []

    # ============================================
    # Symbol Search
    # ============================================

    async def search_symbols(self, query: str, exchange: ExchangeType = ExchangeType.NSE) -> list[dict]:
        """Search for mock trading symbols."""
        return [
            {'symbol': 'NIFTY', 'name': 'NIFTY 50', 'exchange': 'NSE', 'instrument_type': 'INDEX', 'segment': 'NSE'},
            {'symbol': 'BANKNIFTY', 'name': 'BANK NIFTY', 'exchange': 'NSE', 'instrument_type': 'INDEX', 'segment': 'NSE'},
            {'symbol': 'FINNIFTY', 'name': 'FIN NIFTY', 'exchange': 'NSE', 'instrument_type': 'INDEX', 'segment': 'NSE'},
        ]