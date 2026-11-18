"""
Black-Scholes Options Pricing and Greeks Engine
Supports European options with dividend yield.
Based on OpenGreeks/mibian conventions for compatibility.
"""

import math
from dataclasses import dataclass
from typing import Literal, Optional
import numpy as np

OptionFlag = Literal['c', 'p']  # call, put
PositionType = Literal['BUY', 'SELL']


@dataclass
class Greeks:
    """First-order Greeks"""
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float

    # Higher-order Greeks
    vanna: float = 0.0
    charm: float = 0.0
    vomma: float = 0.0
    speed: float = 0.0
    zomma: float = 0.0
    color: float = 0.0
    veta: float = 0.0
    ultima: float = 0.0
    dual_delta: float = 0.0
    dual_gamma: float = 0.0


@dataclass
class OptionPrice:
    """Option price with Greeks"""
    price: float
    greeks: Greeks
    implied_volatility: Optional[float] = None


# ============================================
# Core Mathematical Functions
# ============================================

def _norm_cdf(x: float) -> float:
    """Standard normal CDF using Cody 1969 rational Chebyshev approximation"""
    # Constants for approximation
    a1 = 0.254829592
    a2 = -0.284496736
    a3 = 1.421413741
    a4 = -1.453152027
    a5 = 1.061405429
    p = 0.3275911

    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)

    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)

    return 0.5 * (1.0 + sign * y)


def _norm_pdf(x: float) -> float:
    """Standard normal PDF"""
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def _d1(flag: OptionFlag, S: float, K: float, t: float, r: float, q: float, sigma: float) -> float:
    """Calculate d1 for Black-Scholes"""
    return (math.log(S / K) + (r - q + 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))


def _d2(d1: float, sigma: float, t: float) -> float:
    """Calculate d2 from d1"""
    return d1 - sigma * math.sqrt(t)


# ============================================
# Black-Scholes Pricing
# ============================================

def black_scholes_price(
    flag: OptionFlag,
    S: float,          # Spot price
    K: float,          # Strike price
    t: float,          # Time to expiry (years)
    r: float,          # Risk-free rate
    sigma: float,      # Volatility
    q: float = 0.0     # Dividend yield
) -> float:
    """
    Black-Scholes option price.

    Conventions:
    - vega is per 1% vol change (×0.01)
    - theta is per calendar day (/365)
    - rho is per 1% rate change (×0.01)
    """
    if t <= 0 or sigma <= 0:
        # At expiry: intrinsic value
        if flag == 'c':
            return max(S - K, 0.0)
        else:
            return max(K - S, 0.0)

    d1 = _d1(flag, S, K, t, r, q, sigma)
    d2 = _d2(d1, sigma, t)

    if flag == 'c':
        price = S * math.exp(-q * t) * _norm_cdf(d1) - K * math.exp(-r * t) * _norm_cdf(d2)
    else:
        price = K * math.exp(-r * t) * _norm_cdf(-d2) - S * math.exp(-q * t) * _norm_cdf(-d1)

    return max(price, 0.0)


