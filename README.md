# AI Complex Put Desk

A single-page sizing and structure picker for a basket of out-of-the-money puts on the AI trade.

- Prices outright puts, put spreads, and optional 1x2 ratio spreads on a skew-calibrated Black-Scholes surface.
- Ranks every structure by payoff per premium dollar at a chosen drawdown in the "AI complex" factor. Each name moves by an editable beta times that factor.
- Builds a plan inside a premium budget, floors contracts to whole numbers, and shows scenario tables plus a P&L chart against outright-only, spread-only, and SMH-only alternatives.
- Every input is editable and persists in the browser.

Seeded from IBKR snapshots on 2026-09-02: spot, 30-day implied vol, 52-week IV percentile, and 30-day realized vol. Skew and term structure were fitted to live SMH and NVDA December 2026 put mids on the same day. Beta, bid-ask haircut, and weight are estimates. Refresh spot and IV before relying on the output.

## Run it

Open `index.html` in a browser. No build, no dependencies. To host it, enable GitHub Pages on this repository (Settings, Pages, deploy from branch `main`, root) or let the included workflow publish it.

## Model notes

- IV at strike K and T days: `IV30 * (T/30)^term + slope * ln(K/S) * sqrt(107/T)` plus a small wing convexity term. Defaults: term 0.08, slope -0.28.
- Buys are priced at mid plus half the haircut, sells at mid minus half.
- Blend scoring is the expected multiple under a discrete crash distribution: 40% the move stops at two thirds of target, 40% it hits target, 20% it overshoots to 1.5x.

Not trade advice. Model prices differ from real mids, more so on illiquid names.
