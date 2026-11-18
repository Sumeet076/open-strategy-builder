"""
Standalone Pricing Engine API
High-performance options pricing and Greeks calculation service.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import numpy as np

from .black_scholes import (
    black_scholes,
    black_scholes_price,
    black_scholes_greeks,
    implied_volatility,
    calculate_strategy_payoff,
    probability_of_profit,
    Greeks,
    OptionPrice,
    OptionFlag,
)

app = FastAPI(
    title="Open Strategy Builder - Pricing Engine",
    description="High-performance options pricing and Greeks calculation",
    version="1.0.0",
)


# ============================================
# Pydantic Models
# ============================================

class OptionRequest(BaseModel):
    flag: OptionFlag
    S: float = Field(..., gt=0, description="Spot price")
    K: float = Field(..., gt=0, description="Strike price")
    t: float = Field(..., ge=0, description="Time to expiry (years)")
    r: float = Field(default=0.07, description="Risk-free rate")
    sigma: float = Field(..., gt=0, description="Volatility")
    q: float = Field(default=0.0, ge=0, description="Dividend yield")


class IVRequest(BaseModel):
    price: float = Field(..., gt=0, description="Option market price")
    S: float = Field(..., gt=0, description="Spot price")
    K: float = Field(..., gt=0, description="Strike price")
    t: float = Field(..., gt=0, description="Time to expiry (years)")
    r: float = Field(default=0.07, description="Risk-free rate")
    flag: OptionFlag
    q: float = Field(default=0.0, ge=0, description="Dividend yield")


class LegRequest(BaseModel):
    id: str
    option_type: Literal['CE', 'PE']
    position_type: Literal['BUY', 'SELL']
    strike: float
    quantity: int
    entry_price: Optional[float] = None
    greeks: Optional[dict] = None


class PayoffRequest(BaseModel):
    legs: List[LegRequest]
    spot: float
    spot_range_pct: List[float] = [-10, 10]
    steps: int = 100
    iv: float = 0.20
    days_to_expiry: float = 30
    r: float = 0.07


class GreeksRequest(BaseModel):
    legs: List[LegRequest]
    spot: float
    iv: float
    days_to_expiry: float
    r: float = 0.07


class BatchPriceRequest(BaseModel):
    options: List[OptionRequest]


# ============================================
# API Endpoints
# ============================================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pricing-engine"}


@app.post("/price", response_model=dict)
async def price_option(request: OptionRequest):
    """Calculate option price and Greeks"""
    try:
        result = black_scholes(
            request.flag, request.S, request.K, request.t,
            request.r, request.sigma, request.q
        )
        return {
            "price": result.price,
            "greeks": {
                "delta": result.greeks.delta,
                "gamma": result.greeks.gamma,
                "theta": result.greeks.theta,
                "vega": result.greeks.vega,
                "rho": result.greeks.rho,
                "vanna": result.greeks.vanna,
                "charm": result.greeks.charm,
                "vomma": result.greeks.vomma,
            },
            "inputs": request.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/price/batch", response_model=List[dict])
async def price_batch(request: BatchPriceRequest):
    """Calculate prices for multiple options"""
    results = []
    for opt in request.options:
        result = black_scholes(
            opt.flag, opt.S, opt.K, opt.t, opt.r, opt.sigma, opt.q
        )
        results.append({
            "price": result.price,
            "greeks": {
                "delta": result.greeks.delta,
                "gamma": result.greeks.gamma,
                "theta": result.greeks.theta,
                "vega": result.greeks.vega,
                "rho": result.greeks.rho,
            },
        })
    return results


@app.post("/implied-volatility", response_model=dict)
async def calculate_iv(request: IVRequest):
    """Calculate implied volatility"""
    try:
        iv = implied_volatility(
            request.price, request.S, request.K, request.t,
            request.r, request.flag, request.q
        )
        return {"implied_volatility": iv}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/greeks", response_model=dict)
async def calculate_greeks(request: GreeksRequest):
    """Calculate portfolio Greeks"""
    try:
        legs = [leg.model_dump() for leg in request.legs]

        total_greeks = Greeks(delta=0, gamma=0, theta=0, vega=0, rho=0)
        leg_greeks = {}

        for leg in legs:
            flag: OptionFlag = 'c' if leg["option_type"] == "CE" else 'p'
            strike = leg["strike"]
            position = leg["position_type"]
            quantity = leg["quantity"]

            greeks = black_scholes_greeks(
                flag, request.spot, strike, request.days_to_expiry / 365,
                request.r, request.iv
            )

            mult = 1 if position == "BUY" else -1

            leg_greeks[leg["id"]] = {
                "delta": greeks.delta * quantity * mult,
                "gamma": greeks.gamma * quantity * mult,
                "theta": greeks.theta * quantity * mult,
                "vega": greeks.vega * quantity * mult,
                "rho": greeks.rho * quantity * mult,
            }

            total_greeks.delta += leg_greeks[leg["id"]]["delta"]
            total_greeks.gamma += leg_greeks[leg["id"]]["gamma"]
            total_greeks.theta += leg_greeks[leg["id"]]["theta"]
            total_greeks.vega += leg_greeks[leg["id"]]["vega"]
            total_greeks.rho += leg_greeks[leg["id"]]["rho"]

        return {
            "total_greeks": {
                "delta": round(total_greeks.delta, 4),
                "gamma": round(total_greeks.gamma, 6),
                "theta": round(total_greeks.theta, 4),
                "vega": round(total_greeks.vega, 4),
                "rho": round(total_greeks.rho, 4),
            },
            "leg_greeks": leg_greeks,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/payoff", response_model=dict)
async def calculate_payoff(request: PayoffRequest):
    """Calculate strategy payoff curve"""
    try:
        legs = [leg.model_dump() for leg in request.legs]

        spot_min = request.spot * (1 + request.spot_range_pct[0] / 100)
        spot_max = request.spot * (1 + request.spot_range_pct[1] / 100)
        spot_range = np.linspace(spot_min, spot_max, request.steps)

        pnl_array, metrics = calculate_strategy_payoff(
            legs, spot_range, request.spot, request.days_to_expiry, request.iv, request.r
        )

        prob_profit = probability_of_profit(
            legs, request.spot, request.days_to_expiry, request.iv, request.r
        )

        points = []
        for i, s in enumerate(spot_range):
            leg_pnls = {leg_id: float(pnl[i]) for leg_id, pnl in metrics["leg_pnls"].items()}
            points.append({
                "spot_price": float(s),
                "total_pnl": float(pnl_array[i]),
                "leg_pnls": leg_pnls,
            })

        return {
            "spot_range": [float(spot_min), float(spot_max)],
            "current_spot": request.spot,
            "points": points,
            "breakevens": metrics["breakevens"],
            "max_profit": metrics["max_profit"],
            "max_loss": metrics["max_loss"],
            "probability_of_profit": prob_profit,
            "risk_reward_ratio": abs(metrics["max_profit"] / metrics["max_loss"]) if metrics["max_loss"] != 0 else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)