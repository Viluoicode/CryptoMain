# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CryptoDash** — full-stack crypto portfolio simulator with real-time trading terminal, margin positions, on-chain wallet tracking, and social leaderboard.

- **Backend**: ASP.NET Core .NET 9, Clean Architecture (Domain / Application / Infrastructure / Api)
- **Frontend**: React 18 + TypeScript + Vite, in `crypto-frontend/`
- **Database**: PostgreSQL via Npgsql/EF Core

---

## Commands

### Backend (from repo root)
```bash
dotnet build                          # build all projects
dotnet run --project CryptoDashboard.Api  # start API (https://localhost:7103)
dotnet ef migrations add <Name> \
  --project CryptoDashboard.Infrastructure \
  --startup-project CryptoDashboard.Api    # create migration
dotnet ef database update \
  --startup-project CryptoDashboard.Api    # apply migrations
dotnet test                           # run all tests
```

### Frontend (from `crypto-frontend/`)
```bash
npm run dev      # dev server :5173
npm run build    # tsc + vite build → dist/
npm run lint     # ESLint
```

### Environment
- Backend secrets: `dotnet user-secrets set "Jwt:SecretKey" "..."` (Api project)
- Frontend: `crypto-frontend/.env.local` → `VITE_API_URL=https://localhost:7103`

---

## Backend Architecture

### Project layout
```
CryptoDashboard.Domain/         Entities, enums — no dependencies
CryptoDashboard.Application/    Interfaces, DTOs, Options — depends on Domain only
CryptoDashboard.Infrastructure/ EF Core, services, background workers — implements Application
CryptoDashboard.Api/            Controllers, middleware, Program.cs — depends on all
```

### Domain Entities (all in `CryptoDashboard.Domain/Entities/`)
- `User` — email + username (unique), passwordHash, refresh token
- `Wallet` — FiatBalance (USDT), soft-deleted, belongs to User
- `Transaction` — Buy/Sell, deducts/adds FiatBalance, soft-deleted
- `PriceHistory` — time-series from CoinGecko (CoinId, Price, RecordedAt)
- `PortfolioSnapshot` — daily snapshot (TotalValue, TotalInvested, ProfitLoss, SnapshotDate)
- `WatchlistItem` — (UserId, CoinId) unique, soft-deleted
- `PriceAlert` — TargetPrice, Direction (Above/Below), hard-deleted once triggered
- `TradeOrder` — conditional orders: StopLoss, TakeProfit, Limit; monitored by `OrderMonitorBackgroundService`
- `Position` — margin positions with leverage, CollateralAmount, LiquidationPrice precomputed at open; monitored by `LiquidationBackgroundService`
- `OnChainWallet` — external EVM address tracked via Alchemy; TokensJson stores ERC-20 balances as JSON

### Enums (in entity files)
- `TransactionType`: Buy=1, Sell=2
- `OrderSide`: Buy=1, Sell=2
- `OrderType`: StopLoss=1, TakeProfit=2, Limit=3
- `OrderStatus`: Pending=1, Filled=2, Cancelled=3, Failed=4
- `PositionSide`: Long=1, Short=2
- `PositionStatus`: Open=1, Closed=2, Liquidated=3
- `LeaderboardPeriod`: Week=1, Month=2, AllTime=3

### Soft-delete pattern
`BaseEntity` (`CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`) — `ApplicationDbContext.SaveChangesAsync` intercepts `EntityState.Deleted` and sets `IsDeleted=true` instead. Global query filters on `Wallet`, `Transaction`, `WatchlistItem` exclude soft-deleted records automatically.

### Service interfaces (Application layer)
| Interface | Implementation |
|---|---|
| `IAuthService` | `AuthService` |
| `IWalletService` | `WalletService` |
| `ITransactionService` | `TransactionService` |
| `IPortfolioService` | `PortfolioService` |
| `IWatchlistService` | `WatchlistService` |
| `IPriceAlertService` | `PriceAlertService` |
| `ICryptoService` | `CryptoService` (CoinGecko HTTP, Polly retry+circuit breaker) |
| `ICryptoPriceCache` | `MemoryCryptoPriceCache` (singleton in-memory, TTL) |
| `IOrderService` | `OrderService` |
| `IPositionService` | `PositionService` |
| `IOnChainWalletService` | `OnChainWalletService` (Alchemy RPC) |

### Background services
- `CryptoPriceRefreshService` — updates `ICryptoPriceCache` from CoinGecko on interval
- `PortfolioSnapshotBackgroundService` — daily midnight snapshot for all active users
- `OrderMonitorBackgroundService` — polls every 5s, executes triggered stop/TP/limit orders
- `LiquidationBackgroundService` — polls every 10s, liquidates positions below maintenance margin

All background services use `IServiceScopeFactory` to create a new DI scope per iteration (required for scoped services like `IApplicationDbContext`).

### Margin Trading business rules (`PositionService`)
- Maintenance margin rate: **5%**
- Collateral deducted from wallet on open: `Quantity × EntryPrice ÷ Leverage`
- Liquidation price (Long): `EntryPrice × (1 − 1/Leverage + 0.05)`
- Liquidation price (Short): `EntryPrice × (1 + 1/Leverage − 0.05)`
- On manual close: `wallet.FiatBalance += max(0, collateral + PnL)`
- On liquidation: collateral fully lost, wallet gets nothing

### Leaderboard (`PortfolioService.GetLeaderboardAsync`)
- Reads `PortfolioSnapshots` for the period window
- Groups by UserId, compares earliest vs latest snapshot
- Ranks by `ProfitLossPercentage` descending
- Endpoint is `[AllowAnonymous]`