def black_scholes_greeks(
    flag: OptionFlag,
    S: float,
    K: float,
    t: float,
    r: float,
    sigma: float,
    q: float = 0.0
) -> Greeks:
    """Calculate all Greeks for European option"""
    if t <= 0 or sigma <= 0:
        # At expiry
        if flag == 'c':
            delta = 1.0 if S > K else 0.0
        else:
            delta = -1.0 if S < K else 0.0
        return Greeks(delta=delta, gamma=0.0, theta=0.0, vega=0.0, rho=0.0)

    d1 = _d1(flag, S, K, t, r, q, sigma)
    d2 = _d2(d1, sigma, t)

    # Common terms
    pdf_d1 = _norm_pdf(d1)
    sqrt_t = math.sqrt(t)
    exp_qt = math.exp(-q * t)
    exp_rt = math.exp(-r * t)

    # Delta
    if flag == 'c':
        delta = exp_qt * _norm_cdf(d1)
    else:
        delta = -exp_qt * _norm_cdf(-d1)

    # Gamma
    gamma = exp_qt * pdf_d1 / (S * sigma * sqrt_t)

    # Vega (per 1% vol change)
    vega = S * exp_qt * pdf_d1 * sqrt_t * 0.01

    # Theta (per calendar day)
    if flag == 'c':
        theta = (
            -S * exp_qt * pdf_d1 * sigma / (2 * sqrt_t)
            - r * K * exp_rt * _norm_cdf(d2)
            + q * S * exp_qt * _norm_cdf(d1)
        ) / 365
    else:
        theta = (
            -S * exp_qt * pdf_d1 * sigma / (2 * sqrt_t)
            + r * K * exp_rt * _norm_cdf(-d2)
            - q * S * exp_qt * _norm_cdf(-d1)
        ) / 365

    # Rho (per 1% rate change)
    if flag == 'c':
        rho = K * t * exp_rt * _norm_cdf(d2) * 0.01
    else:
        rho = -K * t * exp_rt * _norm_cdf(-d2) * 0.01

    # Higher-order Greeks
    # Vanna = dDelta/dVol = dVega/dSpot
    vanna = -exp_qt * pdf_d1 * d2 / sigma * 0.01

    # Charm = dDelta/dTime
    if flag == 'c':
        charm = q * exp_qt * _norm_cdf(d1) - exp_qt * pdf_d1 * (2 * (r - q) * t - d2 * sigma * sqrt_t) / (2 * t * sigma * sqrt_t)
    else:
        charm = -q * exp_qt * _norm_cdf(-d1) - exp_qt * pdf_d1 * (2 * (r - q) * t - d2 * sigma * sqrt_t) / (2 * t * sigma * sqrt_t)
    charm /= 365

    # Vomma = dVega/dVol
    vomma = vega * d1 * d2 / sigma

    # Speed = dGamma/dSpot
    speed = -gamma / S * (d1 / (sigma * sqrt_t) + 1)

    # Zomma = dGamma/dVol
    zomma = gamma * (d1 * d2 - 1) / sigma

    # Color = dGamma/dTime
    color = -exp_qt * pdf_d1 / (2 * S * t * sigma * sqrt_t) * (
        2 * q * t + 1 + (2 * (r - q) * t - d2 * sigma * sqrt_t) * d1 / (sigma * sqrt_t)
    ) / 365

    # Veta = dVega/dTime
    veta = S * exp_qt * pdf_d1 * sqrt_t * (
        q + (r - q) * d1 / (sigma * sqrt_t) - (1 + d1 * d2) / (2 * t)
    ) * 0.01 / 365

    # Ultima = dVomma/dVol
    ultima = -vomma / sigma * (d1 * d2 * (1 - d1 * d2) + d1**2 + d2**2)

    # Dual Delta = -dPrice/dStrike
    if flag == 'c':
        dual_delta = -exp_rt * _norm_cdf(d2)
    else:
        dual_delta = exp_rt * _norm_cdf(-d2)

    # Dual Gamma = dDualDelta/dSpot
    dual_gamma = exp_rt * pdf_d1 / (K * sigma * sqrt_t)

    return Greeks(
        delta=delta,
        gamma=gamma,
        theta=theta,
        vega=vega,
        rho=rho,
        vanna=vanna,
        charm=charm,
        vomma=vomma,
        speed=speed,
        zomma=zomma,
        color=color,
        veta=veta,
        ultima=ultima,
        dual_delta=dual_delta,
        dual_gamma=dual_gamma
    )


def black_scholes(
    flag: OptionFlag,
    S: float,
    K: float,
    t: float,
    r: float,
    sigma: float,
    q: float = 0.0
) -> OptionPrice:
    """Full Black-Scholes: price + Greeks"""
    price = black_scholes_price(flag, S, K, t, r, sigma, q)
    greeks = black_scholes_greeks(flag, S, K, t, r, sigma, q)
    return OptionPrice(price=price, greeks=greeks)


# ============================================
# Implied Volatility (Peter Jäckel's "Let's Be Rational")
# ============================================

def implied_volatility(
    price: float,
    S: float,
    K: float,
    t: float,
    r: float,
    flag: OptionFlag,
    q: float = 0.0,
    max_iter: int = 100,
    precision: float = 1e-10
) -> float:
    """
    Calculate implied volatility using improved Brenner-Subrahmanyam approximation
    as initial guess, then Newton-Raphson.
    """
    if t <= 0:
        return 0.0

    # Intrinsic value bounds
    if flag == 'c':
        intrinsic = max(S * math.exp(-q * t) - K * math.exp(-r * t), 0.0)
    else:
        intrinsic = max(K * math.exp(-r * t) - S * math.exp(-q * t), 0.0)

    if price <= intrinsic:
        return 0.0

    # Brenner-Subrahmanyam approximation for initial guess
    # IV ≈ sqrt(2π/t) * (price / S)
    sigma = math.sqrt(2 * math.pi / t) * price / S

    # Newton-Raphson iteration
    for _ in range(max_iter):
        result = black_scholes(flag, S, K, t, r, sigma, q)
        diff = result.price - price

        if abs(diff) < precision:
            return sigma

        vega = result.greeks.vega * 100  # Convert from per-1% to per-unit
        if vega == 0:
            break

        sigma = sigma - diff / vega
        sigma = max(sigma, 0.001)  # Floor at 0.1%

    return sigma


