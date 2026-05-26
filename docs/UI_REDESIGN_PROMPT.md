# UI Redesign Prompt — CryptoDash Frontend

> **How to use this file**: Copy the entire content below (between the `===` markers) and paste it into any AI design tool (v0.dev, Bolt.new, Lovable, ChatGPT, Claude, Cursor). The AI will have everything it needs to produce a new UI that drops cleanly into the existing project without breaking backend integration.

---

```
═══════════════════════════════════════════════════════════════════════════
COPY EVERYTHING BELOW THIS LINE
═══════════════════════════════════════════════════════════════════════════
```

# 🎯 Mission

Redesign the entire frontend UI for **CryptoDash** — a crypto portfolio simulator + trading terminal. The backend, all API contracts, all TypeScript types, all hooks/stores, all routes, and all business logic are **fixed and must not change**. You are only redesigning the visual layer (pages, components, styling, layout).

After redesign, the app must **drop into the existing codebase** and run with no backend changes.

---

# 1. Design direction (REPLACE THIS SECTION WITH YOUR PREFERRED STYLE)

> ⚠️ **The user MUST fill this in before sending the prompt.** Pick one or write your own.

Choose one direction and delete the rest:

- **A. Bloomberg Terminal feel** — dense, professional, monospace-heavy, green/amber on black, information density > whitespace, multiple panels per screen.
- **B. Modern fintech (Stripe/Linear feel)** — generous whitespace, soft shadows, neutral palette with 1 accent color, focus on typography, single CTA per screen.
- **C. Web3/DeFi (Uniswap/Aave feel)** — glassmorphism, gradient accents (purple/pink), rounded XL corners, playful animations, big numbers.
- **D. Minimalist mono (Vercel/Notion feel)** — black/white/gray only with optional 1 accent, sans-serif everything, no gradients, hairline borders.
- **E. Game-like / cyberpunk** — neon edges, scanlines, animated borders, bold display fonts, energetic colors.
- **F. Custom** — describe in detail: palette (hex codes), typography (font names), corner radius, density, mood references (Dribbble/Behance links).

**Constraint**: app is **dark-only** (no light mode toggle). Design accordingly.

---

# 2. Tech stack (FIXED — DO NOT CHANGE)

You **must** use exactly these libraries and tools. Do not propose alternatives.

- **Framework**: React 18 + TypeScript + Vite
- **Path alias**: `@/` → `src/`
- **Styling**: Tailwind CSS v3 (utility-first, no CSS modules, no styled-components)
- **State**: Zustand (existing stores — do not replace) + TanStack Query v5 (existing hooks — do not replace)
- **Forms**: React Hook Form + Zod
- **Routing**: React Router DOM v6 (existing routes — do not change paths)
- **HTTP**: Axios (existing instance in `@/api/client` — do not replace)
- **Charts**:
  - `klinecharts` v9 — already wired in `/trade` page (KEEP)
  - `lightweight-charts` — already wired in `/market/:coinId` (KEEP)
  - `recharts` — for dashboard/portfolio (KEEP)
- **Icons**: `lucide-react` (KEEP)
- **PNG export**: `html-to-image` (KEEP, used in `/leaderboard`)
- **Toasts**: existing `useToast` from `@/components/ui/Toast` (KEEP)

You **may add** small UI utility libraries if needed (e.g. `cmdk` for command palette, `vaul` for drawer, `sonner` for fancier toasts) — but justify the addition.

---

# 3. Routes (FIXED)

All 19 routes below already exist with lazy-loaded components. The new UI must implement all of them. Component file names and named exports must stay the same so `App.tsx` doesn't need to change.

