# Architecture

This document describes how CryptoDash is structured — Clean Architecture on the backend, layered React app on the frontend, and the data flows that connect them to upstream APIs (Binance, CoinGecko, Alchemy).

---

## 1. System overview

```mermaid
flowchart TB
    User(("👤 User"))

    subgraph FE [" "]
        direction TB
        FETitle["<b>Frontend — React 18 SPA</b><br/>Vite · Tailwind · Zustand · TanStack Query"]
        Pages["19 lazy-loaded pages"]
        Stores["Zustand stores<br/>(authStore, livePriceStore)"]
        Hooks["Custom hooks<br/>(useBinanceWs, useMetaMask, ...)"]
    end

    subgraph BE [" "]
        direction TB
        BETitle["<b>Backend — ASP.NET Core .NET 9</b><br/>Clean Architecture"]
        ApiLayer["Api · Controllers + Middleware"]
        AppLayer["Application · Interfaces + DTOs"]
        InfraLayer["Infrastructure · EF + Services + Workers"]
        DomainLayer["Domain · Entities"]
    end

    subgraph EXT ["External"]
        direction TB
        DB[("PostgreSQL<br/>(EF Core code-first)")]
        Binance["Binance WebSocket<br/>@miniTicker · @depth20 · @trade · @kline"]
        CoinGecko["CoinGecko REST<br/>(markets, ohlc, history)"]
        Alchemy["Alchemy JSON-RPC<br/>(eth, polygon, bsc, arbitrum)"]
    end

    User --> FE
    FE -- "HTTPS + JWT Bearer" --> BE
    FE -. "WebSocket livestream" .-> Binance
    BE -- "Npgsql" --> DB
    BE -- "HTTP + Polly retry+CB" --> CoinGecko
    BE -- "HTTP JSON-RPC" --> Alchemy

    ApiLayer --> AppLayer
    InfraLayer --> AppLayer
    AppLayer --> DomainLayer
    InfraLayer --> DomainLayer
    ApiLayer --> InfraLayer
```

---

## 2. Clean Architecture layers

```mermaid
flowchart LR
    subgraph A [" "]
        direction TB
        Api["<b>CryptoDashboard.Api</b><br/>Controllers, Middleware,<br/>Program.cs (composition root)"]
    end

    subgraph I [" "]
        direction TB
        Infra["<b>CryptoDashboard.Infrastructure</b><br/>EF DbContext, Services,<br/>Background workers, Health checks"]
    end

    subgraph App [" "]
        direction TB
        Application["<b>CryptoDashboard.Application</b><br/>Interfaces, DTOs,<br/>Options, Validators"]
    end

    subgraph D [" "]
        direction TB
        Domain["<b>CryptoDashboard.Domain</b><br/>Entities, Enums,<br/>BaseEntity"]
    end

    Api -->|depends on| Infra
    Api -->|depends on| Application
    Infra -->|implements| Application
    Application -->|depends on| Domain
    Infra -->|references| Domain
```

**Dependency rule**: dependencies point **inward** toward Domain. Domain knows nothing about EF, ASP.NET, or HTTP. The Application layer defines interfaces (`IWalletService`, `ICryptoService`, `IIdempotencyService`, ...); Infrastructure provides implementations.

| Layer | Dependencies | What lives here |
|---|---|---|
| **Domain** | _none_ | Entities (`User`, `Wallet`, `Transaction`, `Position`, ...), enums, `BaseEntity` |
| **Application** | Domain | Service interfaces, DTOs (request/response shapes), `Options` (config POCOs), FluentValidation validators |
| **Infrastructure** | Domain, Application | `ApplicationDbContext` (EF), service impls, 4 background workers, `MemoryCryptoPriceCache`, health checks, `TokenHasher` |
| **Api** | All three | Controllers, `GlobalExceptionHandlerMiddleware`, JWT setup, CORS, rate limit policies, Swagger, Serilog wiring |

---

## 3. Backend background workers

Four hosted services run independently, each creating its own DI scope per iteration:

