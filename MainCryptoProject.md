# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Layout

```
D:\DNTU\Tự Học\Crypto\
├── crypto-frontend\          ← React 18 + TypeScript + Vite (port 5173)
├── CryptoDashboard.Api\      ← ASP.NET Core .NET 9 (port 7103 HTTPS)
├── CryptoDashboard.Application\
├── CryptoDashboard.Domain\
├── CryptoDashboard.Infrastructure\
└── CryptoDashboard.Tests\
```

---

## Commands

### Frontend
```bash
cd crypto-frontend
npm run dev          # dev server :5173
npm run build        # production build → dist/
npm run preview      # preview built dist/
npm run lint         # ESLint
```

### Backend
```bash
cd ..   # root D:\DNTU\Tự Học\Crypto\
dotnet build                          # build all projects
dotnet run --project CryptoDashboard.Api   # run API
dotnet test                           # run tests
dotnet ef migrations add <Name> --project CryptoDashboard.Infrastructure --startup-project CryptoDashboard.Api
dotnet ef database update --project CryptoDashboard.Infrastructure --startup-project CryptoDashboard.Api
```

---

## Environment Variables

### Frontend — `crypto-frontend/.env.local`
```
VITE_API_URL=https://localhost:7103
```
All `VITE_` vars are exposed to the bundle. Never commit `.env.local` or `.env.production`.

### Backend — `CryptoDashboard.Api/appsettings.json`
Key config sections:
- `ConnectionStrings:MyConnect` — PostgreSQL connection string
- `Jwt:SecretKey`, `Jwt:Issuer`, `Jwt:Audience`
- `Cors:AllowedOrigins` — string array (production only; dev allows any origin)
- `CryptoApi:TimeoutSeconds`, `CryptoApi:RetryCount`, `CryptoApi:RetryBaseDelayMs`
- `Alchemy:ApiKey` — Alchemy Web3 API key (optional; used for on-chain balance sync)
- `Alchemy:BaseUrl` — default `https://eth-mainnet.g.alchemy.com/v2/`
- `RunMigrationsOnStartup` — `"true"` in production to auto-apply EF migrations on startup

### Docker local — `.env.docker` (copy from `.env.docker.example`)
```
POSTGRES_DB=cryptodash
POSTGRES_USER=cryptodash
POSTGRES_PASSWORD=changeme
JWT_SECRET_KEY=<min 32 chars>
ALCHEMY_API_KEY=          # optional
COINGECKO_API_KEY=        # optional
VITE_API_URL=http://localhost:8080
```

---

## Frontend Architecture

### Stack
- React 18 + TypeScript + Vite + Tailwind CSS (**dark-only**, always adds `dark` class on `<html>`)
- Zustand (auth + live prices) + TanStack Query v5 (all server state)
- Path alias: `@/` → `src/`

### Pages (19 total — all lazy-loaded via `React.lazy`)
| Route | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Public landing |
| `/login` | `LoginPage` | Guest-only redirect |
| `/register` | `RegisterPage` | Guest-only redirect |
| `/market` | `MarketPage` | Public (no auth) |
| `/market/:coinId` | `CoinDetailPage` | Public; loads `vendor-lightweight` chunk |
| `/dashboard` | `DashboardPage` | Portfolio summary + Fear & Greed + allocation chart |
| `/wallets` | `WalletsPage` | Wallet list, Transfer modal, Delete guard |
| `/wallets/:id` | `WalletDetailPage` | Holdings + transactions for one wallet |
| `/portfolio` | `PortfolioPage` | Performance chart + live-priced holdings |
| `/convert` | `ConvertPage` | Simulated coin swap |
| `/transactions` | `TransactionsPage` | Paginated history, CSV export |
| `/watchlist` | `WatchlistPage` | Favourite coins |
| `/alerts` | `PriceAlertsPage` | Price alerts Above/Below |
| `/trade` | `FuturesPage` | Full trading terminal (KLineChart) |
| `/orders` | `FuturesOrdersPage` | Stop-loss / Take-profit / Limit orders + Margin positions tabs |
| `/onchain` | `OnChainPage` | On-chain EVM wallet tracker; MetaMask connect or manual address |
| `/leaderboard` | `LeaderboardPage` | Top traders P&L%, period tabs, PNG export via html-to-image |
| `/settings` | `SettingsPage` | Profile + change password |
| `*` | `NotFoundPage` | 404 with Back/Home/Market buttons |

### Routing structure (`App.tsx`)
```
<ErrorBoundary>
  <PriceAlertWatcher />   ← only when isAuthenticated
  <Suspense fallback={<PageSkeleton />}>
    <Routes>
      /                          → LandingPage
      <PublicLayout>             /market, /market/:coinId
      <GuestRoute>               /login, /register
      <ProtectedRoute>
        <AppLayout>              all 14 protected pages (dashboard, wallets, wallets/:id,
                                   portfolio, convert, transactions, watchlist, alerts,
                                   trade, orders, onchain, leaderboard, settings)
      /leaderboard               → LeaderboardPage (public — no auth needed)
      *                          → NotFoundPage
```

### Bundle chunks (Vite manualChunks)
| Chunk | Size (gzip) | Loaded on |
|---|---|---|
| `index` (main) | 29 KB / 9 KB | always |
| `vendor-react` | 138 KB / 44 KB | always |
| `vendor-query` | 42 KB / 13 KB | always |
| `vendor-router` | 23 KB / 8 KB | always |
| `vendor-klinecharts` | 203 KB / 53 KB | /trade only |
| `vendor-lightweight` | 162 KB / 53 KB | /market/:coinId only |
| `vendor-charts` | 269 KB / 76 KB | dashboard/portfolio |
| `vendor-forms` | 80 KB / 25 KB | login/register |
| `vendor` | misc | rest |

---

