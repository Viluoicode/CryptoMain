# Screenshot Checklist

These are the screenshots referenced by the main [`README.md`](../../README.md). Capture them at **1920×1080** (or 1440×900 retina), use **dark mode** (the app is dark-only), and save as **PNG** with descriptive filenames listed below.

## How to capture cleanly

- **Browser**: Chrome / Edge. Hide bookmarks bar (`Ctrl+Shift+B`).
- **DevTools off**, **incognito** to avoid extension overlays.
- **Window size**: 1920×1080 if you have it; otherwise 1440×900 retina works. Avoid 1366×768 — the trading terminal will look cramped.
- **Crop tool**: use Snipping Tool (Win), CleanShot X (macOS), or [Screely](https://www.screely.com/) for browser frame.
- **File size**: optimize via [TinyPNG](https://tinypng.com/) before committing — target < 500 KB per shot.

## Required shots (referenced in README)

| # | File | What to capture | Page / URL |
|---|---|---|---|
| 01 | `01-landing-hero.png` | Hero section with BTC big ticker + headline + CTAs. Scroll position: top of page. | `/` |
| 02 | `02-markets-binance-style.png` | Markets page showing the 3 highlight cards (Gainers / Losers / Volume) and the sparkline table. Need at least 10 rows visible. | `/market` |
| 03 | `03-trade-terminal.png` | Trading terminal full layout: candle chart + order book + recent trades + depth + trading panel. | `/trade` |
| 04 | `04-margin-positions.png` | Margin tab open with at least 1-2 positions showing P&L and liquidation price. | `/orders` (Positions tab) |
| 05 | `05-portfolio.png` | Portfolio page with performance chart + holdings table. | `/portfolio` |
| 06 | `06-leaderboard.png` | Leaderboard table with at least 5 entries, period tabs visible. | `/leaderboard` |

## Optional shots (nice-to-have for blog post / extended gallery)

| # | File | What to capture |
|---|---|---|
| 07 | `07-dashboard.png` | Dashboard with allocation pie chart + Fear & Greed widget + recent transactions |
| 08 | `08-onchain-wallet.png` | On-Chain page after syncing a wallet with native + ERC-20 balances |
| 09 | `09-orders-conditional.png` | Conditional Orders tab with at least 1 pending stop-loss + 1 take-profit |
| 10 | `10-coin-detail.png` | `/market/bitcoin` — lightweight chart + market stats |
| 11 | `11-convert-modal.png` | Convert page with quote shown |
| 12 | `12-watchlist.png` | Watchlist with 5+ starred coins |
| 13 | `13-mobile-landing.png` | Mobile viewport (DevTools 375×812) on landing page |
| 14 | `14-mobile-market.png` | Mobile viewport on markets page |

## Pre-capture setup

For the most impressive shots, seed the demo account first:

1. **Register a fresh demo account** (e.g., `demo@example.com`).
2. **Deposit** to bring balance to e.g. $50,000.
3. **Place a few buys** so portfolio has holdings:
   - 0.5 BTC, 5 ETH, 100 SOL, 1000 DOGE
4. **Open a Long position** on BTC with 5x leverage so the margin shot has data.
5. **Set 2-3 conditional orders** (stop-loss, take-profit) so that tab isn't empty.
6. **Add 8 coins to watchlist** so Favorites tab in Markets has content.
7. **Wait 30 seconds** after opening the trade terminal so the chart populates fully.
8. **Sync one on-chain wallet** (Vitalik's address `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` works publicly).

## Capturing the Open Graph image (auto-generated)

The OG cover at `crypto-frontend/public/og-cover.svg` is hand-drawn SVG. To verify it renders correctly on social platforms:

1. Deploy the frontend (or run locally with a public tunnel like `ngrok`)
2. Test at https://www.opengraph.xyz/ by entering your URL
3. The image should render at 1200×630 with the headline + trust badges

## Recording a demo video

For the `🎬 Demo Video` link in the README, record a **2-3 minute walkthrough**:

1. **0:00-0:15** — Landing page scroll
2. **0:15-0:30** — Register flow (or skip if you have demo account)
3. **0:30-0:50** — Dashboard + portfolio overview
4. **0:50-1:30** — Markets page + click into a coin + add to watchlist
5. **1:30-2:15** — Trading terminal: zoom chart, toggle indicators, place a buy
6. **2:15-2:45** — Open margin position + show liquidation price
7. **2:45-3:00** — Leaderboard + export PNG

Tools: **OBS Studio** (free) for recording, **HandBrake** for compression, upload to YouTube as unlisted and link in README.