```mermaid
flowchart TB
    subgraph Workers["IHostedService implementations"]
        direction LR
        W1["<b>CryptoPriceRefreshService</b><br/>Polls CoinGecko every 30s<br/>→ populates MemoryCryptoPriceCache"]
        W2["<b>OrderMonitorBackgroundService</b><br/>Every 5s · checks pending orders<br/>against current prices · auto-fills triggered"]
        W3["<b>LiquidationBackgroundService</b><br/>Every 10s · compares open positions<br/>against LiquidationPrice · auto-liquidates"]
        W4["<b>PortfolioSnapshotBackgroundService</b><br/>Daily at 00:00 UTC<br/>· creates idempotent daily snapshot per user"]
    end

    W1 -. "writes" .-> Cache[("MemoryCryptoPriceCache<br/>(singleton)")]
    W2 -. "reads" .-> Cache
    W2 -. "writes Transaction" .-> DB[("Postgres")]
    W3 -. "reads" .-> Cache
    W3 -. "updates Position" .-> DB
    W4 -. "reads Holdings" .-> DB
    W4 -. "writes Snapshot" .-> DB
```

**Why `IServiceScopeFactory`?** Background services are singletons; EF `DbContext` is scoped. Each iteration creates a fresh scope so the DbContext is correctly disposed and connections are returned to the pool.

---

## 4. Margin trading flow

Opening a position deducts collateral up front; closing returns `max(0, collateral + PnL)`. Liquidation is monitored continuously.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as PositionController
    participant Svc as PositionService
    participant Cache as CryptoPriceCache
    participant DB as Postgres
    participant Liq as LiquidationBackgroundService

    User->>FE: Click "Open Long 5x BTC, qty=0.1"
    FE->>API: POST /api/position { side: Long, qty: 0.1, leverage: 5 }
    Note over FE,API: Idempotency-Key header optional

    API->>Svc: OpenPositionAsync(userId, request)
    Svc->>Cache: GetPriceAsync("bitcoin")
    Cache-->>Svc: $70,000

    Note over Svc: collateral = (0.1 * 70000) / 5 = $1,400<br/>liquidationPrice = 70000 * (1 - 1/5 + 0.05) = $59,500

    Svc->>DB: BeginTransaction
    Svc->>DB: wallet.FiatBalance -= 1400
    Svc->>DB: INSERT Position(entryPrice, collateral, liquidationPrice)
    Svc->>DB: Commit

    Svc-->>API: PositionResponse
    API-->>FE: 201 Created

    Note over Liq: ────── ~10 seconds later ──────
    Liq->>Cache: GetPriceAsync("bitcoin")
    Cache-->>Liq: $58,000 (below liquidation)
    Liq->>DB: UPDATE Position SET Status=Liquidated, CloseReason="auto"
    Note over Liq: Collateral fully lost · wallet unchanged
```

**Formulas** (in `PositionService`):
- `MaintenanceMarginRate = 0.05` (5%)
- `collateral = entryPrice * quantity / leverage`
- `liquidationPrice (long)  = entryPrice * (1 - 1/leverage + maintenanceMarginRate)`
- `liquidationPrice (short) = entryPrice * (1 + 1/leverage - maintenanceMarginRate)`
- On close: `pnl = (exitPrice - entryPrice) * quantity * sideSign`
- Returned to wallet on close: `max(0, collateral + pnl)`

---

## 5. Real-time price flow

The frontend reads from a **two-tier source**:

```mermaid
flowchart LR
    subgraph Frontend
        direction TB
        WSHook["useBinanceWs(symbols[])"]
        Store[("livePriceStore<br/>(Zustand)")]
        Components["Components<br/>(PortfolioPage, MarketPage,<br/>PriceAlertWatcher, SidebarTicker)"]
    end

    Binance["Binance<br/>@miniTicker stream"]
    CG["CoinGecko<br/>via backend /api/Crypto"]

    Binance -- "WS push" --> WSHook
    WSHook -- "setTick()" --> Store
    Store -- "subscribe" --> Components

    CG -- "REST snapshot (2 min cache)" --> Components

    Note["<b>Conflict resolution:</b><br/>live tick wins over CoinGecko snapshot<br/>(price = liveTick?.price ?? coin.currentPrice)"]