| Path | Component file | Auth | Purpose |
|---|---|---|---|
| `/` | `pages/LandingPage.tsx` → `LandingPage` | Public | Marketing landing |
| `/login` | `pages/auth/LoginPage.tsx` → `LoginPage` | Guest | Sign in form |
| `/register` | `pages/auth/RegisterPage.tsx` → `RegisterPage` | Guest | Sign up form |
| `/market` | `pages/MarketPage.tsx` → `MarketPage` | Public | Top 100 coins, sortable, sparklines |
| `/market/:coinId` | `pages/CoinDetailPage.tsx` → `CoinDetailPage` | Public | Single coin price chart + stats |
| `/dashboard` | `pages/DashboardPage.tsx` → `DashboardPage` | Protected | Portfolio overview |
| `/wallets` | `pages/WalletsPage.tsx` → `WalletsPage` | Protected | List wallets, create/rename/delete/transfer |
| `/wallets/:id` | `pages/WalletDetailPage.tsx` → `WalletDetailPage` | Protected | Holdings + transactions for one wallet |
| `/portfolio` | `pages/PortfolioPage.tsx` → `PortfolioPage` | Protected | Performance chart + allocation table |
| `/convert` | `pages/ConvertPage.tsx` → `ConvertPage` | Protected | Simulated coin swap UI |
| `/transactions` | `pages/TransactionsPage.tsx` → `TransactionsPage` | Protected | Paginated history with filters + CSV export |
| `/watchlist` | `pages/WatchlistPage.tsx` → `WatchlistPage` | Protected | Starred coins |
| `/alerts` | `pages/PriceAlertsPage.tsx` → `PriceAlertsPage` | Protected | Price alert CRUD |
| `/trade` | `pages/FuturesPage.tsx` → `FuturesPage` | Protected | **Full trading terminal** (KLineChart, order book, depth, trades, panel) |
| `/orders` | `pages/FuturesOrdersPage.tsx` → `FuturesOrdersPage` | Protected | Conditional orders + margin positions (tabs) |
| `/onchain` | `pages/OnChainPage.tsx` → `OnChainPage` | Protected | MetaMask connect + external EVM wallet tracking |
| `/leaderboard` | `pages/LeaderboardPage.tsx` → `LeaderboardPage` | Public | Top traders P&L%, period tabs, PNG export |
| `/settings` | `pages/SettingsPage.tsx` → `SettingsPage` | Protected | Profile update + change password + logout |
| `*` | `pages/NotFoundPage.tsx` → `NotFoundPage` | Public | 404 |

**Layout components** (do not rename):
- `components/layout/PublicLayout.tsx` — header for public market pages
- `components/layout/AppLayout.tsx` — sidebar + topbar for protected pages; **must contain** `<Outlet />`; **must hide its padding on `/trade`** (terminal needs full viewport)

**Routing rules (FIXED)**:
- All page components must be **named exports** (e.g. `export function DashboardPage()`), never default exports — `App.tsx` imports as `import('@/pages/X').then(m => ({ default: m.X }))`
- Guest-only routes (`/login`, `/register`) auto-redirect to `/dashboard` if already authenticated
- Protected routes auto-redirect to `/login` with `state.from` preserved
- After manual logout, redirect to `/` (landing)

---

# 4. API contracts (FIXED — backend will not change)

Base URL: `import.meta.env.VITE_API_URL ?? 'https://localhost:7103'`, all calls prefixed `/api`.

All endpoints return JSON. Authenticated endpoints require `Authorization: Bearer <token>` header (handled by existing axios interceptor — do not touch).

### 4.1 Auth — `/api/auth`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register` | ❌ | `{ username, email, password }` | `{ accessToken, refreshToken, expiresIn, user: { username, email } }` |
| POST | `/login` | ❌ | `{ email, password }` | Same as register |
| POST | `/refresh` | ❌ | `{ refreshToken }` | Same shape, new tokens |
| POST | `/logout` | ✅ | none | `{ message }` |
| POST | `/change-password` | ✅ | `{ currentPassword, newPassword }` | `{ message }` |
| PUT | `/profile` | ✅ | `{ username }` | `{ username, email }` |

Rate limits: `/login` 5 req/min/IP, `/register` 3 req/min/IP.

### 4.2 Wallet — `/api/wallet` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `WalletResponse[]` |
| POST | `/` | `{ name }` | `WalletResponse` (starts with `fiatBalance = 10_000`) |
| GET | `/{id}` | — | `WalletDetailResponse` (holdings live-priced) |
| PUT | `/{id}` | `{ name }` | `WalletResponse` |
| DELETE | `/{id}` | — | 204 |
| POST | `/{id}/deposit` | `{ amount }` (max 1M) | `WalletResponse` |
| POST | `/transfer` | `{ fromWalletId, toWalletId, amount }` | `{ message }` |

### 4.3 Transaction — `/api/transaction` (all `[Authorize]`)

