# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Full project reference** (frontend + backend) is at `../CLAUDE.md` (one level up).
> Read that file first — it covers all architecture, endpoints, hooks, types, business rules, and build info.

---

## Quick Reference — Frontend Only

### Commands
```bash
npm run dev      # dev server :5173
npm run build    # production build → dist/
npm run lint     # ESLint
```

### Path alias
`@/` → `src/`

### Entry points
- `src/main.tsx` — ReactDOM root, QueryClient config, BrowserRouter, ToastProvider
- `src/App.tsx`  — all routes, lazy-loaded pages, ErrorBoundary, PriceAlertWatcher
- `src/api/client.ts` — axios instance, token storage, auto-refresh interceptor

### Environment variable
```
VITE_API_URL=https://localhost:7103   # in .env.local
```

### Key gotchas (frontend)
- All pages are **named exports**: `export function DashboardPage()` — lazy import: `.then(m => ({ default: m.DashboardPage }))`
- `GlobalMarketBar` is only in `AppLayout` — never import it in individual pages
- `/trade` uses `overflow-hidden flex flex-col` layout (controlled by `isTerminal` flag in AppLayout)
- `createTransaction` requires CoinGecko `coinId` (e.g. `bitcoin`), not symbol
- `BOLL` indicator goes on `candle_pane`, not a separate pane
- KLineChart `init()` returns `Nullable<Chart>` — always null-check before use
- Dark-only app: `dark` class always on `<html>`, never togglable
- Binance WS trade ID: use `data.t` (`number`) as React key — never `data.T` (timestamp, causes duplicates)
- `useMetaMask` uses raw `window.ethereum` — no wagmi/web3modal dependency
- `html-to-image` installed for PNG export in LeaderboardPage