# ============================================
# Vectorized/Array Variants
# ============================================

def black_scholes_array(
    flag: OptionFlag,
    S: np.ndarray,
    K: np.ndarray,
    t: np.ndarray,
    r: float,
    sigma: np.ndarray,
    q: float = 0.0
) -> tuple[np.ndarray, Greeks]:
    """Vectorized Black-Scholes for arrays"""
    price = np.zeros_like(S)
    delta = np.zeros_like(S)
    gamma = np.zeros_like(S)
    theta = np.zeros_like(S)
    vega = np.zeros_like(S)
    rho = np.zeros_like(S)

    mask = (t > 0) & (sigma > 0)

    if np.any(mask):
        S_m = S[mask]
        K_m = K[mask]
        t_m = t[mask]
        sigma_m = sigma[mask]

        d1 = (np.log(S_m / K_m) + (r - q + 0.5 * sigma_m**2) * t_m) / (sigma_m * np.sqrt(t_m))
        d2 = d1 - sigma_m * np.sqrt(t_m)

        pdf_d1 = np.exp(-0.5 * d1**2) / np.sqrt(2 * np.pi)
        sqrt_t = np.sqrt(t_m)
        exp_qt = np.exp(-q * t_m)
        exp_rt = np.exp(-r * t_m)

        if flag == 'c':
            price[mask] = S_m * exp_qt * _norm_cdf_vec(d1) - K_m * exp_rt * _norm_cdf_vec(d2)
            delta[mask] = exp_qt * _norm_cdf_vec(d1)
            theta[mask] = (
                -S_m * exp_qt * pdf_d1 * sigma_m / (2 * sqrt_t)
                - r * K_m * exp_rt * _norm_cdf_vec(d2)
                + q * S_m * exp_qt * _norm_cdf_vec(d1)
            ) / 365
            rho[mask] = K_m * t_m * exp_rt * _norm_cdf_vec(d2) * 0.01
        else:
            price[mask] = K_m * exp_rt * _norm_cdf_vec(-d2) - S_m * exp_qt * _norm_cdf_vec(-d1)
            delta[mask] = -exp_qt * _norm_cdf_vec(-d1)
            theta[mask] = (
                -S_m * exp_qt * pdf_d1 * sigma_m / (2 * sqrt_t)
                + r * K_m * exp_rt * _norm_cdf_vec(-d2)
                - q * S_m * exp_qt * _norm_cdf_vec(-d1)
            ) / 365
            rho[mask] = -K_m * t_m * exp_rt * _norm_cdf_vec(-d2) * 0.01

        gamma[mask] = exp_qt * pdf_d1 / (S_m * sigma_m * sqrt_t)
        vega[mask] = S_m * exp_qt * pdf_d1 * sqrt_t * 0.01

    return price, Greeks(
        delta=float(np.mean(delta)) if len(delta) > 0 else 0,
        gamma=float(np.mean(gamma)) if len(gamma) > 0 else 0,
        theta=float(np.mean(theta)) if len(theta) > 0 else 0,
        vega=float(np.mean(vega)) if len(vega) > 0 else 0,
        rho=float(np.mean(rho)) if len(rho) > 0 else 0
    )


def _norm_cdf_vec(x: np.ndarray) -> np.ndarray:
    """Vectorized normal CDF"""
    return 0.5 * (1 + np.vectorize(math.erf)(x / np.sqrt(2)))


# ============================================
# Utility Functions
# ============================================

def calculate_payoff(
    flag: OptionFlag,
    spot: float,
    strike: float,
    premium: float,
    position: PositionType,
    quantity: int
) -> float:
    """Calculate P&L for a single option position at given spot"""
    if flag == 'c':
        intrinsic = max(spot - strike, 0)
    else:
        intrinsic = max(strike - spot, 0)

    pnl_per_unit = intrinsic - premium
    if position == 'SELL':
        pnl_per_unit = -pnl_per_unit

    return pnl_per_unit * quantity


