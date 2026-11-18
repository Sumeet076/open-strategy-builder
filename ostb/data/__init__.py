"""
Data Provider Integrations for Open Strategy Builder
Supports multiple Indian market data sources.
"""

from .base import BaseDataProvider, OptionChainParams, OptionChainResponse, UnderlyingQuote, ExpiryInfo, ExchangeType, OptionType
from .nse import NSEDataProvider
from .truedata import TrueDataProvider
from .kite import KiteDataProvider
from .upstox import UpstoxDataProvider
from .kotak import KotakNeoDataProvider
from .mock import MockDataProvider

# Registry of available providers
PROVIDERS = {
    'nse': NSEDataProvider,
    'truedata': TrueDataProvider,
    'kite': KiteDataProvider,
    'upstox': UpstoxDataProvider,
    'kotak': KotakNeoDataProvider,
    'mock': MockDataProvider,
}

def get_provider(name: str, **config) -> BaseDataProvider:
    """Factory function to get a data provider instance."""
    if name not in PROVIDERS:
        raise ValueError(f"Unknown provider: {name}. Available: {list(PROVIDERS.keys())}")
    return PROVIDERS[name](**config)

__all__ = [
    'BaseDataProvider',
    'OptionChainParams',
    'OptionChainResponse',
    'UnderlyingQuote',
    'ExpiryInfo',
    'ExchangeType',
    'OptionType',
    'NSEDataProvider',
    'TrueDataProvider',
    'KiteDataProvider',
    'UpstoxDataProvider',
    'KotakNeoDataProvider',
    'MockDataProvider',
    'PROVIDERS',
    'get_provider',
]