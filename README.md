# 🚀 CryptoDash — Crypto Portfolio Tracker

<div align="center">

![.NET](https://img.shields.io/badge/.NET_8-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

**Ứng dụng theo dõi danh mục đầu tư crypto full-stack, xây dựng với .NET 8 Clean Architecture và React.**

**A full-stack crypto portfolio tracking application built with .NET 8 Clean Architecture and React.**

[🌐 Demo](#) • [📖 Docs](#architecture) • [🚀 Quick Start](#quick-start)

</div>

---

## 📸 Screenshots

| Landing Page | Dashboard | Market |
|---|---|---|
| ![Landing](./docs/screenshots/landing.png) | ![Dashboard](./docs/screenshots/dashboard.png) | ![Market](./docs/screenshots/market.png) |

| Coin Detail | Portfolio | Wallets |
|---|---|---|
| ![Coin](./docs/screenshots/coin-detail.png) | ![Portfolio](./docs/screenshots/portfolio.png) | ![Wallets](./docs/screenshots/wallets.png) |

---

## ✨ Tính năng / Features

### 🇻🇳 Tiếng Việt
- **Landing Page** — Trang giới thiệu với giá coin real-time, không cần đăng nhập
- **Market** — Bảng top 50 coin: giá, 24h%, market cap, volume. Public access
- **Candlestick Chart** — Biểu đồ nến TradingView-style với 5 khung thời gian (1N/7N/14N/1T/3T)
- **Portfolio Dashboard** — Tổng giá trị, P&L, biểu đồ lịch sử portfolio
- **Multi-wallet** — Tạo và quản lý nhiều ví, theo dõi holdings từng ví
- **Buy/Sell** — Ghi lại giao dịch với validation số dư tự động
- **Dark/Light Mode** — Toggle theme, lưu preference vào localStorage
- **JWT Auth** — Đăng nhập/đăng ký với refresh token tự động

### 🇬🇧 English
- **Landing Page** — Public showcase with real-time coin prices
- **Market** — Top 50 coins table with price, 24h%, market cap, volume. Public access
- **Candlestick Chart** — TradingView-style chart with 5 timeframes (1D/7D/14D/1M/3M)
- **Portfolio Dashboard** — Total value, P&L, portfolio history chart
- **Multi-wallet** — Create and manage multiple wallets, track holdings per wallet
- **Buy/Sell** — Record transactions with automatic balance validation
- **Dark/Light Mode** — Theme toggle with localStorage persistence
- **JWT Auth** — Login/register with automatic token refresh

---

## 🏗️ Architecture

### Backend — .NET 8 Clean Architecture

```
CryptoDashboard/
├── CryptoDashboard.Domain/          # Entities, Enums, Common (BaseEntity)
│   ├── Entities/                    # User, Wallet, Transaction, ...
│   └── Common/                      # BaseEntity (Soft Delete, Audit Trail)
│
├── CryptoDashboard.Application/     # Business contracts
│   ├── DTOs/                        # Request/Response models
│   ├── Interfaces/                  # IWalletService, ITransactionService, ...
│   └── Validators/                  # FluentValidation validators
│
├── CryptoDashboard.Infrastructure/  # Implementations
│   ├── Persistence/                 # ApplicationDbContext, Migrations
│   └── Services/                    # WalletService, TransactionService, ...
│
├── CryptoDashboard.Api/             # Presentation layer
│   ├── Controllers/                 # REST API endpoints
│   └── Middleware/                  # GlobalExceptionHandler
│
└── CryptoDashboard.Tests/           # xUnit test project
    └── Services/                    # WalletServiceTests, TransactionServiceTests
```

### Frontend — React + TypeScript

```
crypto-frontend/
├── src/
│   ├── api/              # Axios functions (auth, wallet, transaction, crypto, portfolio)
│   ├── components/       # Reusable UI components
│   │   ├── layout/       # AppLayout, PublicLayout
│   │   └── ui/           # Button, Input, StatCard
│   ├── hooks/            # useWallet, useTransaction, useTheme, useAuth
│   ├── pages/            # LandingPage, DashboardPage, MarketPage, ...
│   ├── store/            # Zustand (authStore)
│   └── types/            # TypeScript interfaces
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | .NET 8, ASP.NET Core |
| Architecture | Clean Architecture |
| ORM | Entity Framework Core 8 |
| Database | SQL Server |
| Auth | JWT + Refresh Token |
| HTTP Resilience | Polly (Retry + Circuit Breaker) |
| Caching | IMemoryCache |
| Testing | xUnit, Moq, FluentAssertions |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Data Fetching | TanStack Query v5 |
| Charts | Recharts, lightweight-charts |
| Validation | Zod + React Hook Form |
| HTTP | Axios |
| Testing | Vitest |

### External APIs
| Service | Usage |
|---|---|
| CoinGecko API | Giá coin, OHLC data, market data |

---

## 🔒 Backend Highlights / Điểm nổi bật Backend

```csharp
// ✅ Soft Delete — không xóa vật lý dữ liệu tài chính
protected override void SaveChangesAsync() {
    foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        if (entry.State == EntityState.Deleted) {
            entry.State = EntityState.Modified;
            entry.Entity.IsDeleted = true; // Chỉ đánh dấu đã xóa
        }
}

// ✅ Database Transaction — đảm bảo toàn vẹn dữ liệu
await using var dbTransaction = await _context.Database.BeginTransactionAsync();
try {
    // ... business logic
    await dbTransaction.CommitAsync();
} catch {
    await dbTransaction.RollbackAsync(); throw;
}

// ✅ Optimistic Concurrency — tránh race condition
[Timestamp]
public byte[] RowVersion { get; set; } // EF tự throw DbUpdateConcurrencyException

// ✅ Polly Resilience — retry + circuit breaker cho CoinGecko API
.AddPolicyHandler(GetRetryPolicy())      // Exponential backoff + jitter
.AddPolicyHandler(GetCircuitBreakerPolicy()) // 5 failures → 30s break
```

---

## 🚀 Quick Start

### Yêu cầu / Requirements
- .NET 8 SDK
- Node.js 18+
- SQL Server (LocalDB hoặc full)

### Backend

```bash
# Clone repo
git clone https://github.com/yourusername/crypto-dashboard.git
cd crypto-dashboard

# Setup User Secrets (không commit secret vào Git)
cd CryptoDashboard.Api
dotnet user-secrets set "ConnectionStrings:MyConnect" "Server=localhost;Database=CryptoDashboardDb;Trusted_Connection=True;TrustServerCertificate=True"
dotnet user-secrets set "Jwt:SecretKey" "your-super-secret-key-minimum-32-characters"

# Chạy migrations
cd ../CryptoDashboard.Infrastructure
dotnet ef database update --startup-project ../CryptoDashboard.Api

# Chạy API
cd ../CryptoDashboard.Api
dotnet run
# API chạy tại: https://localhost:44386
# Swagger UI: https://localhost:44386/swagger
```

### Frontend

```bash
cd crypto-frontend

# Cài dependencies
npm install

# Tạo file .env.local
echo "VITE_API_URL=https://localhost:44386/api" > .env.local

# Chạy development server
npm run dev
# App chạy tại: http://localhost:5173
```

### Chạy Tests / Run Tests

```bash
# Backend tests
dotnet test CryptoDashboard.Tests/

# Frontend tests
cd crypto-frontend
npm run test
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/Auth/register` | Đăng ký tài khoản |
| POST | `/api/Auth/login` | Đăng nhập |
| POST | `/api/Auth/refresh` | Refresh access token |

### Wallet
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/Wallet` | Danh sách ví |
| POST | `/api/Wallet` | Tạo ví mới |
| GET | `/api/Wallet/{id}` | Chi tiết ví + holdings |
| PUT | `/api/Wallet/{id}` | Đổi tên ví |
| DELETE | `/api/Wallet/{id}` | Xóa ví (soft delete) |

### Transaction
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/Transaction?page=1&pageSize=20` | Lịch sử giao dịch (có phân trang) |
| POST | `/api/Transaction` | Tạo giao dịch Buy/Sell |
| DELETE | `/api/Transaction/{id}` | Xóa giao dịch (soft delete) |

### Crypto (Public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/Crypto/top?limit=50` | Top coin theo market cap |
| GET | `/api/Crypto/{coinId}` | Thông tin 1 coin |
| GET | `/api/Crypto/{coinId}/history?days=7` | Lịch sử giá |
| GET | `/api/Crypto/{coinId}/ohlc?days=7` | OHLC data cho candlestick chart |

### Portfolio
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/Portfolio` | Tổng quan portfolio |
| GET | `/api/Portfolio/performance` | Thống kê Buy/Sell |
| GET | `/api/Portfolio/history?days=30` | Lịch sử giá trị portfolio |

---

## 🧪 Testing

```
CryptoDashboard.Tests/
├── Services/
│   ├── WalletServiceTests.cs        # Soft delete, CRUD, concurrency
│   └── TransactionServiceTests.cs   # Buy/Sell validation, balance check

crypto-frontend/src/
└── store/
    └── authStore.test.ts            # Auth flow: login, logout, rehydrate
```

**Coverage:**
- ✅ Soft Delete verification (IgnoreQueryFilters)
- ✅ Cascade soft delete (Wallet → Transactions)
- ✅ Sell validation (insufficient balance)
- ✅ JWT rehydration từ localStorage
- ✅ Auto token refresh flow

---

## 👨‍💻 Tác giả / Author

**[Trần Vĩ]**
- GitHub:(https://github.com/Viluoicode)
- Email:Tran.vi0328@gmail.com

---

## 📝 License

MIT License — feel free to use for learning purposes.

---

<div align="center">

**⭐ Nếu project này hữu ích, hãy star repo nhé! / Star this repo if you find it helpful!**

</div>
                 