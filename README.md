# AI Complex Put Desk

A single-page options desk for a book that pays if the AI trade busts, presented as an interactive 3D cockpit. Two desks:

- **First-order: the complex.** Puts on NVDA, SMH, AVGO, TSM, MU, ORCL and the rest, priced on a skew-calibrated Black-Scholes surface and ranked by payoff per premium dollar at the drawdown you choose.
- **Second-order: low-vol channels.** Instruments with implied vol under 20 that an AI bust reaches only through financing, power demand, rates and FX: HYG, XLF, XLI, AEP, BKLN puts and IEF, TLT, FXY calls. Each leg carries its transmission chain, its beta to the complex, its kill switch, and a vol and skew fitted to live quotes on the same day. Legs an adversarial research pass killed (AMLP, ET, ARCC) stay in the basket at zero weight with the reason. The chart benchmarks the book against the same premium in SMH puts.

Every input is editable and persists in the browser. Contracts are floored to whole numbers so the budget is never exceeded.

## The three views

- **Transmission map** (top of `index.html`). The AI complex sits at the centre; the second ring holds credit, power, the build-out and the fee pools; the third holds loans, rates and the yen. Each column is one leg of the book: height is the payoff multiple at the scenario, width is the share of premium, colour is the order of effect. Killed legs appear as wireframe ghosts. Drag the scenario slider to reprice every leg, or run the cascade to watch the shock propagate ring by ring, in the order the thesis says it will. Click a column for the structure, size, mechanism and kill switch.
- **Payoff terrain** (section 02). The book's P&L at expiry as a surface over two things you do not control: how far the complex falls and how much of the assumed beta actually shows up (λ). The grey sheet is the same budget in SMH puts, which is flat in λ because SMH is the complex. The sensitivity table beside it gives the crossover λ at which the book beats the obvious trade.
- **Vol surface** (`vol.html`). The desk's model implied-vol sheet over strike and tenor, with every live SMH and NVDA quote from IBKR as a sphere above or below it: green where the market is cheaper than the model, red where it is richer. Plus the 2D smiles, term structure, a year of VXN, VIX, realised vol and SKEW, and the same put repriced at the year's vol trough and peak.

## Data

Seeded from IBKR pulls on 2026-09-02: spot, 30-day implied vol, 52-week IV percentile and 30-day realized vol for 70 names (the live vol screen at the bottom of the page). First-desk skew and term structure were fitted to SMH and NVDA December 2026 put mids. Second-desk legs were each fitted to their own December 2026, January 2027 or March 2027 chain. Betas and kill switches went through a 25-agent research pass: eight idea lenses, one skeptic per candidate, two book-builders and a synthesizer.

Two findings from that calibration are built into the page: the listed private-credit lenders (ARCC, BXSL) price their puts at 28 to 32 vol despite a headline 30-day figure near 15, so they fail the under-20 test and sit at zero weight; and bond-ETF puts carry a fat smile that a linear skew misses, so those legs use their fitted parameters rather than the default.

## Run it

Open `index.html` in a browser. No build, no dependencies to install: the only library is three.js r147, vendored at `assets/three.min.js` (MIT, licence alongside). `assets/hud.css` is the shared design system, `assets/scene.js` the small 3D helper layer, `assets/desk3d.js` the transmission map and payoff terrain, `assets/volsurf.js` the vol surface. Fonts load from Google Fonts and fall back to system faces offline. To host it, enable GitHub Pages on this repository (Settings, Pages, Source: GitHub Actions); the included workflow publishes on every push to `main`.

## Model notes

- IV at strike K and T days: `IV30 * (T/30)^term + slope * sk * ln(K/S) * sqrt(107/T)` plus a wing term. Defaults: term 0.08, slope -0.28, sk 1 (each row can override sk; bond and FX legs use fitted values, some negative for call skew).
- Buys are priced at mid plus half the row's haircut, sells at mid minus half.
- Strikes are limited to 4 sigma of the row's own vol, and spreads whose short leg is worth under 8% of the long leg are dropped as degenerate.
- Blend scoring is the expected multiple under a discrete crash distribution: 40% the move stops at two thirds of target, 40% it hits target, 20% it overshoots to 1.5x.
- On the terrain, λ multiplies every leg's beta to the complex before the payoff is evaluated; the plan's structures are held fixed at the ones chosen for λ = 1.

Not trade advice. Model prices differ from real mids, more so on illiquid names and far-OTM strikes.