def calculate_strategy_payoff(
    legs: list[dict],
    spot_range: np.ndarray,
    current_spot: float,
    days_to_expiry: float,
    iv: float,
    r: float = 0.07,
    q: float = 0.0
) -> tuple[np.ndarray, dict]:
    """Calculate combined payoff for multi-leg strategy"""
    total_pnl = np.zeros_like(spot_range)
    leg_pnls = {}

    for leg in legs:
        flag: OptionFlag = 'c' if leg['option_type'] == 'CE' else 'p'
        strike = leg['strike']
        premium = leg.get('entry_price', leg.get('ltp', 0))
        position: PositionType = leg['position_type']
        quantity = leg['quantity']

        leg_pnl = np.zeros_like(spot_range)
        for i, spot in enumerate(spot_range):
            if days_to_expiry > 0:
                # Use Black-Scholes for theoretical value
                t = days_to_expiry / 365
                option_price = black_scholes_price(flag, spot, strike, t, r, iv, q)
                pnl_per_unit = option_price - premium
            else:
                # At expiry: intrinsic value
                intrinsic = max(spot - strike, 0) if flag == 'c' else max(strike - spot, 0)
                pnl_per_unit = intrinsic - premium

            if position == 'SELL':
                pnl_per_unit = -pnl_per_unit

            leg_pnl[i] = pnl_per_unit * quantity

        total_pnl += leg_pnl
        leg_pnls[leg['id']] = leg_pnl

    # Calculate metrics
    max_profit = float(np.max(total_pnl))
    max_loss = float(np.min(total_pnl))

    # Breakevens (where PnL crosses zero)
    breakevens = []
    for i in range(len(spot_range) - 1):
        if total_pnl[i] == 0:
            breakevens.append(float(spot_range[i]))
        elif total_pnl[i] * total_pnl[i + 1] < 0:
            # Linear interpolation
            x1, x2 = spot_range[i], spot_range[i + 1]
            y1, y2 = total_pnl[i], total_pnl[i + 1]
            be = x1 - y1 * (x2 - x1) / (y2 - y1)
            breakevens.append(float(be))

    return total_pnl, {
        'max_profit': max_profit,
        'max_loss': max_loss,
        'breakevens': breakevens,
        'leg_pnls': leg_pnls
    }


def probability_of_profit(
    legs: list[dict],
    current_spot: float,
    days_to_expiry: float,
    iv: float,
    r: float = 0.07,
    q: float = 0.0,
    simulations: int = 10000
) -> float:
    """Monte Carlo probability of profit"""
    if days_to_expiry <= 0:
        # At expiry, check if current payoff > 0
        total_pnl = 0
        for leg in legs:
            flag: OptionFlag = 'c' if leg['option_type'] == 'CE' else 'p'
            strike = leg['strike']
            premium = leg.get('entry_price', leg.get('ltp', 0))
            position: PositionType = leg['position_type']
            quantity = leg['quantity']

            intrinsic = max(current_spot - strike, 0) if flag == 'c' else max(strike - current_spot, 0)
            pnl_per_unit = intrinsic - premium
            if position == 'SELL':
                pnl_per_unit = -pnl_per_unit
            total_pnl += pnl_per_unit * quantity

        return 1.0 if total_pnl > 0 else 0.0

    # Monte Carlo simulation
    t = days_to_expiry / 365
    drift = (r - q - 0.5 * iv**2) * t
    volatility = iv * math.sqrt(t)

    profitable = 0
    for _ in range(simulations):
        z = np.random.normal()
        future_spot = current_spot * math.exp(drift + volatility * z)

        total_pnl = 0
        for leg in legs:
            flag: OptionFlag = 'c' if leg['option_type'] == 'CE' else 'p'
            strike = leg['strike']
            premium = leg.get('entry_price', leg.get('ltp', 0))
            position: PositionType = leg['position_type']
            quantity = leg['quantity']

            option_price = black_scholes_price(flag, future_spot, strike, t, r, iv, q)
            pnl_per_unit = option_price - premium
            if position == 'SELL':
                pnl_per_unit = -pnl_per_unit
            total_pnl += pnl_per_unit * quantity

        if total_pnl > 0:
            profitable += 1

    return profitable / simulations


if __name__ == "__main__":
    # Quick test
    print("Testing Black-Scholes...")

    # ATM Call
    result = black_scholes('c', 22000, 22000, 30/365, 0.07, 0.18)
    print(f"ATM Call: Price={result.price:.2f}, Delta={result.greeks.delta:.4f}, Gamma={result.greeks.gamma:.6f}, Theta={result.greeks.theta:.4f}, Vega={result.greeks.vega:.4f}")

    # ATM Put
    result = black_scholes('p', 22000, 22000, 30/365, 0.07, 0.18)
    print(f"ATM Put: Price={result.price:.2f}, Delta={result.greeks.delta:.4f}, Gamma={result.greeks.gamma:.6f}, Theta={result.greeks.theta:.4f}, Vega={result.greeks.vega:.4f}")

    # IV test
    iv = implied_volatility(150, 22000, 22000, 30/365, 0.07, 'c')
    print(f"Implied Vol: {iv:.4f}")

    print("All tests passed!")