## Frontend File Map

```
src/
  api/
    client.ts         ← axios instance, tokenStorage, request/response interceptors, auto-refresh
    auth.ts           ← loginApi, registerApi, refreshTokenApi, changePasswordApi, logoutApi, updateProfileApi
    wallet.ts         ← getWallets, getWalletById, createWallet, updateWallet, deleteWallet, depositFiat, transferFunds
    transaction.ts    ← getAllTransactionsPaged, getWalletTransactions, createTransaction, updateTransaction, deleteTransaction
    crypto.ts         ← getTopCryptos, getCryptoById, getCoinHistory
    portfolio.ts      ← getPortfolioSummary, getPortfolioPerformance, getPortfolioHistory
    watchlist.ts      ← getWatchlist, addToWatchlist, removeFromWatchlist, syncWatchlistFromLocalStorage
    priceAlert.ts     ← getAlerts, createAlert, deleteAlert
    order.ts          ← getUserOrders, createOrder, cancelOrder
    position.ts       ← getUserPositions, openPosition, closePosition
    onchain.ts        ← getOnChainWallets, addOnChainWallet, syncOnChainWallet, removeOnChainWallet
    leaderboard.ts    ← getLeaderboard(period)
  store/
    authStore.ts      ← Zustand: user, isAuthenticated, login, register, logout, updateUsername, initialize
    livePriceStore.ts ← Zustand: ticks Record<symbol,LiveTick>, connected, setTick, setConnected, reset
  hooks/
    useBinanceWs.ts       ← multi-symbol miniTicker WS → livePriceStore (exponential backoff 1s→30s)
    useBinanceStream.ts   ← generic single-stream WS with callback + backoff
    useWallet.ts          ← useWallets, useWalletDetail, useCreateWallet, useUpdateWallet, useDeleteWallet, useDepositFiat, useTransferWallet
    useTransaction.ts     ← useAllTransactions, useWalletTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction
    useWatchlist.ts       ← useWatchlist (toggle helper), useWatchlistSync, getLocalStorageWatchlist
    usePriceAlert.ts      ← useAlerts, useCreateAlert, useDeleteAlert
    useOrder.ts           ← useUserOrders, useCreateOrder, useCancelOrder
    usePosition.ts        ← useUserPositions, useOpenPosition, useClosePosition
    useOnChain.ts         ← useOnChainWallets, useAddOnChainWallet, useSyncOnChainWallet, useRemoveOnChainWallet
    useLeaderboard.ts     ← useLeaderboard(period)
    useMetaMask.ts        ← raw window.ethereum; connect/disconnect; accountsChanged/chainChanged listeners; TypeScript Window extension
  components/
    layout/AppLayout.tsx  ← sidebar + GlobalMarketBar + SidebarTicker (BTC/ETH/BNB live prices)
    GlobalMarketBar.tsx   ← CoinGecko /global market cap bar (top of every non-/trade page)
    FearGreedWidget.tsx   ← SVG gauge 0-100, 5 zones (alternative.me API)
    ErrorBoundary.tsx     ← class component; renders "Đã xảy ra lỗi" + Retry + Home; raw error in DEV only
    PriceAlertWatcher.tsx ← invisible; compares livePriceStore against user alerts; fires toast notification
    ProtectedRoute.tsx    ← <ProtectedRoute> redirects to /login; <GuestRoute> redirects to /dashboard
    ui/Toast.tsx          ← toast context: toast.success / toast.error / toast.info
  lib/
    format.ts      ← formatUSD, formatPct, formatQty, formatDate, formatMarketCap
    indicators.ts  ← calcEMA, tickEMA, calcRSI, buildDepthPoints
  types/
    index.ts       ← all shared TypeScript interfaces (see Types section below)
    auth.ts        ← AuthUser { username, email }, AuthResponse, LoginRequest, RegisterRequest
  pages/           ← 19 page components (all named exports, e.g. export function DashboardPage)
                      New: FuturesOrdersPage, OnChainPage, LeaderboardPage
```

---

## Authentication Flow

### Frontend
1. `tokenStorage` uses localStorage keys: `crypto_access_token`, `crypto_refresh_token`, `crypto_expires_at`
2. On app mount: `authStore.initialize()` decodes JWT payload (base64), extracts `name` + `emailaddress` claims
3. Axios request interceptor: proactively refreshes if `expiresAt - 30s < now`
4. Axios response interceptor: on 401, queues pending requests, does one refresh, retries all queued; on refresh failure → dispatches `auth:logout` event → `authStore.logout()`
5. JWT claims path: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` and `...emailaddress`

### Backend
- Access token: 15 min, HS256, `ClockSkew = TimeSpan.Zero`
- Refresh token: 7 days, stored **hashed** (`TokenHasher.Hash`) in `User.RefreshToken`
- `ChangePasswordAsync` nullifies refresh token → forces re-login on other devices
- `RevokeRefreshTokenAsync` (logout) nullifies refresh token

### Controller auth pattern
```csharp
private Guid GetCurrentUserId() {
    var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return Guid.Parse(claim!);
}
```

---

## Frontend State & Query Keys

### TanStack Query keys
```ts
walletKeys.all              = ['wallets']
walletKeys.detail(id)       = ['wallets', id]
txKeys.all                  = ['transactions']
txKeys.paged(params)        = ['transactions', 'paged', params]
txKeys.byWallet(walletId)   = ['transactions', 'wallet', walletId]
['watchlist']
['priceAlerts']
['portfolio']
```

### Invalidation after mutations
- `createTransaction` → invalidates `txKeys.byWallet`, `walletKeys.detail`, `walletKeys.all`, `['portfolio']`, `txKeys.all`
- `transferFunds` → invalidates `walletKeys.all`
- `depositFiat` → invalidates `walletKeys.all` + `walletKeys.detail`
- `useCreateAlert` / `useDeleteAlert` → invalidates `['priceAlerts']`

### QueryClient global config (`main.tsx`)
```ts
staleTime: 2 min
retry: skip on 401 | 403 | 404; max 2 retries
throwOnError: false (both queries and mutations)
ReactQueryDevtools: only in import.meta.env.DEV
```

---

## WebSocket Hooks

### `useBinanceWs(symbols: string[])`
- Connects to Binance `@miniTicker` stream for multiple symbols
- Writes to `useLivePriceStore` via `setTick(symbol, LiveTick)`
- `LiveTick`: `{ symbol, price, open, high24h, low24h, change24h, volume, updatedAt }`
- Used in: `AppLayout` (sidebar BTC/ETH/BNB), `PortfolioPage`, `PriceAlertWatcher`

### `useBinanceStream<T>(streamName, onMessage, { enabled })`
- Generic single-stream — callback-based, no store writes
- Used in `FuturesPage` for kline / depth20 / trade / miniTicker streams
- Both hooks: exponential backoff reconnect 1s → 30s on disconnect

---

## TypeScript Types (`src/types/index.ts`)

```ts
// Wallet
WalletResponse       { id, name, userId, fiatBalance, createdAt, updatedAt }
WalletDetailResponse { id, name, fiatBalance, createdAt, updatedAt, holdings: HoldingResponse[], totalValue, transactionCount }
HoldingResponse      { coinId, coinSymbol, coinName, image, quantity, averageBuyPrice, currentPrice, currentValue, profitLoss, profitLossPercentage }
CreateWalletRequest  { name }
UpdateWalletRequest  { name }
TransferWalletRequest{ fromWalletId, toWalletId, amount }

