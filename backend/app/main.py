"""
Open Strategy Builder - FastAPI Backend
Main application entry point with all API routes.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import json
import uuid
from datetime import datetime, timedelta
import numpy as np

# Import pricing engine
import sys
import importlib.util
from pathlib import Path

# Add project root ostb directory to path
project_root = Path(__file__).parent.parent.parent
ostb_dir = project_root / "ostb"
if ostb_dir.exists():
    sys.path.insert(0, str(ostb_dir))
else:
    # Fallback for Windows paths
    ostb_dir = Path(r"C:\Users\SUMEE\Documents\algotrade\open-strategy-builder\ostb")

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
    if ostb_dir.exists():
        sys.path.insert(0, str(ostb_dir))

from pricing import (
    black_scholes,
    black_scholes_price,
    black_scholes_greeks,
    implied_volatility,
    calculate_strategy_payoff,
    probability_of_profit,
    Greeks,
    OptionFlag,
)
from strategies import (
    STRATEGY_TEMPLATES,
    get_template,
    list_templates,
    generate_legs_from_template,
    template_to_api_format,
    StrategyCategory,
    MarketView,
)

# Import models
from .models import *

# Import market data service
from .services.market_data import (
    initialize_market_data,
    get_market_data_service,
    MarketDataService,
)

# Import ExchangeType from ostb data
from ostb.data import ExchangeType


# ============================================
# In-memory storage (replace with DB in production)
# ============================================

strategies_db: Dict[str, dict] = {}
websocket_connections: List[WebSocket] = []

# Market data service instance
_market_data_service: Optional[MarketDataService] = None


# ============================================
# FastAPI App & Lifecycle
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global _market_data_service
    print("Starting Open Strategy Builder API...")

    # Initialize market data service
    _market_data_service = await initialize_market_data({
        'primary_provider': 'mock',
        'fallback_providers': ['mock', 'nse'],
        'cache_ttl': 30,
        'providers': {
            'mock': {},
            'nse': {},
        }
    })

    yield

    # Shutdown
    print("Shutting down...")
    if _market_data_service:
        await _market_data_service.shutdown()


app = FastAPI(
    title="Open Strategy Builder API",
    description="Open-source options strategy builder with real-time Greeks, payoff analysis, and backtesting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/info")
async def api_info():
    return {
        "name": "Open Strategy Builder",
        "version": "1.0.0",
        "description": "Open-source options strategy builder",
        "features": [
            "Real-time option chain",
            "Multi-leg strategy builder",
            "Payoff analysis",
            "Greeks calculation",
            "Scenario analysis",
            "Backtesting",
            "Strategy templates",
        ],
    }


# ============================================
# Market Data Endpoints
# ============================================

@app.get("/api/v1/market/option-chain")
async def get_option_chain(
    underlying: str = Query(...),
    exchange: str = Query("NSE"),
    expiry_date: str = Query(...),
    strike_count: int = Query(20),
    provider: Optional[str] = Query(None),
    use_cache: bool = Query(True),
):
    """Get option chain for underlying"""
    if not _market_data_service:
        raise HTTPException(status_code=503, detail="Market data service not initialized")

    return await _market_data_service.get_option_chain(
        underlying=underlying,
        exchange=ExchangeType(exchange),
        expiry_date=expiry_date,
        strike_count=strike_count,
        provider=provider,
        use_cache=use_cache
    )


@app.get("/api/v1/market/underlying-quote")
async def get_underlying_quote(
    underlying: str = Query(...),
    exchange: str = Query("NSE"),
    provider: Optional[str] = Query(None),
    use_cache: bool = Query(True),
):
    """Get underlying quote"""
    if not _market_data_service:
        raise HTTPException(status_code=503, detail="Market data service not initialized")

    return await _market_data_service.get_underlying_quote(
        underlying=underlying,
        exchange=ExchangeType(exchange),
        provider=provider,
        use_cache=use_cache
    )


@app.get("/api/v1/market/expiries")
async def get_expiries(
    underlying: str = Query(...),
    exchange: str = Query("NSE"),
    provider: Optional[str] = Query(None),
):
    """Get available expiry dates"""
    if not _market_data_service:
        raise HTTPException(status_code=503, detail="Market data service not initialized")

    expiries = await _market_data_service.get_expiries(
        underlying=underlying,
        exchange=ExchangeType(exchange),
        provider=provider
    )
    return {"expiries": [exp.expiry_date for exp in expiries]}


@app.get("/api/v1/market/health")
async def market_data_health():
    """Check health of market data providers"""
    if not _market_data_service:
        raise HTTPException(status_code=503, detail="Market data service not initialized")

    return await _market_data_service.health_check()


@app.get("/api/v1/market/search")
async def search_symbols(
    query: str = Query(...),
    exchange: str = Query("NSE"),
    provider: Optional[str] = Query(None),
):
    """Search for trading symbols"""
    if not _market_data_service:
        raise HTTPException(status_code=503, detail="Market data service not initialized")

    results = await _market_data_service.search_symbols(
        query=query,
        exchange=ExchangeType(exchange),
        provider=provider
    )
    return {"symbols": results}


# ============================================
# Strategy Endpoints
# ============================================

@app.post("/api/v1/strategies")
async def create_strategy(strategy: StrategyRequest):
    """Create a new strategy"""
    strategy_id = str(uuid.uuid4())
    strategy_data = strategy.model_dump()
    strategy_data["id"] = strategy_id
    strategy_data["created_at"] = datetime.now().isoformat()
    strategy_data["updated_at"] = datetime.now().isoformat()
    strategy_data["version"] = 1

    strategies_db[strategy_id] = strategy_data
    return {"id": strategy_id, "message": "Strategy created successfully"}


@app.get("/api/v1/strategies")
async def list_strategies():
    """List all strategies"""
    return {"strategies": list(strategies_db.values())}


@app.get("/api/v1/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    """Get strategy by ID"""
    if strategy_id not in strategies_db:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategies_db[strategy_id]


@app.put("/api/v1/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, strategy: StrategyRequest):
    """Update strategy"""
    if strategy_id not in strategies_db:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strategy_data = strategy.model_dump()
    strategy_data["id"] = strategy_id
    strategy_data["created_at"] = strategies_db[strategy_id]["created_at"]
    strategy_data["updated_at"] = datetime.now().isoformat()
    strategy_data["version"] = strategies_db[strategy_id]["version"] + 1

    strategies_db[strategy_id] = strategy_data
    return {"message": "Strategy updated successfully"}


@app.delete("/api/v1/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete strategy"""
    if strategy_id not in strategies_db:
        raise HTTPException(status_code=404, detail="Strategy not found")
    del strategies_db[strategy_id]
    return {"message": "Strategy deleted successfully"}


