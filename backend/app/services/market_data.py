"""
Market Data Service - Integrates multiple data providers with caching and fallback.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from functools import lru_cache

import sys
import importlib.util
from pathlib import Path

# Add project root ostb directory to path
project_root = Path(__file__).parent.parent.parent.parent
ostb_dir = project_root / "ostb"
if ostb_dir.exists():
    sys.path.insert(0, str(ostb_dir))
else:
    # Fallback for Windows paths
    ostb_dir = Path(r"C:\Users\SUMEE\Documents\algotrade\open-strategy-builder\ostb")
    if ostb_dir.exists():
        sys.path.insert(0, str(ostb_dir))

# Ensure ostb package is properly registered in sys.modules
if ostb_dir.exists() and 'ostb' not in sys.modules:
    import importlib.util
    init_file = ostb_dir / "__init__.py"
    if init_file.exists():
        spec = importlib.util.spec_from_file_location("ostb", init_file)
        if spec:
            module = importlib.util.module_from_spec(spec)
            sys.modules['ostb'] = module
            spec.loader.exec_module(module)

from ostb.data import (
    BaseDataProvider,
    OptionChainParams,
    OptionChainResponse,
    UnderlyingQuote,
    ExpiryInfo,
    ExchangeType,
    get_provider,
    PROVIDERS,
)

logger = logging.getLogger(__name__)


class MarketDataService:
    """
    Unified market data service with provider fallback and caching.
    """

    def __init__(self):
        self.providers: Dict[str, BaseDataProvider] = {}
        self.primary_provider: Optional[str] = None
        self.fallback_providers: List[str] = []
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 30  # seconds
        self._cache_timestamps: Dict[str, float] = {}

    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize data providers from config."""
        try:
            self.primary_provider = config.get('primary_provider', 'nse')
            self.fallback_providers = config.get('fallback_providers', ['nse'])
            self._cache_ttl = config.get('cache_ttl', 30)

            provider_configs = config.get('providers', {})

            for name, provider_config in provider_configs.items():
                if name in PROVIDERS:
                    try:
                        provider = get_provider(name, **provider_config)
                        connected = await provider.connect()
                        if connected:
                            self.providers[name] = provider
                            logger.info(f"Initialized provider: {name}")
                        else:
                            logger.warning(f"Provider {name} failed to connect")
                    except Exception as e:
                        logger.error(f"Failed to initialize provider {name}: {e}")

            if not self.providers:
                logger.error("No data providers initialized!")
                return False

            # Ensure primary provider is available
            if self.primary_provider not in self.providers:
                self.primary_provider = list(self.providers.keys())[0]
                logger.warning(f"Primary provider not available, using {self.primary_provider}")

            return True
        except Exception as e:
            logger.error(f"Failed to initialize market data service: {e}")
            return False

    async def shutdown(self) -> None:
        """Shutdown all providers."""
        for provider in self.providers.values():
            await provider.disconnect()
        self.providers.clear()

    def _get_provider(self, name: Optional[str] = None) -> Optional[BaseDataProvider]:
        """Get provider by name, with fallback."""
        if name and name in self.providers:
            return self.providers[name]

        if self.primary_provider in self.providers:
            return self.providers[self.primary_provider]

        # Try fallbacks
        for fallback in self.fallback_providers:
            if fallback in self.providers:
                return self.providers[fallback]

        # Return any available
        return next(iter(self.providers.values())) if self.providers else None

    def _get_cache_key(self, method: str, *args, **kwargs) -> str:
        """Generate cache key."""
        key_parts = [method]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return "|".join(key_parts)

    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry is still valid."""
        if key not in self._cache_timestamps:
            return False
        age = datetime.now().timestamp() - self._cache_timestamps[key]
        return age < self._cache_ttl

    async def get_option_chain(
        self,
        underlying: str,
        exchange: ExchangeType = ExchangeType.NSE,
        expiry_date: str = "",
        strike_count: int = 20,
        provider: Optional[str] = None,
        use_cache: bool = True
    ) -> OptionChainResponse:
        """Get option chain with caching and fallback."""
        cache_key = self._get_cache_key('option_chain', underlying, exchange, expiry_date, strike_count)

        if use_cache and self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        # Try primary provider
        prov = self._get_provider(provider)
        if not prov:
            return OptionChainResponse(status='error', message='No data provider available')

        params = OptionChainParams(
            underlying=underlying,
            exchange=exchange,
            expiry_date=expiry_date,
            strike_count=strike_count
        )

        result = await prov.get_option_chain(params)

        # Try fallbacks on error
        if result.status == 'error' and provider is None:
            for fallback in self.fallback_providers:
                if fallback != self.primary_provider and fallback in self.providers:
                    logger.info(f"Trying fallback provider: {fallback}")
                    result = await self.providers[fallback].get_option_chain(params)
                    if result.status == 'success':
                        break

        if result.status == 'success' and use_cache:
            self._cache[cache_key] = result
            self._cache_timestamps[cache_key] = datetime.now().timestamp()

        return result

    async def get_underlying_quote(
        self,
        underlying: str,
        exchange: ExchangeType = ExchangeType.NSE,
        provider: Optional[str] = None,
        use_cache: bool = True
    ) -> UnderlyingQuote:
        """Get underlying quote with caching."""
        cache_key = self._get_cache_key('quote', underlying, exchange)

        if use_cache and self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        prov = self._get_provider(provider)
        if not prov:
            return UnderlyingQuote(
                symbol=underlying, exchange=exchange, ltp=0, change=0, change_percent=0,
                open=0, high=0, low=0, prev_close=0, volume=0,
                timestamp=int(datetime.now().timestamp() * 1000)
            )

        result = await prov.get_underlying_quote(underlying, exchange)

        if use_cache:
            self._cache[cache_key] = result
            self._cache_timestamps[cache_key] = datetime.now().timestamp()

        return result

    async def get_expiries(
        self,
        underlying: str,
        exchange: ExchangeType = ExchangeType.NSE,
        provider: Optional[str] = None
    ) -> List[ExpiryInfo]:
        """Get available expiries."""
        prov = self._get_provider(provider)
        if not prov:
            return []

        return await prov.get_expiries(underlying, exchange)

    async def search_symbols(
        self,
        query: str,
        exchange: ExchangeType = ExchangeType.NSE,
        provider: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for trading symbols."""
        prov = self._get_provider(provider)
        if not prov:
            return []

        return await prov.search_symbols(query, exchange)

    async def health_check(self) -> Dict[str, Any]:
        """Check health of all providers."""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = await provider.health_check()
            except Exception as e:
                results[name] = {'provider': name, 'connected': False, 'error': str(e)}
        return {
            'providers': results,
            'primary': self.primary_provider,
            'cache_size': len(self._cache),
        }

    def clear_cache(self) -> None:
        """Clear all cached data."""
        self._cache.clear()
        self._cache_timestamps.clear()

    def set_cache_ttl(self, ttl: int) -> None:
        """Set cache TTL in seconds."""
        self._cache_ttl = ttl


# Global service instance
_market_data_service: Optional[MarketDataService] = None


async def get_market_data_service() -> MarketDataService:
    """Get or create global market data service."""
    global _market_data_service
    if _market_data_service is None:
        _market_data_service = MarketDataService()
    return _market_data_service


async def initialize_market_data(config: Dict[str, Any]) -> MarketDataService:
    """Initialize global market data service."""
    global _market_data_service
    _market_data_service = MarketDataService()
    await _market_data_service.initialize(config)
    return _market_data_service