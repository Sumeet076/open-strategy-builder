# Open Strategy Builder

> **Open-source options strategy builder with real-time Greeks, payoff analysis, and backtesting**

A complete, production-ready alternative to proprietary platforms like AlgoTest, Sensibull, and Opstra. Built with modern tech stack: React/TypeScript frontend, FastAPI backend, and high-performance Python pricing engine.

## ✨ Features

### 🎯 Strategy Builder
- **Visual Strategy Construction** - Drag-and-drop or click-to-add legs from option chain
- **20+ Pre-built Templates** - Iron Condor, Butterfly, Straddle, Strangle, Calendar spreads, Ratio spreads, and more
- **Multi-leg Support** - Up to 10 legs per strategy with full Greeks tracking
- **Real-time Greeks** - Delta, Gamma, Theta, Vega, Rho + higher-order Greeks (Vanna, Charm, Vomma, etc.)

### 📊 Analytics
- **Interactive Payoff Charts** - Zoom, pan, hover for detailed P&L at any spot price
- **Scenario Analysis** - Spot shift (±20%), IV shift (±20%), time decay (0-30 days)
- **Probability of Profit** - Monte Carlo simulation (10,000 paths)
- **Risk Metrics** - Max profit/loss, breakevens, risk-reward ratio, delta/theta/vega exposure

### ⚡ Real-time Data
- **Hybrid Data Pipeline** - WebSocket for LTP/bid/ask + REST polling for OI/volume
- **Live Greeks Recalculation** - Greeks update on every tick
- **Multi-exchange Support** - NSE, BSE, NFO, BFO, MCX
- **Clock Synchronization** - Server-time corrected for accurate Greeks

### 🔬 Backtesting
- **Historical Simulation** - Test strategies against past market data
- **Performance Metrics** - Sharpe, Sortino, Calmar, Profit Factor, Expectancy
- **Equity Curve** - Visual P&L over time
- **Monthly Returns** - Calendar view of strategy performance