// Transaction
TransactionType = 1 | 2   // 1=Buy, 2=Sell
TransactionResponse  { id, walletId, walletName, coinId, coinSymbol, coinName, type, typeDisplay, quantity, pricePerCoin, totalAmount, transactionDate, notes }
CreateTransactionRequest { walletId, coinId, type, quantity, pricePerCoin, notes?, transactionDate? }

// Portfolio
PortfolioSummaryResponse    { walletCount, totalTransactionCount, totalCurrentValue, totalInvestedValue, totalProfitLoss, totalProfitLossPercentage, allocations: PortfolioCoinAllocation[] }
PortfolioCoinAllocation     { coinId, coinSymbol, coinName, image, quantity, currentPrice, currentValue, investedValue, allocationPercentage }
PortfolioPerformanceResponse{ totalBuyAmount, totalSellAmount, netInvested, currentPortfolioValue, unrealizedProfitLoss, unrealizedProfitLossPercentage, totalBuyTransactions, totalSellTransactions }
PortfolioHistoryPoint       { date, totalValue, totalInvested, profitLoss }

// Watchlist
WatchlistItemResponse { id, coinId, coinSymbol, createdAt }
AddWatchlistRequest   { coinId, coinSymbol }

// Price Alert
AlertDirection = 1 | 2   // 1=Above, 2=Below
PriceAlertResponse      { id, coinId, coinSymbol, coinName, targetPrice, direction, directionDisplay, createdAt }
CreatePriceAlertRequest { coinId, coinSymbol, coinName, targetPrice, direction }

// Crypto (CoinGecko via backend cache)
CryptoListResponse { id, symbol, name, image, currentPrice, priceChangePercentage24h, marketCap, totalVolume }

// Orders (Stop-loss / Take-profit / Limit)
OrderSide   = 1 | 2          // 1=Buy, 2=Sell
OrderType   = 1 | 2 | 3      // 1=StopLoss, 2=TakeProfit, 3=Limit
OrderStatus = 1 | 2 | 3 | 4  // 1=Pending, 2=Filled, 3=Cancelled, 4=Failed
OrderResponse        { id, walletId, walletName, coinId, coinSymbol, coinName, side, type, triggerPrice, quantity, status, createdAt, filledAt, cancelledAt, filledPrice, failureReason, transactionId }
CreateOrderRequest   { walletId, coinId, side, type, triggerPrice, quantity }

// Margin Positions
PositionSide   = 1 | 2     // 1=Long, 2=Short
PositionStatus = 1 | 2 | 3 // 1=Open, 2=Closed, 3=Liquidated
PositionResponse      { id, walletId, walletName, coinId, coinSymbol, coinName, side, entryPrice, quantity, leverage, collateralAmount, liquidationPrice, status, exitPrice, realizedPnL, closeReason, openedAt, closedAt, currentPrice, unrealizedPnL, unrealizedPnLPercentage, marginRatio }
OpenPositionRequest   { walletId, coinId, side, quantity, leverage }

// On-Chain Wallets
TokenBalance          { symbol, name, contractAddress, balance, decimals }
OnChainWalletResponse { id, address, label, chain, nativeBalance, nativeSymbol, tokens: TokenBalance[], createdAt, lastSyncedAt }
AddOnChainWalletRequest { address, label, chain }

