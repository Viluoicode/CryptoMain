# CryptoDashboard — Execution Plan (Phase 4 → 6)

> **Author:** Senior .NET Solutions Architect
> **Date:** 2026-03-14
> **Status:** DRAFT — Awaiting approval before implementation
> **Repo:** Viluoicode/CryptoMain (ASP.NET Core 9.0 — Clean Architecture)

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Phase 4: Core Backend Completion](#2-phase-4-core-backend-completion)
   - [4.1 External Crypto API Integration](#41-external-crypto-api-integration)
   - [4.2 Caching Mechanism](#42-caching-mechanism)
   - [4.3 Background Services](#43-background-services)
3. [Phase 5: Database Design & Entity Framework Core](#3-phase-5-database-design--entity-framework-core)
   - [5.1 Core Entity Definitions](#51-core-entity-definitions)
   - [5.2 Entity Relationships](#52-entity-relationships)
   - [5.3 EF Core DbContext, Migrations & Architecture](#53-ef-core-dbcontext-migrations--architecture)
4. [Phase 6: Frontend Integration Strategy (React)](#4-phase-6-frontend-integration-strategy-react)
   - [6.1 Essential UI Components](#61-essential-ui-components)
   - [6.2 State Management & API Fetching](#62-state-management--api-fetching)
5. [Appendix: Risk Register & Dependencies](#5-appendix-risk-register--dependencies)

---

## 1. Current State Assessment

### Completed (Phase 1–3)

| Area | Status | Details |
|------|--------|---------|
| Clean Architecture | ✅ Done | 4 projects: Domain, Application, Infrastructure, Api |
| Domain Entities | ✅ Done | `User`, `Wallet`, `Transaction`, `CryptoCurrency` |
| JWT Authentication | ✅ Done | Register, Login, Refresh Token with HS256 |
| CRUD — Wallets | ✅ Done | Create, Read, Update, Delete with user ownership |
| CRUD — Transactions | ✅ Done | Create, Read (all/by wallet), Delete |
| Portfolio Analytics | ✅ Done | Summary (allocations, P&L) + Performance (unrealized P&L) |
| CoinGecko Integration | ✅ Basic | `CryptoService` calls `/coins/markets`, 60s MemoryCache |
| Code Cleanup | ✅ Done | Removed placeholders, unused files, debug middleware |
| Input Validation | ✅ Done | DataAnnotations on Auth & Transaction DTOs |
| CORS | ✅ Done | Environment-specific (AllowAll in Dev, configurable in Prod) |
| PortfolioController Fix | ✅ Done | `GetSummary()` → `PortfolioSummaryResponse` |

### Identified Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| CoinGecko free tier rate limits (10-30 req/min) — no retry/backoff logic | 🔴 High | 4 |
| Cache is only on `GetTopCryptocurrencies` — `GetCryptocurrencyById` uncached | 🔴 High | 4 |
| No background refresh of prices — every request hits API or stale cache | 🟡 Medium | 4 |
| `CryptoCurrency` entity exists but has no DbSet (not persisted) | 🟡 Medium | 5 |
| `Wallet.CurrencySymbol` and `Wallet.Balance` — legacy unused fields | 🟡 Medium | 5 |
| No `PriceHistory` entity for historical charts | 🟡 Medium | 5 |
| No test project at all | 🔴 High | 4–5 |
| No global exception handling middleware | 🟡 Medium | 4 |
| No pagination on list endpoints | 🟡 Medium | 5 |
| No Update Transaction endpoint | 🟢 Low | 5 |
| No frontend exists | 🟡 Medium | 6 |

---

## 2. Phase 4: Core Backend Completion

### 4.1 External Crypto API Integration

#### 4.1.1 Current Implementation Analysis

The existing `CryptoService` (in `CryptoDashboard.Infrastructure/Services/CryptoService.cs`) uses:
- **API:** CoinGecko free API (`api.coingecko.com/api/v3/coins/markets`)
- **HttpClient:** Injected via `IHttpClientFactory` typed client pattern
- **Endpoints called:**
  - `GET /coins/markets?vs_currency=usd&order=market_cap_desc&per_page={limit}&page=1` — top coins
  - `GET /coins/markets?vs_currency=usd&ids={coinId}` — single coin lookup
- **Issues:** No retry logic, no rate-limit handling, no error classification

#### 4.1.2 Planned Changes

**A. Configuration-Based API Provider**

Add to `appsettings.json`:
```json
{
  "CryptoApi": {
    "Provider": "CoinGecko",
    "BaseUrl": "https://api.coingecko.com/api/v3",
    "ApiKey": "",
    "RateLimitPerMinute": 10,
    "TimeoutSeconds": 30,
    "RetryCount": 3,
    "RetryBaseDelayMs": 1000
  }
}
```

Bind to a strongly-typed options class:
```
File: CryptoDashboard.Application/Options/CryptoApiOptions.cs
```

**B. Resilient HttpClient with Polly**

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.Extensions.Http.Polly` | 9.x | Retry + Circuit Breaker policies |

Polly policy pipeline for the `CryptoService` typed HttpClient:

| Policy | Configuration | Rationale |
|--------|--------------|-----------|
| **Retry** | 3 retries, exponential backoff (1s → 2s → 4s), jitter | Handle transient 5xx / timeout |
| **Circuit Breaker** | Break after 5 consecutive failures, 30s open duration | Prevent API hammering when down |
| **Rate Limiter** | `System.Threading.RateLimiting.TokenBucketRateLimiter` — 10 tokens/min | Respect CoinGecko free tier |
| **Timeout** | 10s per-request timeout (inner), 30s total (outer) | Fail fast |

Registration in `Program.cs`:
```csharp
builder.Services.AddHttpClient<ICryptoService, CryptoService>(client => { ... })
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());
```

**C. Rate Limiting Implementation**

- Use `System.Threading.RateLimiting.TokenBucketRateLimiter` (built-in .NET 8+)
- Create a `RateLimitedCryptoService` decorator or integrate limiting into `CryptoService` directly
- Approach: Wrap outgoing HTTP calls with `RateLimiter.AcquireAsync()` before sending

**D. Error Handling Improvements**

Create a custom exception hierarchy:
```
CryptoDashboard.Application/Exceptions/
├── CryptoApiException.cs          // Base for all external API errors
├── CryptoApiRateLimitException.cs // HTTP 429 — Too Many Requests
└── CryptoApiUnavailableException.cs // HTTP 5xx — Service unavailable
```

**E. Global Exception Handling Middleware**

```
File: CryptoDashboard.Api/Middleware/GlobalExceptionHandlerMiddleware.cs
```

| Exception Type | HTTP Status | Response |
|---------------|-------------|----------|
| `ValidationException` | 400 | `{ errors: [...] }` |
| `UnauthorizedAccessException` | 401 | `{ message: "..." }` |
| `KeyNotFoundException` | 404 | `{ message: "..." }` |
| `CryptoApiRateLimitException` | 429 | `{ message: "...", retryAfter: N }` |
| `CryptoApiUnavailableException` | 503 | `{ message: "..." }` |
| Unhandled `Exception` | 500 | `{ message: "Internal server error" }` (no leak) |

Register in `Program.cs`:
```csharp
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
```

#### 4.1.3 File Changes Summary

| File | Action | Layer |
|------|--------|-------|
| `Application/Options/CryptoApiOptions.cs` | **Create** | Application |
| `Application/Exceptions/CryptoApiException.cs` | **Create** | Application |
| `Application/Exceptions/CryptoApiRateLimitException.cs` | **Create** | Application |
| `Application/Exceptions/CryptoApiUnavailableException.cs` | **Create** | Application |
| `Infrastructure/Services/CryptoService.cs` | **Modify** — add rate limiting, error handling | Infrastructure |
| `Infrastructure/CryptoDashboard.Infrastructure.csproj` | **Modify** — add `Microsoft.Extensions.Http.Polly` | Infrastructure |
| `Api/Middleware/GlobalExceptionHandlerMiddleware.cs` | **Create** | Api |
| `Api/Program.cs` | **Modify** — register Polly, middleware, options | Api |
| `Api/appsettings.json` | **Modify** — add `CryptoApi` section | Api |

---

### 4.2 Caching Mechanism

#### 4.2.1 Current Implementation Analysis

- `IMemoryCache` is registered in `Program.cs`
- Only `GetTopCryptocurrenciesAsync` uses cache (key: `"TopCryptos"`, TTL: 60s)
- `GetCryptocurrencyByIdAsync` has **no caching** — every call from `WalletService.CalculateHoldingsAsync` or `PortfolioService` makes a live API request
- The `PortfolioService.GetPortfolioSummaryAsync` calls `GetCryptocurrencyByIdAsync` in a loop for each coin — **N+1 API problem**

#### 4.2.2 Planned Multi-Layer Caching Strategy

```
┌──────────────────────────────────────────────────┐
│                  API Request                      │
├──────────────────────────────────────────────────┤
│  Layer 1: MemoryCache (L1)                       │
│  ├─ Key: "crypto:top:{limit}"     TTL: 120s     │
│  ├─ Key: "crypto:coin:{coinId}"   TTL: 120s     │
│  └─ Key: "crypto:prices"          TTL: 120s     │ ← batch prices map
├──────────────────────────────────────────────────┤
│  Layer 2: Database (PriceHistory)                │
│  └─ Fallback if cache miss + API failure         │
├──────────────────────────────────────────────────┤
│  Layer 3: CoinGecko API (external)               │
│  └─ Rate-limited, with retry + circuit breaker   │
└──────────────────────────────────────────────────┘
```

**A. New Interface — `ICryptoPriceCache`**

```
File: CryptoDashboard.Application/Interfaces/ICryptoPriceCache.cs
```

Methods:
```csharp
public interface ICryptoPriceCache
{
    Task<decimal?> GetPriceAsync(string coinId);
    Task SetPriceAsync(string coinId, decimal price, TimeSpan? ttl = null);
    Task<Dictionary<string, decimal>> GetBatchPricesAsync(IEnumerable<string> coinIds);
    Task SetBatchPricesAsync(Dictionary<string, decimal> prices, TimeSpan? ttl = null);
    Task InvalidateAsync(string coinId);
    Task InvalidateAllAsync();
}
```

**B. Implementation — `MemoryCryptoPriceCache`**

```
File: CryptoDashboard.Infrastructure/Caching/MemoryCryptoPriceCache.cs
```

- Uses `IMemoryCache` with per-coin keys: `crypto:price:{coinId}`
- Default TTL: 120 seconds (configurable via `CryptoApiOptions`)
- Thread-safe via `SemaphoreSlim` for batch operations

**C. Fix the N+1 API Problem in PortfolioService**

Current problem:
```csharp
// PortfolioService.GetPortfolioSummaryAsync — CURRENT (N+1)
foreach (var coin in grouped) {
    var coinData = await _cryptoService.GetCryptocurrencyByIdAsync(coin.CoinId); // 1 API call per coin!
}
```

Solution: Add a new batch method to `ICryptoService`:
```csharp
Task<Dictionary<string, CryptoListResponse>> GetCryptocurrenciesByIdsAsync(IEnumerable<string> coinIds);
```

This calls `GET /coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana` — **single API call** for all coins.

**D. Refactor `PortfolioService` and `WalletService`**

- Inject `ICryptoPriceCache` alongside `ICryptoService`
- Collect all unique `coinId` values first → batch fetch → calculate

#### 4.2.3 File Changes Summary

| File | Action | Layer |
|------|--------|-------|
| `Application/Interfaces/ICryptoPriceCache.cs` | **Create** | Application |
| `Application/Interfaces/ICryptoService.cs` | **Modify** — add `GetCryptocurrenciesByIdsAsync` | Application |
| `Infrastructure/Caching/MemoryCryptoPriceCache.cs` | **Create** | Infrastructure |
| `Infrastructure/Services/CryptoService.cs` | **Modify** — add batch method, integrate cache | Infrastructure |
| `Infrastructure/Services/PortfolioService.cs` | **Modify** — use batch API instead of N+1 | Infrastructure |
| `Infrastructure/Services/WalletService.cs` | **Modify** — use batch API | Infrastructure |
| `Api/Program.cs` | **Modify** — register `ICryptoPriceCache` | Api |

---

### 4.3 Background Services

#### 4.3.1 Purpose

Periodically refresh crypto prices in the cache so that:
1. User requests always hit warm cache (near-zero latency for portfolio calculations)
2. External API is called on a predictable schedule (not per-user-request)
3. `PriceHistory` table gets populated for historical chart data (Phase 5)

#### 4.3.2 Service: `CryptoPriceRefreshService`

```
File: CryptoDashboard.Infrastructure/BackgroundServices/CryptoPriceRefreshService.cs
```

**Type:** `BackgroundService` (inherits `Microsoft.Extensions.Hosting.BackgroundService`)

**Behavior:**

```
┌──────────────────────────────────────────────────────┐
│              CryptoPriceRefreshService                │
├──────────────────────────────────────────────────────┤
│  Interval: Every 2 minutes (configurable)            │
│                                                      │
│  On each tick:                                       │
│  1. Fetch top 100 coins from CoinGecko               │
│  2. Also fetch coins that users actually hold:        │
│     SELECT DISTINCT CoinId FROM Transactions          │
│  3. Update ICryptoPriceCache with fresh prices        │
│  4. (Phase 5) Write to PriceHistory table             │
│  5. Log: "Refreshed {N} coin prices"                  │
│                                                      │
│  Error handling:                                     │
│  - If API fails → log warning, keep stale cache      │
│  - If 5 consecutive failures → circuit break, retry  │
│    after 5 minutes                                   │
│  - Never crash the host process                      │
└──────────────────────────────────────────────────────┘
```

**Configuration** (in `appsettings.json`):
```json
{
  "CryptoApi": {
    "BackgroundRefreshIntervalSeconds": 120,
    "BackgroundRefreshTopCount": 100
  }
}
```

**DI Registration:**
```csharp
builder.Services.AddHostedService<CryptoPriceRefreshService>();
```

#### 4.3.3 Service: `PortfolioSnapshotService` (Optional — Phase 5 dependency)

```
File: CryptoDashboard.Infrastructure/BackgroundServices/PortfolioSnapshotService.cs
```

**Purpose:** Once daily, snapshot each user's portfolio total value for historical tracking.

**Behavior:**
- Runs at 00:00 UTC (configurable via cron expression or TimeSpan)
- For each active user: calculate current portfolio value → write to `PortfolioSnapshot` table
- Enables "Portfolio value over time" chart in the frontend

> ⚠️ **Deferred to Phase 5** since it depends on the `PortfolioSnapshot` entity/table.

#### 4.3.4 File Changes Summary

| File | Action | Layer |
|------|--------|-------|
| `Infrastructure/BackgroundServices/CryptoPriceRefreshService.cs` | **Create** | Infrastructure |
| `Infrastructure/BackgroundServices/PortfolioSnapshotService.cs` | **Create** (stub) | Infrastructure |
| `Api/Program.cs` | **Modify** — `AddHostedService<CryptoPriceRefreshService>()` | Api |
| `Api/appsettings.json` | **Modify** — add background refresh config | Api |

---

## 3. Phase 5: Database Design & Entity Framework Core

### 5.1 Core Entity Definitions

#### 5.1.1 Entity Inventory

| Entity | Status | DbSet | Table Name |
|--------|--------|-------|------------|
| `User` | ✅ Exists | `Users` | `Users` |
| `Wallet` | ⚠️ Has legacy fields | `Wallets` | `Wallets` |
| `Transaction` | ✅ Exists | `Transactions` | `Transactions` |
| `CryptoCurrency` | ⚠️ Exists but NOT persisted (no DbSet) | — | — |
| `PriceHistory` | 🆕 New | `PriceHistories` | `PriceHistories` |
| `PortfolioSnapshot` | 🆕 New | `PortfolioSnapshots` | `PortfolioSnapshots` |

#### 5.1.2 Entity: `Wallet` — Migration to Clean Up Legacy Fields

**Current state:**
```csharp
public string CurrencySymbol { get; set; } = string.Empty; // UNUSED in any service
public decimal Balance { get; set; } = 0;                   // UNUSED — holdings are calculated from transactions
```

**Action:** Create a new EF migration to remove these columns:
```
Migration name: RemoveWalletLegacyFields
```

**Updated Wallet entity:**
```csharp
public class Wallet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;          // Rename from "Users" to "User" (singular)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
```

> **Note:** Navigation property rename `Users` → `User` requires updating `ApplicationDbContext.OnModelCreating` and any service references.

#### 5.1.3 Entity: `PriceHistory` (New)

```
File: CryptoDashboard.Domain/Entities/PriceHistory.cs
```

```csharp
public class PriceHistory
{
    public long Id { get; set; }                    // Auto-increment PK (high-volume table)
    public string CoinId { get; set; } = string.Empty;  // "bitcoin", "ethereum"
    public decimal Price { get; set; }              // USD price at snapshot time
    public decimal MarketCap { get; set; }
    public decimal Volume24h { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
```

**Purpose:** Stores periodic price snapshots from `CryptoPriceRefreshService` for:
- Historical price charts
- Performance comparison over time
- Fallback prices when API is unavailable

**Indexes:**
```sql
CREATE INDEX IX_PriceHistory_CoinId_RecordedAt ON PriceHistories (CoinId, RecordedAt DESC);
```

**Retention policy:** Keep 30 days of data; older records can be pruned by a scheduled job.

#### 5.1.4 Entity: `PortfolioSnapshot` (New)

```
File: CryptoDashboard.Domain/Entities/PortfolioSnapshot.cs
```

```csharp
public class PortfolioSnapshot
{
    public long Id { get; set; }                    // Auto-increment PK
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal TotalValue { get; set; }         // Total portfolio value at snapshot time
    public decimal TotalInvested { get; set; }      // Net invested (buy - sell) at snapshot time
    public decimal ProfitLoss { get; set; }         // TotalValue - TotalInvested
    public DateTime SnapshotDate { get; set; }      // Date of snapshot (UTC, date only)
}
```

**Purpose:** Daily portfolio value snapshot for "Portfolio value over time" chart.

**Indexes:**
```sql
CREATE UNIQUE INDEX IX_PortfolioSnapshot_UserId_Date ON PortfolioSnapshots (UserId, SnapshotDate);
```

---

### 5.2 Entity Relationships

#### 5.2.1 Complete ER Diagram

```
┌──────────────┐     1:N     ┌──────────────┐     1:N     ┌──────────────┐
│     User     │────────────▶│    Wallet    │────────────▶│ Transaction  │
│              │             │              │             │              │
│ Id (PK)      │             │ Id (PK)      │             │ Id (PK)      │
│ Username     │             │ Name         │             │ WalletId (FK)│
│ Email (UQ)   │             │ UserId (FK)  │             │ CoinId       │
│ PasswordHash │             │ CreatedAt    │             │ CoinSymbol   │
│ RefreshToken │             │ UpdatedAt    │             │ CoinName     │
│ RefreshToken │             │              │             │ Type         │
│  ExpiryTime  │             │              │             │ Quantity     │
│ CreatedAt    │             │              │             │ PricePerCoin │
│ LastLoginAt  │             │              │             │ TotalAmount  │
└──────┬───────┘             └──────────────┘             │ Transaction  │
       │                                                  │  Date        │
       │                                                  │ Notes        │
       │     1:N     ┌──────────────────┐                 └──────────────┘
       └────────────▶│PortfolioSnapshot │
                     │                  │
                     │ Id (PK)          │
                     │ UserId (FK)      │        ┌──────────────────┐
                     │ TotalValue       │        │   PriceHistory   │
                     │ TotalInvested    │        │                  │
                     │ ProfitLoss       │        │ Id (PK)          │
                     │ SnapshotDate     │        │ CoinId           │
                     └──────────────────┘        │ Price            │
                                                 │ MarketCap        │
                                                 │ Volume24h        │
                                                 │ RecordedAt       │
                                                 └──────────────────┘
```

#### 5.2.2 Relationship Summary

| Relationship | Type | FK | Delete Behavior |
|-------------|------|-----|-----------------|
| User → Wallet | 1:N | `Wallet.UserId` | **Cascade** (delete user → delete wallets) |
| Wallet → Transaction | 1:N | `Transaction.WalletId` | **Cascade** (delete wallet → delete transactions) |
| User → PortfolioSnapshot | 1:N | `PortfolioSnapshot.UserId` | **Cascade** |
| PriceHistory | Standalone | — | No FK (indexed by `CoinId` string) |

#### 5.2.3 Why `PriceHistory` Has No FK to `CryptoCurrency`

The `CryptoCurrency` entity is a **read model** for API data, not a database entity. Coins are identified by their string `CoinId` (e.g., `"bitcoin"`). Adding a FK would require persisting all coins in a `CryptoCurrencies` table — unnecessary overhead since we only need the price data. The `CoinId` string acts as a natural key.

---

### 5.3 EF Core DbContext, Migrations & Architecture

#### 5.3.1 Updated `ApplicationDbContext`

**New DbSets to add:**
```csharp
public DbSet<PriceHistory> PriceHistories { get; set; } = null!;
public DbSet<PortfolioSnapshot> PortfolioSnapshots { get; set; } = null!;
```

**New `OnModelCreating` configurations:**

```csharp
// PriceHistory configuration
modelBuilder.Entity<PriceHistory>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Id).UseIdentityColumn();
    entity.Property(e => e.CoinId).HasMaxLength(50).IsRequired();
    entity.Property(e => e.Price).HasPrecision(18, 8);
    entity.Property(e => e.MarketCap).HasPrecision(18, 2);
    entity.Property(e => e.Volume24h).HasPrecision(18, 2);
    entity.HasIndex(e => new { e.CoinId, e.RecordedAt }).IsDescending(false, true);
});

// PortfolioSnapshot configuration
modelBuilder.Entity<PortfolioSnapshot>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Id).UseIdentityColumn();
    entity.Property(e => e.TotalValue).HasPrecision(18, 2);
    entity.Property(e => e.TotalInvested).HasPrecision(18, 2);
    entity.Property(e => e.ProfitLoss).HasPrecision(18, 2);
    entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
    entity.HasIndex(e => new { e.UserId, e.SnapshotDate }).IsUnique();
});
```

**Update `IApplicationDbContext`:**
```csharp
DbSet<PriceHistory> PriceHistories { get; }
DbSet<PortfolioSnapshot> PortfolioSnapshots { get; }
```

#### 5.3.2 Migration Plan

| # | Migration Name | Changes |
|---|---------------|---------|
| 4 | `RemoveWalletLegacyFields` | Drop `Wallet.CurrencySymbol`, `Wallet.Balance` columns |
| 5 | `AddPriceHistoryTable` | Create `PriceHistories` table with composite index |
| 6 | `AddPortfolioSnapshotTable` | Create `PortfolioSnapshots` table with unique index |
| 7 | `RenameWalletNavigationProperty` | Fix `Wallet.Users` → `Wallet.User` (no schema change, just metadata) |

**Commands:**
```bash
cd CryptoDashboard.Api
dotnet ef migrations add RemoveWalletLegacyFields -p ../CryptoDashboard.Infrastructure
dotnet ef migrations add AddPriceHistoryTable -p ../CryptoDashboard.Infrastructure
dotnet ef migrations add AddPortfolioSnapshotTable -p ../CryptoDashboard.Infrastructure
dotnet ef database update
```

#### 5.3.3 Service/Repository Pattern Architecture

**Current pattern:** Services directly access `IApplicationDbContext` (no repository layer).

**Decision: Keep the current pattern with improvements.**

**Rationale:**
- The project has 3 entities and ~6 services. A Repository + Unit of Work abstraction adds ceremony without clear benefit at this scale.
- `IApplicationDbContext` already abstracts the database sufficiently for testing (can be mocked).
- If the project grows beyond 10 entities, introduce `IRepository<T>` at that point.

**Improvements to existing services:**

| Improvement | Details |
|-------------|---------|
| **Pagination** | Add `PaginatedList<T>` DTO with `PageNumber`, `PageSize`, `TotalCount`, `Items` |
| **Pagination on list endpoints** | `GetUserWalletsAsync(userId, page, pageSize)`, `GetUserTransactionsAsync(userId, page, pageSize)` |
| **Update Transaction** | Add `UpdateTransactionAsync(transactionId, userId, UpdateTransactionRequest)` to `ITransactionService` |
| **Soft Delete** | Not implemented now — consider in Phase 7 if audit trail needed |

**New DTO:**
```
File: CryptoDashboard.Application/DTOs/Common/PaginatedList.cs
```
```csharp
public class PaginatedList<T>
{
    public List<T> Items { get; set; } = new();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
```

**New DTO:**
```
File: CryptoDashboard.Application/DTOs/Transaction/UpdateTransactionRequest.cs
```
```csharp
public class UpdateTransactionRequest
{
    [Required] public TransactionType Type { get; set; }
    [Required] [Range(0.00000001, double.MaxValue)] public decimal Quantity { get; set; }
    [Required] [Range(0.01, double.MaxValue)] public decimal PricePerCoin { get; set; }
    [StringLength(500)] public string? Notes { get; set; }
    public DateTime? TransactionDate { get; set; }
}
```

#### 5.3.4 File Changes Summary

| File | Action | Layer |
|------|--------|-------|
| `Domain/Entities/PriceHistory.cs` | **Create** | Domain |
| `Domain/Entities/PortfolioSnapshot.cs` | **Create** | Domain |
| `Domain/Entities/Wallet.cs` | **Modify** — remove legacy fields, rename navigation | Domain |
| `Application/Interfaces/IApplicationDbContext.cs` | **Modify** — add new DbSets | Application |
| `Application/Interfaces/ITransactionService.cs` | **Modify** — add `UpdateTransactionAsync` | Application |
| `Application/DTOs/Common/PaginatedList.cs` | **Create** | Application |
| `Application/DTOs/Transaction/UpdateTransactionRequest.cs` | **Create** | Application |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | **Modify** — new entity configs | Infrastructure |
| `Infrastructure/Migrations/...` | **Create** — 3 new migrations | Infrastructure |
| `Infrastructure/Services/TransactionService.cs` | **Modify** — add update + pagination | Infrastructure |
| `Infrastructure/Services/WalletService.cs` | **Modify** — add pagination | Infrastructure |

---

## 4. Phase 6: Frontend Integration Strategy (React)

### 6.1 Essential UI Components

#### 6.1.1 Project Setup

```
Tool: Vite (recommended for speed)
Language: TypeScript
CSS: Tailwind CSS (utility-first, fast prototyping)
```

**Directory structure:**
```
crypto-dashboard-frontend/
├── public/
├── src/
│   ├── api/                    # API client layer
│   │   ├── axiosClient.ts      # Axios instance with interceptors
│   │   ├── authApi.ts          # Auth endpoints
│   │   ├── walletApi.ts        # Wallet endpoints
│   │   ├── transactionApi.ts   # Transaction endpoints
│   │   ├── cryptoApi.ts        # Crypto endpoints
│   │   └── portfolioApi.ts     # Portfolio endpoints
│   ├── components/             # Reusable UI components
│   │   ├── common/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── charts/
│   │   │   ├── PortfolioPieChart.tsx
│   │   │   ├── PriceLineChart.tsx
│   │   │   └── PerformanceBarChart.tsx
│   │   ├── wallet/
│   │   │   ├── WalletCard.tsx
│   │   │   ├── WalletList.tsx
│   │   │   └── CreateWalletModal.tsx
│   │   ├── transaction/
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   └── CreateTransactionForm.tsx
│   │   └── crypto/
│   │       ├── CryptoTable.tsx
│   │       ├── CryptoRow.tsx
│   │       └── CryptoSearchBar.tsx
│   ├── pages/                  # Route-level components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PortfolioPage.tsx
│   │   ├── WalletDetailPage.tsx
│   │   ├── TransactionsPage.tsx
│   │   └── CryptoMarketPage.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWallets.ts
│   │   ├── useTransactions.ts
│   │   └── usePortfolio.ts
│   ├── context/                # React Context providers
│   │   └── AuthContext.tsx
│   ├── types/                  # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/                  # Helpers
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   └── tokenStorage.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx              # React Router config
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

#### 6.1.2 Page Breakdown

| Page | Route | Components Used | API Calls |
|------|-------|----------------|-----------|
| **Login** | `/login` | Form, input fields | `POST /api/auth/login` |
| **Register** | `/register` | Form, input fields | `POST /api/auth/register` |
| **Dashboard** | `/` | `PortfolioPieChart`, `PerformanceBarChart`, summary cards | `GET /api/portfolio`, `GET /api/portfolio/performance` |
| **Portfolio** | `/portfolio` | `PortfolioPieChart`, allocation table, P&L cards | `GET /api/portfolio` |
| **Wallet Detail** | `/wallets/:id` | `WalletCard`, `TransactionTable`, holdings list | `GET /api/wallet/{id}`, `GET /api/transaction/wallet/{id}` |
| **Transactions** | `/transactions` | `TransactionTable`, filter/sort controls, `CreateTransactionForm` | `GET /api/transaction`, `POST /api/transaction` |
| **Crypto Market** | `/market` | `CryptoTable`, `CryptoSearchBar`, `PriceLineChart` | `GET /api/crypto/top` |

#### 6.1.3 Key Component Specifications

**A. Dashboard Page (Main Landing)**

```
┌─────────────────────────────────────────────────────────┐
│  Navbar  [Logo] [Dashboard] [Wallets] [Market] [Logout] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │Total    │  │Net      │  │Profit/  │  │Wallets  │   │
│  │Value    │  │Invested │  │Loss     │  │Count    │   │
│  │$12,345  │  │$10,000  │  │+$2,345  │  │3        │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │  Portfolio Pie Chart │  │  Performance Chart   │     │
│  │  (Coin Allocation)   │  │  (Buy vs Sell)       │     │
│  │                      │  │                      │     │
│  │    [BTC 45%]         │  │   ████ Buy: $8000    │     │
│  │    [ETH 30%]         │  │   ████ Sell: $2000   │     │
│  │    [SOL 25%]         │  │                      │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Recent Transactions                              │   │
│  │  ────────────────────────────────────────         │   │
│  │  🟢 Buy  0.5 BTC  @ $45,000  = $22,500          │   │
│  │  🔴 Sell 1.0 ETH  @ $3,200   = $3,200           │   │
│  │  🟢 Buy  10 SOL   @ $120     = $1,200           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**B. Portfolio Pie Chart**
- Library: `recharts` or `chart.js` via `react-chartjs-2`
- Data source: `GET /api/portfolio` → `Allocations[]`
- Shows coin allocation percentages with colors
- On hover: show coin name, quantity, value

**C. Transaction Form**
- Fields: Wallet (dropdown), Coin (searchable dropdown from `/api/crypto/top`), Type (Buy/Sell toggle), Quantity, Price per Coin, Notes, Date
- Auto-calculate: `Total Amount = Quantity × Price`
- Validation: mirrors backend DataAnnotations
- Submit: `POST /api/transaction`

---

### 6.2 State Management & API Fetching

#### 6.2.1 Architecture Decision: React Query + Context API

| Concern | Solution | Rationale |
|---------|----------|-----------|
| **Server state** (API data) | **TanStack Query (React Query)** | Automatic caching, background refetching, stale-while-revalidate, pagination, mutations with optimistic updates |
| **Client state** (auth token, UI state) | **React Context + useReducer** | Lightweight, no external dependency, sufficient for auth state |
| **Why NOT Redux** | Over-engineering for this scope | React Query handles 90% of state (server data). Only auth needs client state. Redux adds boilerplate without benefit here. |

#### 6.2.2 API Client Setup (Axios)

```
File: src/api/axiosClient.ts
```

**Configuration:**
```typescript
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7103/api',
  headers: { 'Content-Type': 'application/json' }
});
```

**Request interceptor:** Attach JWT `Authorization: Bearer {token}` from localStorage.

**Response interceptor:**
- On `401`: Attempt token refresh via `POST /api/auth/refresh`
  - Success → retry original request with new token
  - Failure → redirect to `/login`, clear tokens
- On `429`: Show rate-limit toast notification
- On `5xx`: Show generic error toast

#### 6.2.3 React Query Configuration

```
File: src/main.tsx
```

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 minutes — matches backend cache TTL
      gcTime: 5 * 60 * 1000,       // 5 minutes garbage collection
      retry: 2,
      refetchOnWindowFocus: true,
    }
  }
});
```

#### 6.2.4 Custom Hook Examples

**`usePortfolio` hook:**
```typescript
// File: src/hooks/usePortfolio.ts
export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: () => portfolioApi.getSummary(),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePortfolioPerformance() {
  return useQuery({
    queryKey: ['portfolio', 'performance'],
    queryFn: () => portfolioApi.getPerformance(),
  });
}
```

**`useCreateTransaction` mutation:**
```typescript
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => transactionApi.create(data),
    onSuccess: () => {
      // Invalidate related queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    }
  });
}
```

#### 6.2.5 Authentication Flow

```
┌─────────┐    POST /auth/login     ┌──────────┐
│  Login   │───────────────────────▶│ Backend  │
│  Page    │◀───────────────────────│          │
│          │  { accessToken,        │          │
│          │    refreshToken,       │          │
│          │    expiresAt }         │          │
└────┬─────┘                        └──────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Store in localStorage:                  │
│  - accessToken                          │
│  - refreshToken                         │
│  - expiresAt                            │
│  Update AuthContext: { user, isAuth }   │
│  Navigate to /dashboard                 │
└─────────────────────────────────────────┘
```

**Token refresh:** Axios interceptor automatically refreshes when receiving 401 before the token actually expires. Optionally, add a timer that refreshes 1 minute before `expiresAt`.

#### 6.2.6 Key NPM Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.x | UI framework |
| `react-router-dom` | ^6.x | Client-side routing |
| `@tanstack/react-query` | ^5.x | Server state management |
| `axios` | ^1.x | HTTP client |
| `recharts` | ^2.x | Charts (Pie, Line, Bar) |
| `tailwindcss` | ^3.x | Utility-first CSS |
| `react-hot-toast` | ^2.x | Toast notifications |
| `@heroicons/react` | ^2.x | Icons |
| `date-fns` | ^3.x | Date formatting |

#### 6.2.7 File Changes Summary

| File | Action |
|------|--------|
| `crypto-dashboard-frontend/` | **Create** — entire React project directory |
| All files in `src/` | **Create** — as listed in 6.1.1 directory structure |
| `package.json` | **Create** — with dependencies from 6.2.6 |
| Backend `appsettings.json` | **Modify** — add `Cors:AllowedOrigins` for frontend URL |

---

## 5. Appendix: Risk Register & Dependencies

### Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | CoinGecko rate limits hit during development | High | Medium | Implement caching (Phase 4.2) before heavy testing |
| R2 | CoinGecko API down/unreachable | Medium | High | Circuit breaker + fallback to `PriceHistory` (Phase 4.1 + 5) |
| R3 | SQL Server not available in dev | Low | High | Document Docker setup for SQL Server container |
| R4 | Portfolio calculation slow with many coins | Medium | Medium | Batch API calls (4.2.2C), background price refresh (4.3) |
| R5 | JWT secret key hardcoded in appsettings | Exists Now | High | Phase 7: Move to User Secrets / Azure Key Vault |
| R6 | No test coverage for new features | High | High | Add test project as first task in each phase |

### Dependency Order

```
Phase 4.1 (Polly + Error Handling)
    └─▶ Phase 4.2 (Caching)
         └─▶ Phase 4.3 (Background Service)
              └─▶ Phase 5.1 (New Entities)
                   └─▶ Phase 5.2 (Relationships)
                        └─▶ Phase 5.3 (Migrations + Pagination)
                             └─▶ Phase 6.1 (React Setup)
                                  └─▶ Phase 6.2 (State + API Integration)
```

### Estimated Effort

| Phase | Tasks | Estimated Hours |
|-------|-------|----------------|
| 4.1 | Polly, Rate Limit, Exception Middleware | 4–6h |
| 4.2 | Cache Layer, Batch API, N+1 Fix | 3–4h |
| 4.3 | Background Service | 2–3h |
| 5.1 | New Entities | 1–2h |
| 5.2 | Relationships + Configs | 1h |
| 5.3 | Migrations + Pagination + Update Transaction | 3–4h |
| 6.1 | React Setup + Components | 8–12h |
| 6.2 | State Management + API Integration | 4–6h |
| **Total** | | **26–38h** |

---

> **Next Step:** Review and approve this plan. Upon approval, implementation will proceed phase-by-phase, starting with Phase 4.1.