| Method | Path | Query / Body | Response |
|---|---|---|---|
| GET | `/` | `?page&pageSize&type&search&sortBy&sortDir` | `PagedResult<TransactionResponse>` |
| POST | `/` | `CreateTransactionRequest` | `TransactionResponse` (Buy deducts `fiatBalance`, Sell adds it) |
| GET | `/wallet/{walletId}` | paged query | `PagedResult<TransactionResponse>` |
| PUT | `/{id}` | partial update | `TransactionResponse` |
| DELETE | `/{id}` | — | 204 (reverses fiat effect) |
| GET | `/export` | `?type&search` | `text/csv` (up to 10k rows) |

`PagedResult<T> = { items: T[]; total: number; page: number; pageSize: number }`

### 4.4 Portfolio — `/api/portfolio`

| Method | Path | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/` | ✅ | — | `PortfolioSummaryResponse` |
| GET | `/performance` | ✅ | — | `PortfolioPerformanceResponse` |
| GET | `/history` | ✅ | `?days=30` (range 7-365) | `PortfolioHistoryPoint[]` |
| POST | `/snapshot` | ✅ | — | `{ message }` (manual snapshot) |
| GET | `/leaderboard` | ❌ | `?period=1&top=50` (period: 1=Week, 2=Month, 3=AllTime) | `LeaderboardEntry[]` (rate-limited 10/min/IP) |

### 4.5 Orders — `/api/order` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `OrderResponse[]` |
| POST | `/` | `CreateOrderRequest` (optional `Idempotency-Key` header) | `OrderResponse` (status=Pending). Returns 409 on duplicate key. |
| DELETE | `/{id}` | — | 204 (only Pending can be cancelled) |

### 4.6 Positions — `/api/position` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `PositionResponse[]` (open + closed + liquidated) |
| POST | `/` | `OpenPositionRequest` (optional `Idempotency-Key` header) | `PositionResponse` |
| DELETE | `/{id}` | — | `PositionResponse` (closes the position) |

### 4.7 On-Chain Wallet — `/api/onchainwallet` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `OnChainWalletResponse[]` |
| POST | `/` | `AddOnChainWalletRequest` (EVM regex `/^0x[a-fA-F0-9]{40}$/`) | `OnChainWalletResponse` |
| POST | `/{id}/sync` | — | `OnChainWalletResponse` (re-fetches via Alchemy) |
| DELETE | `/{id}` | — | 204 |

### 4.8 Watchlist — `/api/watchlist` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `WatchlistItemResponse[]` |
| POST | `/` | `AddWatchlistRequest` (idempotent) | `WatchlistItemResponse` |
| DELETE | `/{coinId}` | — | 204 |
| GET | `/{coinId}/status` | — | `{ isWatched: boolean }` |
| POST | `/sync` | `AddWatchlistRequest[]` (localStorage → DB on first login) | `WatchlistItemResponse[]` |

### 4.9 Price Alert — `/api/pricealert` (all `[Authorize]`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `PriceAlertResponse[]` |
| POST | `/` | `CreatePriceAlertRequest` | `PriceAlertResponse` |
| DELETE | `/{id}` | — | 204 (hard delete) |

### 4.10 Crypto — `/api/crypto`

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/top` | `?limit=100` | `CryptoListResponse[]` |
| GET | `/{coinId}` | — | `CryptoListResponse` |
| GET | `/{coinId}/history` | `?days=7` | `{ timestamp, price }[]` |
| GET | `/{coinId}/ohlc` | `?days=7` | `{ timestamp, open, high, low, close }[]` |

Rate limit: 30 req/min/IP.

### 4.11 Telemetry — `/api/telemetry`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/errors` | `{ message, stack?, componentStack?, url?, userAgent?, context? }` | 202 Accepted |

(Used by ErrorBoundary — do not call directly from UI components.)

---

# 5. TypeScript types (FIXED — keep in `src/types/index.ts`)