// Leaderboard
LeaderboardPeriod = 1 | 2 | 3  // 1=Week, 2=Month, 3=AllTime
LeaderboardEntry  { rank, userId, username, profitLossPercentage, currentValue, startValue, transactionCount }
```

---

## Trading Terminal (`/trade` → `FuturesPage`)

- **Chart**: KLineChart v9.8.12 — candlestick + VOL pane (always on)
- **EMA**: 7 / 25 / 99 always shown on candle pane
- **Toggleable indicators**: RSI · MACD · BOLL · KDJ
  - BOLL goes on `candle_pane` (not separate): `createIndicator({name:'BOLL'}, false, {id:'candle_pane'})`
  - Others: `createIndicator(name)` returns paneId; store for `removeIndicator(paneId, name)`
- **KLineChart gotchas**:
  - `init()` returns `Nullable<Chart>` — always null-check before calling any method
  - `removeIndicator(paneId, indicatorName)` — paneId from `createIndicator()` return value
- **Drawing tools** (9): Trend Line, Ray, H-Ray, H-Line, Parallel Channel, Price Channel, Rectangle, Fibonacci, Clear All
- **Timeframes**: 1m · 5m · 15m · 1H · 4H · 1D
- **Order Book**: real-time depth 20 bid/ask via `<symbol>@depth20@100ms`
- **Recent Trades**: live via `<symbol>@trade`
- **Depth Chart**: cumulative bid/ask area (Recharts)
- **Trading Panel**: Market/Limit, wallet balance validation, 25/50/75/100% shortcuts
- **7 pairs**: BTC/ETH/BNB/SOL/XRP/ADA/DOGE
- **coinId**: always CoinGecko IDs (`bitcoin`, `ethereum`, `binancecoin`, `solana`, `ripple`, `cardano`, `dogecoin`)

---

## AppLayout Notes

- `isTerminal = location.pathname === '/trade'` → terminal uses `overflow-hidden flex flex-col` layout
- `GlobalMarketBar` is ONLY in `AppLayout` — never in individual pages (was a duplicate bug)
- Sidebar always shows live BTC/ETH/BNB prices via `useBinanceWs(['btc','eth','bnb'])`
- Dark mode: `document.documentElement.classList.add('dark')` in `index.html` inline script (before React mounts)

---

## Backend Architecture — Clean Architecture

```
CryptoDashboard.Domain\
  Entities\        ← User, Wallet, Transaction, WatchlistItem, PriceAlert,
                     PortfolioSnapshot, PriceHistory, CryptoCurrency,
                     TradeOrder, Position, OnChainWallet          ← NEW
  Common\          ← BaseEntity (IsDeleted, DeletedAt, CreatedAt, UpdatedAt)

CryptoDashboard.Application\
  Interfaces\      ← IAuthService, IWalletService, ITransactionService,
                     IPortfolioService, IWatchlistService, IPriceAlertService,
                     ICryptoService, IJwtService, ICryptoPriceCache, IApplicationDbContext,
                     IOrderService, IPositionService, IOnChainWalletService  ← NEW
  DTOs\            ← Auth/, Wallet/, Transaction/, Portfolio/, Watchlist/, PriceAlert/,
                     Common/PagedResult<T>,
                     Order/, Position/, OnChain/                 ← NEW
  Options\         ← AlchemyOptions (SectionName="Alchemy")     ← NEW
  Validators\      ← FluentValidation for CreateTransactionRequest, UpdateTransactionRequest

CryptoDashboard.Infrastructure\
  Persistence\     ← ApplicationDbContext (EF Core + Npgsql)
  Services\        ← implementations of all IXxxService interfaces
                     + OrderService, PositionService, OnChainWalletService  ← NEW
                     + OrderMonitorBackgroundService (5s poll, fills triggered orders)  ← NEW
                     + LiquidationBackgroundService (10s poll, liquidates positions)   ← NEW
  Security\        ← TokenHasher (SHA-256), JwtService
  Caching\         ← MemoryCryptoPriceCache (IMemoryCache)

CryptoDashboard.Api\
  Controllers\     ← AuthController, WalletController, TransactionController,
                     PortfolioController, WatchlistController, PriceAlertController,
                     CryptoController (+ rate limiting),         ← UPDATED
                     OrderController, PositionController, OnChainWalletController  ← NEW
  Middleware\      ← GlobalExceptionHandlerMiddleware
```

---

## Domain Entities

### `BaseEntity` (inherited by Wallet, Transaction, WatchlistItem)
```csharp
bool IsDeleted; DateTime? DeletedAt; DateTime CreatedAt; DateTime UpdatedAt;
```
`SaveChangesAsync` intercepts `EntityState.Deleted` → soft-delete (sets `IsDeleted=true`).
**Global query filter**: `HasQueryFilter(e => !e.IsDeleted)` on Wallet, Transaction, WatchlistItem.

### `User`
```csharp
Guid Id; string Username; string Email; string PasswordHash;
string? RefreshToken;              // SHA-256 hashed
DateTime? RefreshTokenExpiryTime;
DateTime CreatedAt; DateTime? LastLoginAt;
ICollection<Wallet> Wallets; ICollection<WatchlistItem> WatchlistItems;
```

### `Wallet : BaseEntity`
```csharp
Guid Id; string Name; Guid UserId;
decimal FiatBalance = 10_000m;     // virtual USD, decreases on Buy, increases on Sell + deposits
User User; ICollection<Transaction> Transactions;
```

### `Transaction : BaseEntity`
```csharp
Guid Id; Guid WalletId;
string CoinId;      // CoinGecko ID e.g. "bitcoin"
string CoinSymbol;  // e.g. "BTC"
string CoinName;    // e.g. "Bitcoin"
TransactionType Type;   // Buy=1, Sell=2
decimal Quantity; decimal PricePerCoin; decimal TotalAmount;  // = Quantity * PricePerCoin
DateTime TransactionDate; string? Notes;
```

### `WatchlistItem : BaseEntity`
```csharp
Guid Id; Guid UserId; string CoinId; string CoinSymbol;
```
Unique index on `(UserId, CoinId)`.

### `PriceAlert` (does NOT inherit BaseEntity → **hard delete**)
```csharp
Guid Id; Guid UserId;
string CoinId; string CoinSymbol; string CoinName;
decimal TargetPrice; AlertDirection Direction;   // Above=1, Below=2
DateTime CreatedAt;
```

### `PortfolioSnapshot`
```csharp
long Id; Guid UserId; decimal TotalValue; decimal TotalInvested; decimal ProfitLoss;
DateTime SnapshotDate;   // Date only (UTC), unique per UserId+Date
```

### `CryptoCurrency` (in-memory cache, not persisted)
```csharp
string Id; string Symbol; string Name; decimal CurrentPrice;
decimal PriceChangePercentage24h; decimal MarketCap; decimal TotalVolume;
string Image; DateTime LastUpdated;
```

### `TradeOrder` (does NOT inherit BaseEntity → **hard delete on cancel**)
```csharp
Guid Id; Guid UserId; Guid WalletId;
string CoinId; string CoinSymbol; string CoinName;
OrderSide Side;           // Buy=1, Sell=2
OrderType Type;           // StopLoss=1, TakeProfit=2, Limit=3
OrderStatus Status;       // Pending=1, Filled=2, Cancelled=3, Failed=4
decimal TriggerPrice; decimal Quantity;
DateTime CreatedAt; DateTime? FilledAt; DateTime? CancelledAt;
decimal? FilledPrice; string? FailureReason; Guid? TransactionId;
```
`OrderMonitorBackgroundService` evaluates `OrderTriggerEvaluator.IsTriggered(order, currentPrice)` every 5 s.

### `Position` (does NOT inherit BaseEntity — closed/liquidated preserved for history)
```csharp
Guid Id; Guid UserId; Guid WalletId;
string CoinId; string CoinSymbol; string CoinName;
PositionSide Side;     // Long=1, Short=2
PositionStatus Status; // Open=1, Closed=2, Liquidated=3
decimal EntryPrice; decimal Quantity; int Leverage;
decimal CollateralAmount;   // = (EntryPrice * Quantity) / Leverage
decimal LiquidationPrice;   // Long: EntryPrice*(1 - 1/Leverage + MaintenanceMarginRate)
                            // Short: EntryPrice*(1 + 1/Leverage - MaintenanceMarginRate)