### 🛡️ Risk Management
- **Per-leg Stop Loss/Target** - Percentage, points, or premium-based
- **Portfolio-level Limits** - Overall stop loss, max loss per trade
- **Unlimited Risk Warnings** - Automatic detection of naked short positions
- **Margin Estimation** - SPAN margin approximation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React 18 + TS)                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ Option Chain│ │ Leg Builder │ │ Payoff Chart│ │ Greeks   │  │
│  │   Panel     │ │   Panel     │ │   (Chart.js)│ │  Panel   │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
│         │              │              │              │          │
│         └──────────────┼──────────────┼──────────────┘          │
│                        ▼                                          │
│              ┌─────────────────┐                                 │
│              │  Zustand Store  │  (Client State)                 │
│              │  TanStack Query │  (Server State)                 │
│              └─────────────────┘                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │  Market     │ │ Strategy    │ │ Analytics   │ │ Execution│  │
│  │  Data API   │ │  CRUD API   │ │  Engine     │ │  API     │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Python RPC
┌──────────────────────────▼──────────────────────────────────────┐
│                  Pricing Engine (Python)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Black-Scholes + Higher-order Greeks (Pure Python/NumPy) │   │
│  │  • 1st order: Delta, Gamma, Theta, Vega, Rho            │   │
│  │  • 2nd/3rd order: Vanna, Charm, Vomma, Speed, Zomma...  │   │
│  │  • Implied Volatility (Jäckel's "Let's Be Rational")    │   │
│  │  • Vectorized batch operations via NumPy                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/open-strategy-builder.git
cd open-strategy-builder

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Pricing Engine: http://localhost:8001
```

### Local Development

```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Terminal 3 - Pricing Engine (optional, for scaling)
cd python
pip install -r requirements.txt
uvicorn pricing.api:app --reload --port 8001
```

## 📁 Project Structure

```
open-strategy-builder/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Base components (Button, Input, Card, etc.)
│   │   │   └── builder/         # Strategy builder specific components
│   │   ├── pages/               # Page components
│   │   ├── stores/              # Zustand state management
│   │   ├── hooks/               # Custom React hooks
│   │   ├── api/                 # API client (Axios + TanStack Query)
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Utility functions
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── main.py              # FastAPI app with all routes
│   │   ├── models/              # Pydantic models
│   │   ├── services/            # Business logic
│   │   └── api/                 # API route handlers
│   ├── requirements.txt
│   └── Dockerfile
│
├── python/                      # Pricing Engine
│   ├── pricing/
│   │   ├── black_scholes.py     # Core pricing + Greeks (1st/2nd/3rd order)
│   │   ├── api.py               # Standalone FastAPI pricing service
│   │   └── __init__.py
│   ├── strategies/
│   │   ├── templates.py         # 20+ strategy templates
│   │   └── __init__.py
│   ├── data/                    # Data providers (NSE, TrueData, etc.)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml           # Full stack orchestration
├── nginx/                       # Reverse proxy config
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# API
VITE_API_URL=http://localhost:8000/api/v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/strategy_builder

# Redis
REDIS_URL=redis://localhost:6379

# Market Data (choose one)
DATA_PROVIDER=mock          # mock | nse | truedata | kite
NSE_API_KEY=your_key
NSE_API_SECRET=your_secret
TRUE_DATA_USERNAME=xxx
TRUE_DATA_PASSWORD=xxx
KITE_API_KEY=xxx
KITE_API_SECRET=xxx
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
```

## 📚 API Documentation

### Market Data
```
GET  /api/v1/market/option-chain?underlying=NIFTY&exchange=NSE&expiry_date=2024-01-25
GET  /api/v1/market/underlying-quote?underlying=NIFTY&exchange=NSE
GET  /api/v1/market/expiries?underlying=NIFTY&exchange=NSE
```

### Strategy Management
```
POST   /api/v1/strategies              # Create strategy
GET    /api/v1/strategies              # List strategies
GET    /api/v1/strategies/:id          # Get strategy
PUT    /api/v1/strategies/:id          # Update strategy
DELETE /api/v1/strategies/:id          # Delete strategy
```

### Analytics
```
POST /api/v1/analytics/payoff          # Calculate payoff curve
POST /api/v1/analytics/greeks          # Calculate portfolio Greeks
POST /api/v1/analytics/scenario        # Scenario analysis
```

### Templates
```
GET  /api/v1/templates                 # List all templates
GET  /api/v1/templates/:id             # Get template details
POST /api/v1/templates/generate        # Generate legs from template
```

### WebSocket
```
WS /ws/market-data                     # Real-time market data
```

## 🧮 Pricing Engine API (Standalone)

The pricing engine can run independently for microservice architectures:

```
POST /price              # Single option price + Greeks
POST /price/batch        # Batch pricing
POST /implied-volatility # IV calculation
POST /greeks             # Portfolio Greeks
POST /payoff             # Strategy payoff
```

## 🧪 Testing

```bash
# Frontend
cd frontend
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E tests

# Backend
cd backend
pytest                # Unit tests
pytest --cov=app      # With coverage

# Pricing Engine
cd python
pytest                # Unit tests
python -m bench       # Performance benchmarks
```

## 📈 Performance

| Operation | Latency (p99) | Throughput |
|-----------|--------------|------------|
| Single option price + Greeks | ~50 µs | 20,000/sec |
| 80-leg chain all Greeks | ~45 µs | 22,000/sec |
| IV calculation | ~260 µs | 3,800/sec |
| Strategy payoff (100 points) | ~2 ms | 500/sec |
| Monte Carlo (10k paths) | ~15 ms | 66/sec |

*Benchmarks on Apple M2, Python 3.11, NumPy 1.26*

## 🔌 Extending

### Adding New Strategy Templates
```python
# python/strategies/templates.py
STRATEGY_TEMPLATES["my_custom_strategy"] = StrategyTemplateConfig(
    name="My Custom Strategy",
    description="Description...",
    category=StrategyCategory.INCOME,
    market_view=MarketView.NEUTRAL,
    legs=[
        {"position_type": "BUY", "option_type": "CE", "strike_selection": "ATM", "lots": 1},
        {"position_type": "SELL", "option_type": "CE", "strike_selection": "OTM", "strike_offset": 2, "lots": 1},
    ],
)
```

### Adding New Data Provider
```python
# python/data/providers.py
class MyDataProvider(BaseDataProvider):
    async def get_option_chain(self, params: OptionChainParams) -> OptionChainResponse:
        # Implementation
        pass
    
    async def get_underlying_quote(self, underlying: str, exchange: str) -> UnderlyingQuote:
        # Implementation
        pass
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

**This software is for educational and research purposes only.** Trading in derivatives involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results. The authors are not responsible for any financial losses incurred through the use of this software.

Always:
- Test thoroughly in paper trading mode
- Understand the risks of each strategy
- Never trade with money you cannot afford to lose
- Consult with a qualified financial advisor

## 🙏 Acknowledgments

- [OpenGreeks](https://github.com/marketcalls/opengreeks) - High-performance Greeks engine
- [OpenAlgo](https://github.com/marketcalls/openalgo) - Open-source trading platform architecture
- [Mibian](https://github.com/mibian/mibian) - Black-Scholes reference implementation
- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- [TanStack Query](https://tanstack.com/query) - Server state management
- [Zustand](https://github.com/pmndrs/zustand) - Client state management

---

**Built with ❤️ for the open-source trading community**

[⭐ Star this repo](https://github.com/yourusername/open-strategy-builder) if you find it useful!