```typescript
// ─── Wallet ──────────────────────────────────────────────────────────────────
export interface WalletResponse {
  id: string
  name: string
  userId: string
  fiatBalance: number
  createdAt: string
  updatedAt: string
}

export interface HoldingResponse {
  coinId: string
  coinSymbol: string
  coinName: string
  image: string
  quantity: number
  averageBuyPrice: number
  currentPrice: number
  currentValue: number
  profitLoss: number
  profitLossPercentage: number
}

export interface WalletDetailResponse {
  id: string
  name: string
  fiatBalance: number
  createdAt: string
  updatedAt: string
  holdings: HoldingResponse[]
  totalValue: number
  transactionCount: number
}

export interface CreateWalletRequest { name: string }
export interface UpdateWalletRequest { name: string }
export interface TransferWalletRequest { fromWalletId: string; toWalletId: string; amount: number }

// ─── Transaction ─────────────────────────────────────────────────────────────
export type TransactionType = 1 | 2   // 1=Buy, 2=Sell

export interface TransactionResponse {
  id: string
  walletId: string
  walletName: string
  coinId: string
  coinSymbol: string
  coinName: string
  type: TransactionType
  typeDisplay: string
  quantity: number
  pricePerCoin: number
  totalAmount: number
  transactionDate: string
  notes: string | null
}

export interface CreateTransactionRequest {
  walletId: string
  coinId: string
  type: TransactionType
  quantity: number
  pricePerCoin: number
  notes?: string
  transactionDate?: string
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export interface PortfolioCoinAllocation {
  coinId: string; coinSymbol: string; coinName: string; image: string
  quantity: number; currentPrice: number; currentValue: number
  investedValue: number; allocationPercentage: number
}

export interface PortfolioSummaryResponse {
  walletCount: number
  totalTransactionCount: number
  totalCurrentValue: number
  totalInvestedValue: number
  totalProfitLoss: number
  totalProfitLossPercentage: number
  allocations: PortfolioCoinAllocation[]
}

export interface PortfolioPerformanceResponse {
  totalBuyAmount: number; totalSellAmount: number
  netInvested: number; currentPortfolioValue: number
  unrealizedProfitLoss: number; unrealizedProfitLossPercentage: number
  totalBuyTransactions: number; totalSellTransactions: number
}

export interface PortfolioHistoryPoint {
  date: string; totalValue: number; totalInvested: number; profitLoss: number
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItemResponse { id: string; coinId: string; coinSymbol: string; createdAt: string }
export interface AddWatchlistRequest    { coinId: string; coinSymbol: string }

// ─── Price Alert ──────────────────────────────────────────────────────────────
export type AlertDirection = 1 | 2   // 1=Above, 2=Below
export interface PriceAlertResponse {
  id: string; coinId: string; coinSymbol: string; coinName: string
  targetPrice: number; direction: AlertDirection; directionDisplay: string; createdAt: string
}
export interface CreatePriceAlertRequest {
  coinId: string; coinSymbol: string; coinName: string; targetPrice: number; direction: AlertDirection
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export type OrderSide   = 1 | 2          // 1=Buy, 2=Sell
export type OrderType   = 1 | 2 | 3      // 1=StopLoss, 2=TakeProfit, 3=Limit
export type OrderStatus = 1 | 2 | 3 | 4  // 1=Pending, 2=Filled, 3=Cancelled, 4=Failed
export interface OrderResponse {
  id: string; walletId: string; walletName: string
  coinId: string; coinSymbol: string; coinName: string
  side: OrderSide; type: OrderType; status: OrderStatus
  triggerPrice: number; quantity: number
  createdAt: string; filledAt: string | null; cancelledAt: string | null
  filledPrice: number | null; failureReason: string | null; transactionId: string | null
}
export interface CreateOrderRequest {
  walletId: string; coinId: string
  side: OrderSide; type: OrderType
  triggerPrice: number; quantity: number
}

// ─── Margin Positions ────────────────────────────────────────────────────────
export type PositionSide   = 1 | 2     // 1=Long, 2=Short
export type PositionStatus = 1 | 2 | 3 // 1=Open, 2=Closed, 3=Liquidated
export interface PositionResponse {
  id: string; walletId: string; walletName: string
  coinId: string; coinSymbol: string; coinName: string
  side: PositionSide; status: PositionStatus
  entryPrice: number; quantity: number; leverage: number
  collateralAmount: number; liquidationPrice: number
  exitPrice: number | null; realizedPnL: number | null; closeReason: string | null
  openedAt: string; closedAt: string | null
  // Live-enriched fields (server adds them for open positions)
  currentPrice: number | null
  unrealizedPnL: number | null
  unrealizedPnLPercentage: number | null
  marginRatio: number | null
}
export interface OpenPositionRequest {
  walletId: string; coinId: string
  side: PositionSide; quantity: number; leverage: number
}

// ─── On-Chain Wallet ─────────────────────────────────────────────────────────
export interface TokenBalance {
  symbol: string; name: string; contractAddress: string
  balance: number; decimals: number
}
export interface OnChainWalletResponse {
  id: string; address: string; label: string; chain: string
  nativeBalance: number; nativeSymbol: string
  tokens: TokenBalance[]
  createdAt: string; lastSyncedAt: string | null
}
export interface AddOnChainWalletRequest {
  address: string; label: string; chain: string   // "ethereum" | "polygon" | "bsc" | "arbitrum"
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export type LeaderboardPeriod = 1 | 2 | 3 // 1=Week, 2=Month, 3=AllTime
export interface LeaderboardEntry {
  rank: number; userId: string; username: string
  profitLossPercentage: number; currentValue: number
  startValue: number; transactionCount: number
}

// ─── Crypto (live + sparkline) ───────────────────────────────────────────────
export interface CryptoListResponse {
  id: string; symbol: string; name: string; image: string
  currentPrice: number; priceChangePercentage24h: number
  marketCap: number; totalVolume: number
  high24h: number; low24h: number
  sparkline7d?: number[] | null
}
```