# ============================================
# Analytics Endpoints
# ============================================

@app.post("/api/v1/analytics/payoff")
async def calculate_payoff(request: PayoffRequest):
    """Calculate strategy payoff curve"""
    # Convert legs to dict format
    legs = [leg.model_dump() for leg in request.legs]

    # Get current spot (mock)
    spot = 22000 if "NIFTY" in request.underlying else 48000

    # Calculate days to expiry
    expiry_date = datetime.strptime(request.expiry_date, "%Y-%m-%d")
    days_to_expiry = (expiry_date - datetime.now()).days
    if request.days_to_expiry_override:
        days_to_expiry = request.days_to_expiry_override

    # Use IV override or default
    iv = request.iv_override or 0.20

    # Generate spot range
    spot_min = spot * (1 + request.spot_range_pct[0] / 100)
    spot_max = spot * (1 + request.spot_range_pct[1] / 100)
    spot_range = np.linspace(spot_min, spot_max, request.steps)

    # Calculate payoff
    pnl_array, metrics = calculate_strategy_payoff(
        legs, spot_range, spot, days_to_expiry, iv, request.risk_free_rate
    )

    # Build payoff points
    points = []
    for i, s in enumerate(spot_range):
        leg_pnls = {leg_id: float(pnl[i]) for leg_id, pnl in metrics["leg_pnls"].items()}
        points.append({
            "spot_price": float(s),
            "total_pnl": float(pnl_array[i]),
            "leg_pnls": leg_pnls,
        })

    # Calculate probability of profit
    prob_profit = probability_of_profit(legs, spot, days_to_expiry, iv, request.risk_free_rate)

    return {
        "spot_range": [float(spot_min), float(spot_max)],
        "current_spot": spot,
        "points": points,
        "breakevens": metrics["breakevens"],
        "max_profit": metrics["max_profit"],
        "max_loss": metrics["max_loss"],
        "probability_of_profit": prob_profit,
        "risk_reward_ratio": abs(metrics["max_profit"] / metrics["max_loss"]) if metrics["max_loss"] != 0 else None,
    }