decimal? ExitPrice; decimal? RealizedPnL; string? CloseReason;
DateTime OpenedAt; DateTime? ClosedAt;
```
`MaintenanceMarginRate = 5%`. `LiquidationBackgroundService` polls every 10 s.

### `OnChainWallet` (does NOT inherit BaseEntity)
```csharp
Guid Id; Guid UserId;
string Address;    // EVM 0x-prefixed, 42 chars; unique per (UserId, Address)
string Label;
string Chain;      // "ethereum" | "polygon" | "bsc" | "arbitrum"
decimal NativeBalance;
string NativeSymbol;
string TokensJson;          // JSON-serialised List<TokenBalance>; deserialized in service layer
DateTime CreatedAt; DateTime? LastSyncedAt;
```

---

## Database (EF Core / Npgsql / PostgreSQL)

- `ApplicationDbContext` implements `IApplicationDbContext` (testability)
- DB name set in `appsettings.json → ConnectionStrings:MyConnect`
- Decimal precisions: `FiatBalance (18,2)`, `Quantity (18,8)`, `Price (18,2)`, `TargetPrice (18,8)`
- Cascade deletes: User→Wallets→Transactions, User→WatchlistItems, User→PriceAlerts, User→PortfolioSnapshots
- `PortfolioSnapshot` unique index: `(UserId, SnapshotDate)` — prevents duplicate daily snapshots
- Migrations assembly: `CryptoDashboard.Infrastructure`

---

## All API Endpoints

### Auth (`/api/auth`) — `AuthController`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register, returns tokens + user |
| POST | `/login` | ❌ | Login, returns tokens + user |
| POST | `/refresh` | ❌ | Refresh access token |
| POST | `/logout` | ✅ | Revoke refresh token |
| POST | `/change-password` | ✅ | Change password, invalidates all refresh tokens |
| PUT | `/profile` | ✅ | Update username; checks uniqueness; returns `{ username, email }` |

### Wallet (`/api/Wallet`) — `WalletController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List user's wallets |
| POST | `/` | Create wallet (starts with $10,000 FiatBalance) |
| GET | `/{id}` | Wallet detail with holdings (live-priced) |
| PUT | `/{id}` | Rename wallet |
| DELETE | `/{id}` | Soft-delete wallet + transactions |
| POST | `/{id}/deposit` | Add fiat (max $1,000,000 per deposit) |
| POST | `/transfer` | Transfer fiat between 2 wallets (same user, DB transaction, balance check) |

### Transaction (`/api/Transaction`) — `TransactionController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | Paginated list (page, pageSize, type, search, sortBy, sortDir) |
| POST | `/` | Create transaction; Buy deducts FiatBalance, Sell adds FiatBalance |
| GET | `/wallet/{walletId}` | Paginated wallet transactions |
| PUT | `/{id}` | Update transaction (reverses old fiat effect, applies new) |
| DELETE | `/{id}` | Soft-delete (reverses fiat balance) |
| GET | `/export` | CSV download (up to 10,000 rows) — **already implemented** |

### Portfolio (`/api/Portfolio`) — `PortfolioController`
| Method | Route | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/` | ✅ | — | Portfolio summary (allocations, P&L, totals) |
| GET | `/performance` | ✅ | — | Buy/sell totals, unrealized P&L |
| GET | `/history?days=30` | ✅ | — | Historical snapshots (7–365 days) |
| POST | `/snapshot` | ✅ | — | Manual snapshot trigger |
| GET | `/leaderboard?period=1&top=50` | ❌ | `leaderboard` 10/min | Top traders by P&L% — [AllowAnonymous] |

### Watchlist (`/api/Watchlist`) — `WatchlistController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | User's watchlist |
| POST | `/` | Add coin (idempotent) |
| DELETE | `/{coinId}` | Remove coin |
| GET | `/{coinId}/status` | Check if watched |
| POST | `/sync` | Bulk sync from localStorage on first login |