---

# 6. Existing hooks/stores (FIXED — REUSE, do not replace)

### Stores (Zustand)

| File | What it exposes |
|---|---|
| `@/store/authStore` | `{ user, isAuthenticated, isLoading, error, login, register, logout, initialize, updateUsername, clearError }` |
| `@/store/livePriceStore` | `{ ticks: Record<string, LiveTick>, connected, setTick, setConnected, reset }` — `LiveTick = { symbol, price, open, high24h, low24h, change24h, volume, updatedAt }`. Key is lowercase symbol e.g. `'btc'`. |

### Hooks

| File | What it returns |
|---|---|
| `@/hooks/useAuth` | wrapper around `authStore` |
| `@/hooks/useBinanceWs(symbols: string[])` | connects multi-symbol miniTicker WS → writes to `livePriceStore`. Used in `AppLayout` sidebar + market pages. Exponential backoff reconnect 1s→30s. |
| `@/hooks/useBinanceStream<T>(streamName, onMessage, { enabled })` | generic single-stream WS with callback. Used in `/trade` for `@kline`, `@depth20@100ms`, `@trade`. **Trade dedup rule**: use `data.t` (sequential number) as React key, NEVER `data.T` (timestamp). |
| `@/hooks/useWallet` | `useWallets()`, `useWalletDetail(id)`, `useCreateWallet()`, `useUpdateWallet()`, `useDeleteWallet()`, `useDepositFiat()`, `useTransferWallet()` |
| `@/hooks/useTransaction` | `useAllTransactions(params)`, `useWalletTransactions(walletId)`, `useCreateTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()` |
| `@/hooks/useWatchlist` | `{ watchlist, isLoading, toggle(coinId, symbol), isWatched(coinId), count }` |
| `@/hooks/usePriceAlert` | `useAlerts()`, `useCreateAlert()`, `useDeleteAlert()` |
| `@/hooks/useOrder` | `useUserOrders()`, `useCreateOrder()`, `useCancelOrder()` |
| `@/hooks/usePosition` | `useUserPositions()` (auto-refetches every 10s), `useOpenPosition()`, `useClosePosition()` |
| `@/hooks/useOnChain` | `useOnChainWallets()`, `useAddOnChainWallet()`, `useSyncOnChainWallet()`, `useRemoveOnChainWallet()` |
| `@/hooks/useLeaderboard` | `useLeaderboard(period)` — staleTime 60s |
| `@/hooks/useMetaMask` | `{ account, chainId, isConnecting, error, connect, disconnect }` — raw `window.ethereum`, no wagmi |
| `@/hooks/useDocumentTitle(title)` | sets `document.title` to `"{title} · CryptoDash"` |

### API clients

All in `@/api/*.ts` — already wired to existing endpoints. Reuse, do not duplicate.