### Alchemy integration (`OnChainWalletService`)
- Config section: `"Alchemy": { "ApiKey": "...", "BaseUrl": "https://eth-mainnet.g.alchemy.com/v2" }`
- Uses `eth_getBalance` (JSON-RPC) for native balance → divides wei by 1e18
- Uses `alchemy_getTokenBalances` for ERC-20 tokens → stored as `TokensJson` on entity
- Chain-specific RPC URLs for polygon, bsc, arbitrum

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth |
|---|---|---|
| POST | `/register` | No |
| POST | `/login` | No |
| POST | `/refresh` | No |
| POST | `/logout` | Yes |
| GET | `/me` | Yes |
| PUT | `/profile` | Yes |

### Wallet (`/api/wallet`)
| Method | Path |
|---|---|
| GET | `/` |
| POST | `/` |
| GET | `/{id}` |
| PUT | `/{id}` |
| DELETE | `/{id}` |
| POST | `/{id}/deposit` |
| POST | `/transfer` |

### Transaction (`/api/transaction`)
GET `/`, POST `/`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`, GET `/wallet/{walletId}`

### Portfolio (`/api/portfolio`)
GET `/` (summary), GET `/performance`, GET `/history?days=30`, POST `/snapshot`, GET `/leaderboard?period=1&top=50`

### Orders (`/api/order`)
GET `/`, POST `/`, DELETE `/{id}` (cancel)

### Positions (`/api/position`)
GET `/`, POST `/` (open), DELETE `/{id}` (close)

### On-Chain Wallets (`/api/onchainwallet`)
GET `/`, POST `/`, POST `/{id}/sync`, DELETE `/{id}`

### Other
`/api/crypto` (CoinGecko proxy), `/api/watchlist`, `/api/pricealert`

---

## Frontend Architecture

### Key patterns
- All pages are **named exports**: `export function PageName()` — lazy import: `.then(m => ({ default: m.PageName }))`
- API clients in `src/api/` — thin wrappers over `apiClient` (axios)
- Hooks in `src/hooks/` — TanStack Query mutations + queries; cache invalidation on success
- Types in `src/types/index.ts` — mirrors backend DTOs

### API clients
| File | Endpoints |
|---|---|
| `auth.ts` | login, register, refresh, logout, me, updateProfile |
| `wallet.ts` | CRUD, deposit, transfer |
| `transaction.ts` | CRUD |
| `portfolio.ts` | summary, performance, history, snapshot |
| `order.ts` | getAll, create, cancel |
| `position.ts` | getAll, open, close |
| `onchain.ts` | getAll, add, sync, remove |
| `leaderboard.ts` | get(period, top) |

### Key hooks
- `useMetaMask` — raw `window.ethereum` connect/disconnect, accounts/chainId change listeners
- `useOrders` / `useCreateOrder` / `useCancelOrder`
- `usePositions` (refetchInterval 10s) / `useOpenPosition` / `useClosePosition`
- `useOnChainWallets` / `useAddOnChainWallet` / `useSyncOnChainWallet` / `useRemoveOnChainWallet`
- `useLeaderboard(period)` — staleTime 60s
- `useBinanceStream<T>` — WS hook with `onMessageRef` stable callback; uses `data.t` (trade ID) as key, never `data.T` (timestamp)

### Pages
| Route | Component |
|---|---|
| `/trade` | `FuturesPage` — KLineChart terminal, order book, recent trades |
| `/orders` | `FuturesOrdersPage` — conditional orders + margin positions |
| `/onchain` | `OnChainPage` — MetaMask connect + EVM wallet tracking |
| `/leaderboard` | `LeaderboardPage` — P&L% ranking, export as PNG via html-to-image |
| `/portfolio` | `PortfolioPage` |
| `/wallets` | `WalletsPage` |
| others | standard CRUD pages |

### Share/export (LeaderboardPage)
Uses `html-to-image` (`toPng`) to snapshot the leaderboard table div and download as PNG.

### Routing gotchas
- `/trade` triggers `isTerminal` mode in AppLayout — full-height, no padding
- `/market` is public (no auth required)
- `/leaderboard` backend endpoint is `[AllowAnonymous]` — no token needed

### React key / dedup rule (FuturesPage RecentTrades)
Always use `data.t` (Binance sequential trade ID, `number`) as key — never `data.T` (timestamp ms). Full buffer scan O(n≤60) + `Set<number>` at state flush for two-layer deduplication.

---

## Gotchas & Rules

1. **DB transactions**: All multi-step writes use `await using var dbTx = await _context.Database.BeginTransactionAsync()` with try/catch rollback.
2. **Background services need scope**: Never inject scoped services directly — use `IServiceScopeFactory.CreateScope()` per iteration.
3. **Coin IDs**: CoinGecko uses lowercase slugs (`bitcoin`, `ethereum`) — never ticker symbols in backend queries.
4. **Wallet ownership**: Always verify `wallet.UserId == userId` before any write operation.
5. **Price from cache**: `ICryptoPriceCache` is the single source of truth for live prices in background workers — avoids redundant API calls.
6. **EF migrations**: Always run with `--project CryptoDashboard.Infrastructure --startup-project CryptoDashboard.Api`.
7. **Alchemy API key**: stored in user secrets, never in appsettings.json. Section: `"Alchemy:ApiKey"`.
8. **html-to-image**: installed in frontend — use `toPng(ref.current, { cacheBust: true, backgroundColor: '#111827' })`.
