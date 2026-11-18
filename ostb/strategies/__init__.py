"""
Open Strategy Builder - Strategy Templates
Pre-defined multi-leg option strategies.
"""

from .templates import (
    STRATEGY_TEMPLATES,
    StrategyTemplateConfig,
    StrategyCategory,
    MarketView,
    get_template,
    list_templates,
    generate_legs_from_template,
    template_to_api_format,
)

__all__ = [
    'STRATEGY_TEMPLATES',
    'StrategyTemplateConfig',
    'StrategyCategory',
    'MarketView',
    'get_template',
    'list_templates',
    'generate_legs_from_template',
    'template_to_api_format',
]