@app.post("/api/v1/analytics/greeks")
async def calculate_greeks(request: GreeksRequest):
    """Calculate portfolio Greeks"""
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
            request.risk_free_rate, request.iv
        )

        # Apply position multiplier
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
        "spot": request.spot,
        "iv": request.iv,
        "days_to_expiry": request.days_to_expiry,
    }


@app.post("/api/v1/analytics/scenario")
async def scenario_analysis(request: PayoffRequest):
    """Run scenario analysis with spot/IV/time shifts"""
    legs = [leg.model_dump() for leg in request.legs]
    spot = 22000 if "NIFTY" in request.underlying else 48000

    expiry_date = datetime.strptime(request.expiry_date, "%Y-%m-%d")
    base_days = (expiry_date - datetime.now()).days

    scenarios = []

    # Define scenario grid
    spot_shifts = [-5, -2, 0, 2, 5]  # percentage
    iv_shifts = [-5, 0, 5]  # percentage points
    day_shifts = [0, 1, 3, 7]  # days elapsed

    for spot_shift in spot_shifts:
        for iv_shift in iv_shifts:
            for days_elapsed in day_shifts:
                shifted_spot = spot * (1 + spot_shift / 100)
                shifted_iv = max(request.iv_override or 0.20 + iv_shift / 100, 0.01)
                shifted_days = max(base_days - days_elapsed, 0)

                if shifted_days <= 0:
                    continue

                spot_min = shifted_spot * (1 + request.spot_range_pct[0] / 100)
                spot_max = shifted_spot * (1 + request.spot_range_pct[1] / 100)
                spot_range = np.linspace(spot_min, spot_max, request.steps)

                pnl_array, metrics = calculate_strategy_payoff(
                    legs, spot_range, shifted_spot, shifted_days, shifted_iv, request.risk_free_rate
                )

                prob_profit = probability_of_profit(legs, shifted_spot, shifted_days, shifted_iv, request.risk_free_rate)

                scenarios.append({
                    "spot_shift": spot_shift,
                    "iv_shift": iv_shift,
                    "days_elapsed": days_elapsed,
                    "payoff": {
                        "points": [{"spot_price": float(s), "total_pnl": float(p)} for s, p in zip(spot_range, pnl_array)],
                        "breakevens": metrics["breakevens"],
                        "max_profit": metrics["max_profit"],
                        "max_loss": metrics["max_loss"],
                        "probability_of_profit": prob_profit,
                    },
                    "greeks": {
                        "delta": 0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0
                    }
                })

    return {"scenarios": scenarios, "base_spot": spot, "base_iv": request.iv_override or 0.20, "base_days": base_days}


# ============================================
# Strategy Templates Endpoints
# ============================================

@app.get("/api/v1/templates")
async def get_templates(
    category: Optional[str] = Query(None),
    market_view: Optional[str] = Query(None),
):
    """Get all strategy templates"""
    cat = StrategyCategory(category) if category else None
    mv = MarketView(market_view) if market_view else None

    templates = list_templates(cat, mv)
    return {"templates": [template_to_api_format(t.name.lower().replace(" ", "_")) for t in templates]}


@app.get("/api/v1/templates/{template_id}")
async def get_template_detail(template_id: str):
    """Get template details"""
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template_to_api_format(template_id)


@app.post("/api/v1/templates/generate")
async def generate_from_template(request: TemplateGenerateRequest):
    """Generate strategy legs from template"""
    legs = generate_legs_from_template(
        request.template_id,
        request.underlying,
        request.exchange,
        request.expiry_date,
        request.atm_strike,
        request.strike_interval,
        request.lot_size,
        request.custom_params
    )
    return {"legs": [leg.__dict__ for leg in legs]}


# ============================================
# Backtesting Endpoints
# ============================================

@app.post("/api/v1/backtest")
async def run_backtest(request: BacktestRequest):
    """Run strategy backtest (mock implementation)"""
    # This is a placeholder - real implementation would need historical data
    return {
        "message": "Backtest endpoint ready - requires historical data integration",
        "config": request.model_dump(),
        "note": "Connect to historical data provider (NSE, TrueData, etc.) for real backtests"
    }


# ============================================
# WebSocket for Real-time Data
# ============================================

@app.websocket("/ws/market-data")
async def market_data_websocket(websocket: WebSocket):
    """WebSocket for real-time market data"""
    await websocket.accept()
    websocket_connections.append(websocket)

    try:
        while True:
            # Send mock updates every second
            data = {
                "type": "market_update",
                "timestamp": datetime.now().isoformat(),
                "underlying": generate_mock_underlying_quote("NIFTY", "NSE"),
            }
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)


# ============================================
# Run
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)