### PriceAlert (`/api/PriceAlert`) — `PriceAlertController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All user alerts (ordered by createdAt desc) |
| POST | `/` | Create alert |
| DELETE | `/{id}` | Hard delete alert |

### Order (`/api/Order`) — `OrderController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All user orders (pending + filled + cancelled) |
| POST | `/` | Create order (StopLoss / TakeProfit / Limit) |
| DELETE | `/{id}` | Cancel pending order |

### Position (`/api/Position`) — `PositionController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All user positions (open + closed + liquidated) |
| POST | `/` | Open position (deducts collateral from fiat balance) |
| DELETE | `/{id}` | Close open position (returns collateral + PnL, min 0) |

### OnChainWallet (`/api/OnChainWallet`) — `OnChainWalletController` (all `[Authorize]`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All user on-chain wallets |
| POST | `/` | Add wallet (EVM address regex validation) |
| POST | `/{id}/sync` | Sync native + ERC-20 balances via Alchemy JSON-RPC |
| DELETE | `/{id}` | Remove wallet |

### Crypto (`/api/Crypto`) — `CryptoController`
All endpoints now have `[EnableRateLimiting("crypto")]` — 30 req/min per IP.

---

## Backend Service Business Rules

### `TransactionService`
- **Buy**: checks `wallet.FiatBalance >= TotalAmount`; on success deducts `FiatBalance`
- **Sell**: checks `coinQuantity (Buy - Sell) >= requestedQuantity`; on success adds `TotalAmount` to `FiatBalance`
- **UpdateTransaction**: reverses old fiat effect → applies new effect atomically
- **DeleteTransaction**: reverses fiat effect before soft-delete
- Sort fields: `coin | amount | quantity | price | type | date` (default: date desc)
- `CoinName` / `CoinSymbol` resolved from `ICryptoService` during create (fetched by `CoinId`)

### `WalletService`
- **Transfer**: DB transaction; both wallets must belong to same user; `fromWallet.FiatBalance >= amount`; cannot transfer to self
- **DepositFiat**: max $1,000,000 per transaction; positive only
- **Holdings calculation**: groups transactions by `CoinId`; net quantity = BuyQty - SellQty; fetches live price from `ICryptoService`; computes P&L

### `AuthService`
- **UpdateProfile**: loads user by ID; checks new username not taken by another user; saves; returns `{ username, email }`
- Refresh token stored as `SHA-256(token)` — original token only returned once on login/register/refresh

