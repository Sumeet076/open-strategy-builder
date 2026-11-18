"""
Strategy Templates for Open Strategy Builder
Pre-defined multi-leg option strategies with configurable parameters.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional
from enum import Enum

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from python_types import (
    StrategyLeg,
    StrategyTemplate,
    OptionType,
    PositionType,
    ExchangeType,
    ProductType,
    OrderType,
    ExecutionMode,
    StrategyCategory,
    MarketView,
)


class StrategyCategory(str, Enum):
    DIRECTIONAL = "DIRECTIONAL"
    NON_DIRECTIONAL = "NON_DIRECTIONAL"
    VOLATILITY = "VOLATILITY"
    INCOME = "INCOME"
    HEDGING = "HEDGING"


class MarketView(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"
    VOLATILE = "VOLATILE"
    RANGE_BOUND = "RANGE_BOUND"


@dataclass
class StrategyTemplateConfig:
    """Configuration for generating strategy legs from template"""
    name: str
    description: str
    category: StrategyCategory
    market_view: MarketView
    legs: list[dict]  # Template leg configs with placeholders
    min_capital: Optional[float] = None
    max_risk: Optional[float] = None
    typical_iv_range: tuple[float, float] = (0.15, 0.35)
    tags: list[str] = field(default_factory=list)


# ============================================
# Strategy Templates
# ============================================

STRATEGY_TEMPLATES: dict[str, StrategyTemplateConfig] = {
    # --- DIRECTIONAL ---
    "long_call": StrategyTemplateConfig(
        name="Long Call",
        description="Bullish strategy with unlimited upside, limited risk (premium paid)",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BULLISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            }
        ],
        min_capital=5000,
        max_risk=1.0,  # 100% of premium
        typical_iv_range=(0.15, 0.40),
        tags=["simple", "bullish", "limited_risk"],
    ),

    "long_put": StrategyTemplateConfig(
        name="Long Put",
        description="Bearish strategy with unlimited upside (to zero), limited risk",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BEARISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            }
        ],
        min_capital=5000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.40),
        tags=["simple", "bearish", "limited_risk"],
    ),

    "bull_call_spread": StrategyTemplateConfig(
        name="Bull Call Spread",
        description="Moderately bullish, limited risk/reward. Buy ATM call, sell OTM call",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BULLISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,  # 2 strikes OTM
                "lots": 1,
            }
        ],
        min_capital=10000,
        max_risk=0.5,
        typical_iv_range=(0.15, 0.35),
        tags=["spread", "bullish", "defined_risk"],
    ),

    "bear_put_spread": StrategyTemplateConfig(
        name="Bear Put Spread",
        description="Moderately bearish, limited risk/reward. Buy ATM put, sell OTM put",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BEARISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=10000,
        max_risk=0.5,
        typical_iv_range=(0.15, 0.35),
        tags=["spread", "bearish", "defined_risk"],
    ),

    # --- NON-DIRECTIONAL / INCOME ---
    "short_straddle": StrategyTemplateConfig(
        name="Short Straddle",
        description="Neutral strategy. Sell ATM call and put. High risk, profits from time decay",
        category=StrategyCategory.INCOME,
        market_view=MarketView.RANGE_BOUND,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            }
        ],
        min_capital=50000,
        max_risk=5.0,  # Unlimited
        typical_iv_range=(0.20, 0.40),
        tags=["income", "theta", "high_risk", "neutral"],
    ),

    "short_strangle": StrategyTemplateConfig(
        name="Short Strangle",
        description="Neutral strategy. Sell OTM call and put. Wider range than straddle",
        category=StrategyCategory.INCOME,
        market_view=MarketView.RANGE_BOUND,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=40000,
        max_risk=5.0,
        typical_iv_range=(0.20, 0.40),
        tags=["income", "theta", "high_risk", "neutral", "wide_range"],
    ),

    "iron_condor": StrategyTemplateConfig(
        name="Iron Condor",
        description="Neutral, defined risk. Sell OTM call spread + put spread. Popular income strategy",
        category=StrategyCategory.INCOME,
        market_view=MarketView.RANGE_BOUND,
        legs=[
            # Call spread
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 4,
                "lots": 1,
            },
            # Put spread
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 4,
                "lots": 1,
            }
        ],
        min_capital=25000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.35),
        tags=["income", "defined_risk", "neutral", "popular"],
    ),

    "iron_fly": StrategyTemplateConfig(
        name="Iron Fly (Iron Butterfly)",
        description="Neutral, defined risk. Sell ATM straddle + buy OTM wings. Higher probability, lower reward",
        category=StrategyCategory.INCOME,
        market_view=MarketView.RANGE_BOUND,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 3,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 3,
                "lots": 1,
            }
        ],
        min_capital=30000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.35),
        tags=["income", "defined_risk", "neutral", "high_probability"],
    ),

    # --- VOLATILITY ---
    "long_straddle": StrategyTemplateConfig(
        name="Long Straddle",
        description="Volatile strategy. Buy ATM call and put. Profits from large move either direction",
        category=StrategyCategory.VOLATILITY,
        market_view=MarketView.VOLATILE,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            }
        ],
        min_capital=15000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.30),  # Best when IV is low
        tags=["volatility", "event_driven", "unlimited_upside"],
    ),

    "long_strangle": StrategyTemplateConfig(
        name="Long Strangle",
        description="Volatile strategy. Buy OTM call and put. Cheaper than straddle, needs bigger move",
        category=StrategyCategory.VOLATILITY,
        market_view=MarketView.VOLATILE,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=10000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.30),
        tags=["volatility", "event_driven", "cheaper_than_straddle"],
    ),

    # --- WING SPREADS ---
    "call_butterfly": StrategyTemplateConfig(
        name="Call Butterfly",
        description="Neutral, defined risk. Buy 1 ATM, sell 2 ATM+1, buy 1 ATM+2. Profits from pinning",
        category=StrategyCategory.NON_DIRECTIONAL,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": -1,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 2,
            },
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 1,
                "lots": 1,
            }
        ],
        min_capital=10000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.30),
        tags=["butterfly", "neutral", "defined_risk", "pin_risk"],
    ),

    "put_butterfly": StrategyTemplateConfig(
        name="Put Butterfly",
        description="Neutral, defined risk. Mirror of call butterfly using puts",
        category=StrategyCategory.NON_DIRECTIONAL,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 1,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 2,
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": -1,
                "lots": 1,
            }
        ],
        min_capital=10000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.30),
        tags=["butterfly", "neutral", "defined_risk", "pin_risk"],
    ),

    "call_condor": StrategyTemplateConfig(
        name="Call Condor",
        description="Neutral, wider range than butterfly. Buy 1, sell 1, sell 1, buy 1",
        category=StrategyCategory.NON_DIRECTIONAL,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": -2,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": -1,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 1,
                "lots": 1,
            },
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=15000,
        max_risk=1.0,
        typical_iv_range=(0.15, 0.30),
        tags=["condor", "neutral", "defined_risk", "wider_range"],
    ),

    # --- RATIO SPREADS ---
    "call_ratio_spread": StrategyTemplateConfig(
        name="Call Ratio Spread",
        description="Moderately bullish. Buy 1 ATM, sell 2 OTM. Net credit possible, unlimited upside risk",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BULLISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 2,
            }
        ],
        min_capital=20000,
        max_risk=3.0,
        typical_iv_range=(0.20, 0.40),
        tags=["ratio", "bullish", "credit_possible", "unlimited_risk"],
    ),

    "put_ratio_spread": StrategyTemplateConfig(
        name="Put Ratio Spread",
        description="Moderately bearish. Buy 1 ATM, sell 2 OTM. Net credit possible",
        category=StrategyCategory.DIRECTIONAL,
        market_view=MarketView.BEARISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 2,
            }
        ],
        min_capital=20000,
        max_risk=3.0,
        typical_iv_range=(0.20, 0.40),
        tags=["ratio", "bearish", "credit_possible", "unlimited_risk"],
    ),

    # --- CALENDAR / DIAGONAL ---
    "call_calendar_spread": StrategyTemplateConfig(
        name="Call Calendar Spread",
        description="Neutral to slightly bullish. Sell near-term, buy far-term same strike. Profits from IV/time decay",
        category=StrategyCategory.INCOME,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
                "expiry_type": "NEAR",
            },
            {
                "position_type": "BUY",
                "option_type": "CE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
                "expiry_type": "FAR",
            }
        ],
        min_capital=15000,
        max_risk=1.0,
        typical_iv_range=(0.20, 0.40),
        tags=["calendar", "time_spread", "iv_play", "neutral"],
    ),

    "put_calendar_spread": StrategyTemplateConfig(
        name="Put Calendar Spread",
        description="Neutral to slightly bearish. Sell near-term, buy far-term put",
        category=StrategyCategory.INCOME,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
                "expiry_type": "NEAR",
            },
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "ATM",
                "strike_offset": 0,
                "lots": 1,
                "expiry_type": "FAR",
            }
        ],
        min_capital=15000,
        max_risk=1.0,
        typical_iv_range=(0.20, 0.40),
        tags=["calendar", "time_spread", "iv_play", "neutral"],
    ),

    # --- HEDGING ---
    "protective_put": StrategyTemplateConfig(
        name="Protective Put (Married Put)",
        description="Hedge long stock position. Buy OTM put for downside protection",
        category=StrategyCategory.HEDGING,
        market_view=MarketView.BULLISH,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=5000,
        max_risk=0.1,  # Small premium
        typical_iv_range=(0.15, 0.35),
        tags=["hedge", "protective", "stock_replacement"],
    ),

    "covered_call": StrategyTemplateConfig(
        name="Covered Call",
        description="Income on long stock. Sell OTM call against shares. Caps upside",
        category=StrategyCategory.INCOME,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=50000,
        max_risk=1.0,  # Opportunity cost
        typical_iv_range=(0.15, 0.35),
        tags=["income", "covered", "stock_replacement"],
    ),

    "collar": StrategyTemplateConfig(
        name="Collar",
        description="Hedge long stock. Buy protective put + sell covered call. Zero-cost possible",
        category=StrategyCategory.HEDGING,
        market_view=MarketView.NEUTRAL,
        legs=[
            {
                "position_type": "BUY",
                "option_type": "PE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            },
            {
                "position_type": "SELL",
                "option_type": "CE",
                "strike_selection": "OTM",
                "strike_offset": 2,
                "lots": 1,
            }
        ],
        min_capital=50000,
        max_risk=0.5,
        typical_iv_range=(0.15, 0.35),
        tags=["hedge", "collar", "zero_cost_possible"],
    ),
}


# ============================================
# Template Functions
# ============================================

def get_template(template_id: str) -> Optional[StrategyTemplateConfig]:
    """Get a strategy template by ID"""
    return STRATEGY_TEMPLATES.get(template_id)


def list_templates(
    category: Optional[StrategyCategory] = None,
    market_view: Optional[MarketView] = None
) -> list[StrategyTemplateConfig]:
    """List all templates, optionally filtered"""
    templates = list(STRATEGY_TEMPLATES.values())

    if category:
        templates = [t for t in templates if t.category == category]

    if market_view:
        templates = [t for t in templates if t.market_view == market_view]

    return templates


def generate_legs_from_template(
    template_id: str,
    underlying: str,
    exchange: ExchangeType,
    expiry_date: str,
    atm_strike: float,
    strike_interval: float,
    lot_size: int,
    custom_params: Optional[dict] = None
) -> list[StrategyLeg]:
    """Generate concrete StrategyLeg objects from a template"""
    template = get_template(template_id)
    if not template:
        raise ValueError(f"Template {template_id} not found")

    legs = []
    for i, leg_template in enumerate(template.legs):
        # Determine strike
        strike_selection = leg_template.get("strike_selection", "ATM")
        strike_offset = leg_template.get("strike_offset", 0)

        if strike_selection == "ATM":
            strike = atm_strike
        elif strike_selection == "OTM":
            if leg_template["option_type"] == OptionType.CE:
                strike = atm_strike + (strike_offset * strike_interval)
            else:
                strike = atm_strike - (strike_offset * strike_interval)
        elif strike_selection == "ITM":
            if leg_template["option_type"] == OptionType.CE:
                strike = atm_strike - (strike_offset * strike_interval)
            else:
                strike = atm_strike + (strike_offset * strike_interval)
        else:
            strike = atm_strike

        # Round to strike interval
        strike = round(strike / strike_interval) * strike_interval

        lots = leg_template.get("lots", 1)
        if custom_params and f"leg_{i}_lots" in custom_params:
            lots = custom_params[f"leg_{i}_lots"]

        leg = StrategyLeg(
            id=f"{template_id}_{i}",
            underlying=underlying,
            exchange=exchange,
            expiry_date=expiry_date,
            strike=strike,
            option_type=leg_template["option_type"],
            position_type=leg_template["position_type"],
            lots=lots,
            quantity=lots * lot_size,
            entry_type="MARKET",
            lot_size=lot_size,
            tick_size=0.05,
        )
        legs.append(leg)

    return legs


def template_to_api_format(template_id: str) -> dict:
    """Convert template to API response format"""
    template = get_template(template_id)
    if not template:
        return {}

    return {
        "id": template_id,
        "name": template.name,
        "description": template.description,
        "category": template.category.value,
        "market_view": template.market_view.value,
        "legs": template.legs,
        "min_capital": template.min_capital,
        "max_risk": template.max_risk,
        "typical_iv_range": template.typical_iv_range,
        "tags": template.tags,
    }


if __name__ == "__main__":
    # Test template generation
    print("Available templates:")
    for tid, template in STRATEGY_TEMPLATES.items():
        print(f"  {tid}: {template.name} ({template.category.value})")

    print("\nGenerating Iron Condor legs...")
    legs = generate_legs_from_template(
        "iron_condor",
        "NIFTY",
        "NSE",
        "2024-01-25",
        22000,
        50,
        50
    )
    for leg in legs:
        print(f"  {leg.position_type} {leg.option_type} {leg.strike} x{leg.lots}")