```

**WebSocket discipline**:
- Exponential backoff reconnect: 1s → 2s → 4s → ... → 30s max
- Single shared connection per symbol set
- Frontend writes to Zustand store; components subscribe granularly to avoid re-render storms
- Trade-ID deduplication uses `data.t` (sequential trade ID, `number`), **never** `data.T` (timestamp, can collide)

---

## 6. Auth + refresh-token rotation

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (axios)
    participant API as AuthController
    participant DB as Postgres

    User->>FE: Login (email, password)
    FE->>API: POST /api/auth/login
    API->>API: Verify password (PBKDF2)
    API->>API: Generate access (15min) + refresh (7d)
    API->>DB: UPDATE User SET RefreshToken=SHA256(refresh), ExpiryTime=now+7d
    API-->>FE: { accessToken, refreshToken, user }

    Note over FE: tokenStorage stores both in localStorage<br/>+ computed expiresAt

    rect rgba(50, 100, 200, 0.15)
        Note over FE,API: ── Normal request ──
        FE->>API: GET /api/portfolio<br/>(Authorization: Bearer access)
        Note over FE: Interceptor proactively refreshes<br/>if expiresAt - 30s < now
        API-->>FE: 200 OK
    end

    rect rgba(200, 100, 50, 0.15)
        Note over FE,API: ── Token expired mid-flight ──
        FE->>API: GET /api/wallet
        API-->>FE: 401 Unauthorized

        Note over FE: Response interceptor queues all parallel<br/>requests, fires one refresh call
        FE->>API: POST /api/auth/refresh { refreshToken }
        API->>DB: Verify SHA256(refresh) matches User.RefreshToken
        API->>API: Rotate: new access + new refresh
        API->>DB: UPDATE User SET RefreshToken=SHA256(new)
        API-->>FE: { accessToken, refreshToken }

        Note over FE: Retry all queued requests with new token
    end

    rect rgba(200, 50, 50, 0.15)
        Note over FE: ── Refresh fails (expired / revoked) ──
        FE->>FE: tokenStorage.clear()
        FE->>FE: window.dispatchEvent('auth:logout')
        Note over FE: authStore listens → state.isAuthenticated = false<br/>→ ProtectedRoute redirects to /login
    end
```

**Security details**:
- Access token: HS256, 15 minutes, `ClockSkew = TimeSpan.Zero` (expires exactly at `exp`)
- Refresh token: random 64-byte base64, 7 days, **stored hashed** (SHA-256) — original returned to client only once
- `ChangePasswordAsync` nullifies refresh token → forces re-login on all devices
- Rate limit on `/auth/login` (5/min/IP) and `/auth/register` (3/min/IP)

---

## 7. Frontend bundle splitting

Vite `manualChunks` config in `vite.config.ts` splits the bundle so charting libs (which are large) only load on the page that uses them:

| Chunk | Loaded on |
|---|---|
| `index` (main) | always — 9 KB gzip |
| `vendor-react` | always — 44 KB gzip |
| `vendor-query` | always — 13 KB gzip |
| `vendor-router` | always — 8 KB gzip |
| `vendor-klinecharts` | `/trade` only — 53 KB gzip |
| `vendor-lightweight` | `/market/:coinId` only — 53 KB gzip |
| `vendor-charts` (Recharts) | dashboard/portfolio only — 76 KB gzip |
| `vendor-forms` | login/register only — 22 KB gzip |

**First paint (landing page)**: ~74 KB gzip total.

---

## 8. Soft delete pattern

Entities inheriting `BaseEntity` (`Wallet`, `Transaction`, `WatchlistItem`) are soft-deleted:

1. `ApplicationDbContext.SaveChangesAsync` overrides intercept `EntityState.Deleted` → switch to `Modified`, set `IsDeleted=true`, `DeletedAt=now`.
2. Global query filter `HasQueryFilter(e => !e.IsDeleted)` automatically excludes soft-deleted rows from every query.
3. Tests can opt out with `.IgnoreQueryFilters()` to verify the row is actually flagged.

Entities **without** `BaseEntity` (`PriceAlert`, `TradeOrder`, `Position`, `OnChainWallet`) are hard-deleted — by design, since orders/positions need to preserve history once closed.

---

## 9. Where to look in the code

| Concern | File |
|---|---|
| Composition root | `CryptoDashboard.Api/Program.cs` |
| Auth flow | `Infrastructure/Services/AuthService.cs` + `Api/Controllers/AuthController.cs` |
| Order trigger logic (pure, easy to test) | `Infrastructure/Services/OrderTriggerEvaluator.cs` |
| Margin math | `Infrastructure/Services/PositionService.cs` (`OpenPositionAsync`, `ClosePositionAsync`) |
| Soft-delete interceptor | `Infrastructure/Persistence/ApplicationDbContext.cs` (`SaveChangesAsync`) |
| WebSocket hook | `crypto-frontend/src/hooks/useBinanceWs.ts` + `useBinanceStream.ts` |
| Trading terminal | `crypto-frontend/src/pages/FuturesPage.tsx` |
| Live price store | `crypto-frontend/src/store/livePriceStore.ts` |