---

# 7. Real-time data flow (CRITICAL — must preserve)

The app's "wow factor" is real-time prices. Do not break this:

1. **`AppLayout`** mounts `useBinanceWs(['btc', 'eth', 'bnb'])` so sidebar always shows live prices.
2. **`MarketPage`** mounts `useBinanceWs(allTop100Symbols)` — every row updates live.
3. **`/trade` (FuturesPage)** uses `useBinanceStream` for `@kline`, `@depth20@100ms`, `@trade`, `@miniTicker` for the selected pair.
4. **`PortfolioPage`** subscribes to live store for holdings re-pricing.
5. **`PriceAlertWatcher`** (invisible component in `App.tsx`) compares live prices against user alerts → fires toast.
6. **Price resolution rule** (across all components): `price = liveTick?.price ?? coin.currentPrice` — live wins over CoinGecko snapshot.

The new UI must keep these subscriptions working. Don't remove the WS hooks.

---

# 8. Business rules that affect UI

These come from backend logic — UI must respect them:

### Wallet
- New wallet starts with `fiatBalance = 10_000` (display "$10,000 demo balance")
- Deposit max per tx: `$1,000,000`
- Transfer requires both wallets owned by same user (UI shows only user's wallets)

### Transaction
- **Buy**: needs `wallet.fiatBalance >= totalAmount`. UI must validate before submit and show available balance.
- **Sell**: needs `availableQuantity >= sellQuantity` (computed as `sum(buys) - sum(sells)`). UI shows max sellable.
- `coinId` must be the **CoinGecko slug** (`bitcoin`, `ethereum`, `binancecoin`, etc.), NOT the ticker (BTC, ETH).

### Conditional Orders
- 3 types: StopLoss (1), TakeProfit (2), Limit (3) × 2 sides (Buy=1, Sell=2)
- Cancellable only while Pending
- Show "trigger logic" hint based on type×side, e.g.:
  - StopLoss Buy: triggers when `price <= triggerPrice`
  - TakeProfit Buy: triggers when `price >= triggerPrice`
- UI must compute approximate `totalCost = triggerPrice × quantity` and validate vs `fiatBalance` for Buy

### Margin Positions
- `MaintenanceMarginRate = 5%`
- Leverage: integer 1-100 (UI: slider 1x-100x with snap points)
- `collateral = entryPrice × quantity ÷ leverage` — show this before opening
- `liquidationPrice (Long)  = entryPrice × (1 - 1/leverage + 0.05)`
- `liquidationPrice (Short) = entryPrice × (1 + 1/leverage - 0.05)`
- On open: deduct collateral from wallet
- On manual close: return `max(0, collateral + PnL)` to wallet
- On liquidation: collateral fully lost (UI shows "Liquidated" badge, no fiat return)
- Open position UI must display live `unrealizedPnL`, `unrealizedPnLPercentage`, `marginRatio`, and warn when `marginRatio` approaches 1.0
- Idempotency: `useOpenPosition` sends `Idempotency-Key` header so double-clicks don't open 2 positions — keep this behavior

### On-Chain Wallet
- Supported chains: `ethereum`, `polygon`, `bsc`, `arbitrum` — UI dropdown
- EVM address validation: `/^0x[a-fA-F0-9]{40}$/`
- MetaMask connect flow: button → `useMetaMask.connect()` → on success, auto-fill address field
- "Sync" button triggers `useSyncOnChainWallet` (re-fetches balances from Alchemy)
- When `Alchemy:ApiKey` is unset server-side, sync returns zeros — UI should not crash

### Leaderboard
- 3 period tabs: Week (1), Month (2), AllTime (3)
- Public — no auth required
- Top 50 by default
- Export button uses `html-to-image` `toPng(ref, { cacheBust: true, backgroundColor: '#111827' })`

### Trading Terminal (`/trade`)
- 7 trading pairs: BTC, ETH, BNB, SOL, XRP, ADA, DOGE
- coinId mapping (used by backend): bitcoin, ethereum, binancecoin, solana, ripple, cardano, dogecoin
- 6 timeframes: 1m, 5m, 15m, 1H, 4H, 1D
- KLineChart gotcha: `init()` returns `Nullable<Chart>` — always null-check
- BOLL indicator goes on `candle_pane` (special case), others get their own pane
- `AppLayout` must set `overflow-hidden flex flex-col` layout when `location.pathname === '/trade'`

### Authentication
- Access token 15min, refresh token 7d
- localStorage keys: `crypto_access_token`, `crypto_refresh_token`, `crypto_expires_at`
- Axios interceptor handles refresh automatically — UI does not need to think about it
- On manual logout button → navigate `/` (landing page), NOT `/login`
- On session expired (refresh fail) → ProtectedRoute redirects to `/login`

---

# 9. UX requirements

### Must have
- **Loading states**: every async page needs a skeleton (not a spinner). Match the eventual layout shape.
- **Error states**: API failures show a recoverable error (button to retry), not a crashed UI.
- **Empty states**: every list (wallets, transactions, alerts, orders, positions, on-chain) needs an empty state with a primary CTA to create the first item.
- **Toast feedback** on every mutation (create / update / delete / transfer): success + error using `useToast()`.
- **Confirmation** before destructive actions: delete wallet, cancel order, close position, remove alert.
- **Responsive**: works on 375×812 (mobile) up to 2560×1440 (4K). Trading terminal can degrade gracefully on mobile (suggest landscape).
- **Keyboard**: all dialogs closable with Escape, forms submittable with Enter.
- **Accessibility**: focus rings, aria-labels on icon-only buttons, sufficient color contrast.

### Should have
- **Price flash effect**: when a live price tick differs from previous, flash green (up) or red (down) for ~700ms.
- **Number formatting**: use existing helpers `formatUSD`, `formatPct`, `formatQty`, `formatMarketCap`, `formatDate` from `@/lib/format`.
- **CoinGecko icons**: `<img src={coin.image} loading="lazy" decoding="async" />` for performance.
- **Animation**: subtle transitions on hover/focus (200-300ms). Don't over-animate; this is a trading app, not a portfolio site.

### Don't do
- ❌ No light mode toggle (dark-only).
- ❌ No carousel sliders on landing.
- ❌ No "splash screen" loading animation longer than 1s.
- ❌ No emoji in production code (only in this document for clarity).
- ❌ No popups/modals on landing page (annoying).

---

# 10. File structure (FIXED)

Keep the existing structure. Do not introduce new patterns like `features/` or `modules/`.

```
crypto-frontend/src/
├── api/              [DO NOT TOUCH — backend contracts]
├── store/            [DO NOT TOUCH — Zustand stores]
├── hooks/            [DO NOT TOUCH — existing hooks; you may add new ones]
├── types/            [DO NOT TOUCH — TypeScript types]
├── lib/              [format.ts, indicators.ts, utils.ts — keep]
├── pages/            [REDESIGN — keep file names + named exports]
│   ├── auth/
│   │   ├── LoginPage.tsx       → export function LoginPage()
│   │   └── RegisterPage.tsx    → export function RegisterPage()
│   ├── LandingPage.tsx         → export function LandingPage()
│   ├── DashboardPage.tsx       → export function DashboardPage()
│   ├── WalletsPage.tsx
│   ├── WalletDetailPage.tsx
│   ├── MarketPage.tsx
│   ├── CoinDetailPage.tsx
│   ├── PortfolioPage.tsx
│   ├── ConvertPage.tsx
│   ├── TransactionsPage.tsx
│   ├── WatchlistPage.tsx
│   ├── PriceAlertsPage.tsx
│   ├── FuturesPage.tsx         (the trading terminal — biggest page)
│   ├── FuturesOrdersPage.tsx
│   ├── OnChainPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx       (sidebar + topbar, must include <Outlet />)
│   │   └── PublicLayout.tsx    (header for /market public)
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Toast.tsx (and useToast hook)
│   │   └── [add: Modal, Tabs, Select, Badge, Card, etc.]
│   ├── ErrorBoundary.tsx       [DO NOT TOUCH]
│   ├── ProtectedRoute.tsx      [DO NOT TOUCH]
│   ├── PriceAlertWatcher.tsx   [keep behavior, may restyle toast]
│   ├── FearGreedWidget.tsx     [used in dashboard, may restyle]
│   ├── GlobalMarketBar.tsx     [used in AppLayout, may restyle or remove]
│   └── AuthLayout.tsx          [Login/Register card frame]
├── App.tsx           [keep routes; restyle PageSkeleton]
└── main.tsx          [DO NOT TOUCH]
```

---

# 11. Acceptance criteria

The new UI is "done" when:

- [ ] `npm install && npm run build` succeeds with 0 TypeScript errors and 0 warnings.
- [ ] `npm run dev` starts on port 5173, the app loads, **all 19 routes are reachable** without console errors.
- [ ] Login → see Dashboard with real data fetched from existing backend.
- [ ] Markets page shows top 100 coins with live price flash (Binance WS connected).
- [ ] Trading terminal at `/trade` renders KLineChart with at least 1 candle visible within 5 seconds.
- [ ] Margin position can be opened (collateral deducted, liquidation price shown) and closed.
- [ ] Conditional order can be placed and shows in `/orders`.
- [ ] On-chain wallet can be added via MetaMask connect.
- [ ] Leaderboard loads without auth.
- [ ] Manual logout returns to `/` (landing).
- [ ] No regressions in any of these existing behaviors:
      - Auth refresh on 401
      - Watchlist sync from localStorage on first login
      - Price alert toast firing
      - Soft delete (delete wallet → it disappears, but DB row stays)
      - CSV export of transactions
      - PNG export of leaderboard

---

# 12. What to deliver

For each redesigned page/component, provide:

1. **The full file contents** (TypeScript + JSX + Tailwind classes), ready to paste.
2. **List of any new dependencies** added to `package.json` (with reason).
3. **List of files modified vs created vs deleted**.
4. **Any tailwind.config.js changes** (new colors, new animations).
5. **A short rationale** (3-5 sentences) explaining the design language and how it serves the trading-app use case.

Start with the **layout components** (`AppLayout`, `PublicLayout`) so the navigation shell is in place, then redesign pages in this order of impact:

1. `LandingPage` (first impression)
2. `MarketPage` + `CoinDetailPage` (the public surface)
3. `LoginPage` + `RegisterPage` + `AuthLayout` (entry)
4. `DashboardPage` (post-login first view)
5. `FuturesPage` (the trading terminal — hardest, save for when patterns are established)
6. `PortfolioPage`, `WalletsPage`, `WalletDetailPage`
7. `FuturesOrdersPage`, `OnChainPage`, `LeaderboardPage`
8. `TransactionsPage`, `WatchlistPage`, `PriceAlertsPage`, `ConvertPage`
9. `SettingsPage`, `NotFoundPage`

---

# 13. Out of scope (do NOT do)

- ❌ Change backend code, DTOs, controllers, services, EF entities, migrations
- ❌ Change API URLs, request/response shapes, header names
- ❌ Change Zustand store names or hook signatures
- ❌ Add new external services (Sentry, GA, etc.) without asking
- ❌ Add SSR / Next.js — must stay Vite SPA
- ❌ Replace TanStack Query with SWR / RTK Query
- ❌ Replace Tailwind with styled-components / emotion
- ❌ Add light mode

---

```
═══════════════════════════════════════════════════════════════════════════
COPY EVERYTHING ABOVE THIS LINE
═══════════════════════════════════════════════════════════════════════════
```

---

# How to use this with different AI tools

### v0.dev / Bolt.new / Lovable
Paste the whole prompt as the **first message**. Then iterate page-by-page: "Now generate `MarketPage.tsx`". They support file generation directly.

### Cursor / Claude Code / Aider
Save this file in the repo. Then prompt: *"Read `docs/UI_REDESIGN_PROMPT.md`. Implement the redesign for `LandingPage.tsx` following the spec. Pick design direction B (modern fintech)."*

### ChatGPT / Claude Web
Paste the whole prompt. Ask: *"Generate the new `LandingPage.tsx` file content based on this spec, using design direction A (Bloomberg terminal feel)."* Iterate per page.

### Tips
- **Fill in section 1 first** with your chosen design direction.
- Generate **one page at a time** for best quality.
- After each generated file, run `npm run build` to catch type errors early.
- If the AI invents a new hook or store, push back: "Reuse `useWallets` from `@/hooks/useWallet`, don't create a new one."
- If the AI removes the `useBinanceWs` subscription on Market page, push back: "Section 7 says live WS must stay wired."