### `PortfolioService`
- **SaveDailySnapshotAsync**: idempotent (skips if today's snapshot exists); skips if user has no transactions
- **PortfolioSnapshotBackgroundService**: runs at midnight UTC daily for all users (500ms delay between users)
- **GetPortfolioHistoryAsync**: forward-fills gaps in snapshots; appends live "today" point

### `WatchlistService`
- **AddToWatchlist**: idempotent — returns existing if already in DB (unique index on UserId+CoinId)
- **SyncFromLocalStorage**: bulk-adds items not already in DB (used on first login)
- Soft delete through `BaseEntity` interceptor in `SaveChangesAsync`

### `PriceAlertService`
- Hard delete (PriceAlert does not inherit BaseEntity, so EF Remove → actual DELETE SQL)
- No firing logic in backend — frontend `PriceAlertWatcher` component monitors live prices via `useLivePriceStore` and triggers browser notifications

### `CryptoService` (HttpClient with Polly)
- Wraps CoinGecko API with retry (exponential backoff + jitter) + circuit breaker (5 failures → 30s break)
- `MemoryCryptoPriceCache`: in-memory cache refreshed by `CryptoPriceRefreshService` background service

### `OrderService`
- **CreateOrder**: validates wallet ownership; persists with `Status=Pending`
- **CancelOrder**: ownership check; only Pending orders can be cancelled
- `OrderMonitorBackgroundService` polls every 5 s; uses `OrderTriggerEvaluator.IsTriggered(order, price)`:
  - `StopLoss Buy`: triggers when `price <= triggerPrice`
  - `StopLoss Sell`: triggers when `price >= triggerPrice`
  - `TakeProfit Buy`: triggers when `price >= triggerPrice`
  - `TakeProfit Sell`: triggers when `price <= triggerPrice`
  - `Limit Buy`: triggers when `price <= triggerPrice`
  - `Limit Sell`: triggers when `price >= triggerPrice`
  - On trigger: executes transaction (deducts/adds fiat), sets `Status=Filled`, records `FilledAt + FilledPrice`
- `OrderTriggerEvaluator` is a **pure static class** — no DB/DI dependencies — for isolated unit testing

### `PositionService`
- **OpenPosition**: collateral = (entryPrice × quantity) / leverage; deducted from `FiatBalance`
- **ClosePosition**: `PnL = (exitPrice - entryPrice) × quantity × side_sign`; returns `max(0, collateral + PnL)` to `FiatBalance`
- **Live enrichment**: open positions get `currentPrice`, `unrealizedPnL`, `unrealizedPnLPercentage`, `marginRatio` from `ICryptoPriceCache`
- `LiquidationBackgroundService` polls every 10 s; compares current price against `LiquidationPrice`; collateral fully lost on liquidation (`FiatBalance` unchanged)
- `MaintenanceMarginRate = 5%`

### `OnChainWalletService`
- Calls Alchemy JSON-RPC (`eth_getBalance`, `alchemy_getTokenBalances`) per chain
- Multi-chain URL routing: ethereum/arbitrum → mainnet, polygon → polygon-mainnet, bsc → bnb-mainnet
- Deserializes `TokensJson` string column to `List<TokenBalance>` in response mapping
- If `Alchemy:ApiKey` is blank, sync returns 0 balances without error

---

## Backend DI Registration (`Program.cs`)

```csharp
// Scoped services
IApplicationDbContext    → ApplicationDbContext
IJwtService              → JwtService
IAuthService             → AuthService
IWalletService           → WalletService
ITransactionService      → TransactionService
IPortfolioService        → PortfolioService
IWatchlistService        → WatchlistService
IPriceAlertService       → PriceAlertService
IOrderService            → OrderService            ← NEW
IPositionService         → PositionService         ← NEW
IOnChainWalletService    → OnChainWalletService    ← NEW

// Singleton
ICryptoPriceCache        → MemoryCryptoPriceCache

// HttpClient (ICryptoService → CryptoService) with Polly retry + circuit breaker

// Options
builder.Services.Configure<AlchemyOptions>(config.GetSection("Alchemy"))  ← NEW

// Hosted Services
CryptoPriceRefreshService              // background price polling
PortfolioSnapshotBackgroundService     // midnight UTC daily snapshots
OrderMonitorBackgroundService          // 5s poll — fills triggered orders  ← NEW
LiquidationBackgroundService           // 10s poll — liquidates positions   ← NEW

// Rate Limiter (ASP.NET Core built-in)                                     ← NEW
// "crypto"      → FixedWindowLimiter: 30 req/min per IP
// "leaderboard" → FixedWindowLimiter: 10 req/min per IP

// Health Checks                                                             ← NEW
// /health/live  → liveness (always 200)
// /health/ready → readiness (Npgsql DB check)

// Serilog structured logging: Console + rolling file sink (logs/log-.txt)  ← NEW

// FluentValidation auto-validation
// Swagger + Bearer auth definition
// CORS: dev=any origin; prod=Cors:AllowedOrigins from config
// GlobalExceptionHandlerMiddleware

// Auto EF migrations on startup (if RunMigrationsOnStartup=true)           ← NEW
```

---

## Frontend API Client (`src/api/client.ts`)

- Base URL: `VITE_API_URL ?? 'https://localhost:7103'`, all calls prefixed `/api`
- `tokenStorage`: `{ getAccess, getRefresh, getExpiry, set, clear, isExpired }` — uses `localStorage`
- `isExpired()`: returns true if `expiresAt - 30s < now`
- Request interceptor: attaches `Authorization: Bearer <token>`; proactively refreshes if expired
- Response interceptor: on 401 → queued refresh (all parallel requests wait for one refresh); on failure → `window.dispatchEvent(new CustomEvent('auth:logout'))` → `authStore.logout()`
- `authStore` listens: `window.addEventListener('auth:logout', () => useAuthStore.getState().logout())`

---

## Key Patterns & Gotchas

### Frontend
- All pages are **named exports** (not default): `export function DashboardPage()` — lazy import pattern: `.then(m => ({ default: m.DashboardPage }))`
- `createTransaction` requires `coinId` as CoinGecko ID (`bitcoin`, not `BTC`)
- `TransactionType` is `1 | 2` in TypeScript matching C# `Buy=1, Sell=2`
- `AlertDirection` is `1 | 2` matching C# `Above=1, Below=2`
- `tsconfig.json` has `"types": ["vite/client"]` to fix `ImportMeta.env` TypeScript error
- Dark mode: always `dark` class on `<html>`, never togglable — it's dark-only

### Backend
- `PriceAlert` does NOT extend `BaseEntity` → hard delete (by design)
- `Wallet`, `Transaction`, `WatchlistItem` extend `BaseEntity` → soft delete
- Global query filters on soft-deleted entities — EF automatically excludes `IsDeleted=true` rows
- JWT `ClockSkew = TimeSpan.Zero` — access token expires exactly at `expiresAt`
- All controller methods use `private Guid GetCurrentUserId()` helper
- `WalletController` has route ordering issue potential: `POST /transfer` must be defined before `POST /{id}/deposit` — currently fine as `transfer` is not a Guid

### Auth Pages (Vietnamese)
- All labels, validation messages, and placeholders are in Vietnamese
- Error alert style: `rounded-xl bg-red-500/10 border border-red-500/20 text-red-400`

### MetaMask / On-Chain
- `useMetaMask` uses raw `window.ethereum` — no ethers.js/wagmi dependency
- Extend Window type: `declare global { interface Window { ethereum?: EthereumProvider } }`
- `connect()` calls `eth_requestAccounts` → returns first account
- Listens to `accountsChanged` + `chainChanged` events for live updates
- EVM address validation regex: `/^0x[a-fA-F0-9]{40}$/`

### Orders / Positions
- `OrderTriggerEvaluator` is a pure static class — zero DB/DI dependencies — test without mocks
- Position `id` must be used as React key on trade cards (not `coinId` — user can open multiple positions for same coin)
- Background services (`OrderMonitorBackgroundService`, `LiquidationBackgroundService`) use `IServiceScopeFactory` to create scoped DB context per polling cycle

### Leaderboard
- `html-to-image` `toPng()` — pass `{ cacheBust: true, backgroundColor: '#111827' }` to prevent CORS issues with external images
- Leaderboard endpoint is `[AllowAnonymous]` — anyone can view rankings without login

---

## Watchlist Sync Flow

On login, `App.tsx` checks `localStorage` for pre-login watchlist items:
```ts
const items = getLocalStorageWatchlist()  // reads 'crypto_watchlist' LS key
if (items.length > 0) syncMut.mutate(items)  // POST /Watchlist/sync
// server merges, returns full list; LS key is cleared on success
```
`getLocalStorageWatchlist()` — exported from `useWatchlist.ts` — maps string[] of coinIds to `{ coinId, coinSymbol }`.

---

## Build Status (as of 2026-05-16)

```
✓ built in 12.01s
dist/assets/index-*.js               29.43 kB │ gzip:  9.14 kB
dist/assets/vendor-klinecharts-*.js  202.91 kB │ gzip: 52.51 kB
dist/assets/vendor-lightweight-*.js  161.73 kB │ gzip: 53.34 kB
dist/assets/vendor-charts-*.js       268.53 kB │ gzip: 75.70 kB
dist/assets/vendor-react-*.js        138.14 kB │ gzip: 44.20 kB
```
Backend: `dotnet build` → 0 errors, 1 warning (NuGet version mismatch in Tests project — benign).
Tests: `dotnet test` → **100 tests passed** (was 55 before 2026-05-16 session).

---

## Test Coverage

```
CryptoDashboard.Tests/
  Services/
    AuthServiceTests.cs              ← login, register, JWT, refresh token
    WalletServiceTests.cs            ← deposit, transfer, holdings
    TransactionServiceTests.cs       ← buy/sell balance integrity, soft-delete reversal (7 tests)
    PortfolioServiceTests.cs         ← snapshot idempotency, history forward-fill
    WatchlistServiceTests.cs         ← add, sync, soft-delete
    PriceAlertServiceTests.cs        ← create, delete, ownership
    OrderServiceTests.cs             ← CRUD, cross-user isolation (7 tests)
    OrderTriggerEvaluatorTests.cs    ← 18 Theory tests: all 6 type×side combos × triggered/not/edge
    PositionServiceTests.cs          ← liquidation math, PnL, collateral, ownership (13 tests)
```
- Total: **100 tests**, all green
- `OrderTriggerEvaluatorTests` uses `[Theory][InlineData]` — pure function, no mocks needed
- DB tests use EF Core `InMemoryDatabase`; soft-delete tests call `.IgnoreQueryFilters()` to verify IsDeleted=true

---

## Production Infrastructure

### Serilog Structured Logging
- Console sink (JSON-like) + rolling file sink → `logs/log-YYYYMMDD.txt` (7-day retention)
- Minimum level: `Information`; `Microsoft.AspNetCore` → `Warning` to suppress noise
- Configured in `Program.cs` via `UseSerilog()` before `builder.Build()`
- `appsettings.json` section:
  ```json
  "Serilog": { "MinimumLevel": { "Default": "Information", "Override": { "Microsoft.AspNetCore": "Warning" } } }
  ```

### Rate Limiting (ASP.NET Core built-in)
- Policy `"crypto"`: 30 req/min per IP (FixedWindow) — applied on all `CryptoController` endpoints
- Policy `"leaderboard"`: 10 req/min per IP (FixedWindow) — applied on `GET /portfolio/leaderboard`
- On limit exceeded: returns `429 Too Many Requests`

### Health Checks
| Endpoint | Type | Description |
|---|---|---|
| `GET /health/live` | Liveness | Always 200 OK (app is running) |
| `GET /health/ready` | Readiness | 200 if PostgreSQL responds, 503 if not |
- NuGet: `AspNetCore.HealthChecks.NpgSql`
- `Dockerfile` `HEALTHCHECK` hits `/health/live` every 30 s

---

## Docker & Deployment

### Files
| File | Purpose |
|---|---|
| `CryptoDashboard.Api/Dockerfile` | Multi-stage: `mcr.microsoft.com/dotnet/sdk:9.0` build → `aspnet:9.0` runtime; non-root user `app`; `HEALTHCHECK curl /health/live` |
| `CryptoDashboard.Api/.dockerignore` | Excludes bin/, obj/, logs/, .env* |
| `crypto-frontend/Dockerfile` | Multi-stage: `node:20-alpine` build → `nginx:1.27-alpine` serve |
| `crypto-frontend/nginx.conf` | SPA `try_files` fallback, gzip, `Cache-Control: immutable` for `/assets/` |
| `crypto-frontend/.dockerignore` | Excludes node_modules/, dist/, .env* |
| `docker-compose.yml` | postgres + api + frontend; api waits on `postgres` healthcheck |
| `.env.docker.example` | Template for local Docker env vars |
| `render.yaml` | Render.com Blueprint — 1 Postgres + 2 Web services (Singapore region) |
| `DEPLOY.md` | Step-by-step guide: local Docker compose + Render.com one-click deploy |

### Local Docker (when Docker Desktop available)
```bash
cp .env.docker.example .env.docker
# fill in JWT_SECRET_KEY (min 32 chars)
docker compose --env-file .env.docker up --build
# Frontend: http://localhost:5173    API: http://localhost:8080
```

### Render.com Blueprint (production)
1. Push to GitHub main branch
2. Render dashboard → "New +" → "Blueprint" → connect repo
3. Render reads `render.yaml`, provisions Postgres + API + Frontend automatically
4. After first deploy: set `Alchemy__ApiKey` in API service env vars (optional)
- `Jwt__SecretKey` is auto-generated by Render (`generateValue: true`)
- API runs on port 8080 (`ASPNETCORE_URLS=http://+:8080`)
- Auto EF migrations: `RunMigrationsOnStartup=true`
- CORS: frontend host injected via `fromService` reference

---

## Roadmap Status

- ✅ Week 1: Settings profile API, Wallet transfer, Delete guard, ConvertPage bug fix
- ✅ Week 2: Code splitting, React.lazy, ErrorBoundary, NotFoundPage
- ✅ Week 3: Auth pages in Vietnamese, `.env.example`, index.html SEO, main.tsx config
- ✅ Backend: `PUT /api/auth/profile` + `POST /api/Wallet/transfer` implemented
- ✅ **Feature set 2**: Orders (Stop-loss/Take-profit/Limit) + Margin Positions + On-Chain Wallets + Leaderboard
- ✅ **Production-ready infra**: Serilog, rate limiting, health checks, Docker, Render.com deploy
- ✅ **Test suite**: 100 tests (was 55), including Theory tests for trigger logic
- ⏳ **Next**: Complete Render.com deploy (user needs to sign up + connect GitHub repo)
