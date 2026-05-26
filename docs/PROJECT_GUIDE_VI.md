# 📚 Hướng dẫn hiểu project CryptoDash (Tiếng Việt)

> Tài liệu này giải thích **mọi công nghệ** trong project bằng ngôn ngữ đơn giản. Mỗi tech có 3 phần: **Là gì? · Tại sao chọn? · Dùng ở đâu trong project?**

---

## Mục lục

1. [Project này là gì?](#1-project-này-là-gì)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Backend tech stack (.NET 9)](#3-backend-tech-stack-net-9)
4. [Frontend tech stack (React 18 + Vite)](#4-frontend-tech-stack-react-18--vite)
5. [Database & EF Core](#5-database--ef-core)
6. [External services (APIs bên ngoài)](#6-external-services)
7. [Authentication flow (JWT) hoạt động thế nào?](#7-authentication-flow-jwt)
8. [Real-time data — Binance WebSocket](#8-real-time-data--binance-websocket)
9. [Ví dụ flow một request từ A → Z](#9-ví-dụ-flow-một-request)
10. [Cấu trúc thư mục project](#10-cấu-trúc-thư-mục-project)
11. [Glossary — Từ điển thuật ngữ](#11-glossary--từ-điển-thuật-ngữ)

---

## 1. Project này là gì?

**CryptoDash** = trình mô phỏng giao dịch crypto (giống Binance/Toobit nhưng tiền ảo, không tốn $1 thật).

Người dùng có thể:
- 💰 Tạo ví (mỗi ví có $10,000 demo)
- 📈 Mua/bán crypto theo giá thật từ CoinGecko + Binance
- ⚡ Đặt **lệnh điều kiện** (stop-loss, take-profit, limit)
- 🎢 Mở **vị thế margin** đòn bẩy 1x-100x với rủi ro liquidation
- 🔗 Track ví on-chain qua MetaMask
- 🏆 So tài với traders khác trên leaderboard

**Mục đích thực sự**: Project học tập + portfolio để show full-stack skills (Clean Architecture .NET + React + real-time WebSocket + DB + auth).

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                      🌐 NGƯỜI DÙNG (browser)                          │
└────────────────┬─────────────────────────┬───────────────────────────┘
                 │ HTTPS                   │ WebSocket
                 ↓                         ↓
┌────────────────────────────┐  ┌─────────────────────────┐
│  FRONTEND (React SPA)       │  │  Binance WebSocket      │
│  - Vite serve port 5173     │  │  - Stream giá realtime  │
│  - Tailwind + TypeScript   │  │  - Trực tiếp từ browser  │
│  - Zustand + TanStack Query│  └─────────────────────────┘
└──────────┬──────────────────┘
           │ HTTP + JWT token
           ↓
┌──────────────────────────────────────────────────────┐
│  BACKEND (.NET 9 — port 7103)                         │
│  ┌──────────────────────────────────────────────┐   │
│  │  API Controllers (auth, wallet, order...)    │   │
│  ├──────────────────────────────────────────────┤   │
│  │  Application (Services, Interfaces, DTOs)    │   │
│  ├──────────────────────────────────────────────┤   │
│  │  Infrastructure (EF, Polly HTTP, Workers)    │   │
│  ├──────────────────────────────────────────────┤   │
│  │  Domain (Entities thuần — không phụ thuộc)   │   │
│  └──────────────────────────────────────────────┘   │
└────────────┬─────────────────────────┬───────────────┘
             │ EF Core                 │ HTTP (Polly retry)
             ↓                         ↓
       ┌────────────┐          ┌─────────────────┐
       │ PostgreSQL │          │ CoinGecko API    │
       │ (data)     │          │ (giá + sparkline)│
       └────────────┘          └─────────────────┘
                               ┌─────────────────┐
                               │ Alchemy JSON-RPC │
                               │ (on-chain wallet)│
                               └─────────────────┘
```

### 2 thành phần lớn

| | Frontend | Backend |
|---|---|---|
| **Vai trò** | UI + nhận input người dùng | Logic nghiệp vụ + database |
| **Ngôn ngữ** | TypeScript | C# |
| **Framework** | React 18 + Vite | ASP.NET Core (.NET 9) |
| **Chạy ở đâu** | Browser của user | Server (máy bạn local, hoặc Render khi deploy) |
| **Lưu data?** | Không (chỉ cache tạm + localStorage) | Có (PostgreSQL) |

→ Frontend **gọi API** của Backend qua HTTPS. Backend trả về JSON. Frontend render thành UI.

---

## 3. Backend tech stack (.NET 9)

### 3.1. ASP.NET Core 9 (Web framework)

- **Là gì?** Framework của Microsoft để build web API + web app bằng C#. Phiên bản 9 (mới nhất 2025).
- **Tại sao chọn?** Performance cao, free, open-source, cross-platform (chạy được Windows/Linux/Mac), hệ sinh thái mạnh (NuGet packages).
- **Dùng ở đâu?** Project `CryptoDashboard.Api` — toàn bộ HTTP endpoints (`/api/auth`, `/api/wallet`, `/api/order`, etc.) đều là ASP.NET Controllers.

**Ví dụ** — file `Controllers/WalletController.cs`:
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WalletController : ControllerBase {
    [HttpGet]
    public async Task<IActionResult> GetWallets() { ... }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferRequest req) { ... }
}
```

→ ASP.NET tự route URL `/api/wallet/transfer` → method `Transfer()`.

---

### 3.2. Clean Architecture

- **Là gì?** Cách tổ chức code thành **4 lớp**, mỗi lớp có nhiệm vụ riêng, phụ thuộc 1 chiều.
- **Tại sao?** Dễ test, dễ thay đổi (vd: đổi DB từ Postgres → MySQL chỉ sửa lớp Infrastructure), code rõ ràng.
- **Dùng ở đâu?** Project có 4 csproj riêng cho 4 lớp:

```
┌─────────────────────────────────────────────────────┐
│  Api  (Controllers)                                  │   ◀── Lớp ngoài cùng
│   ↓ phụ thuộc                                        │       Biết tất cả
│  Application  (Interfaces, DTOs)                     │
│   ↓ phụ thuộc                                        │
│  Domain  (Entities thuần — User, Wallet, ...)        │   ◀── Lớp trong cùng
│                                                       │       Không biết gì
└─────────────────────────────────────────────────────┘
                  ▲
                  │
              Infrastructure  ──── implements interfaces
              (EF Core, services thật, HTTP calls)
```

**Quy tắc**: Domain KHÔNG biết về EF, không biết về HTTP. Mọi thứ "bẩn" (database, network) ở Infrastructure.

→ Lợi ích: Khi unit test, dùng InMemory database thay PostgreSQL — không cần sửa logic.

---

### 3.3. Entity Framework Core 9 (ORM)

- **Là gì?** ORM (Object-Relational Mapper) — biến C# class thành SQL table tự động.
- **Tại sao?** Thay vì viết SQL `INSERT INTO users (...)` thủ công, viết `_context.Users.Add(user)` — EF lo phần còn lại.
- **Dùng ở đâu?** `CryptoDashboard.Infrastructure/Persistence/ApplicationDbContext.cs`.

**Ví dụ** — query holdings của 1 ví:
```csharp
// Không cần viết SQL!
var transactions = await _context.Transactions
    .Where(t => t.WalletId == walletId && !t.IsDeleted)
    .GroupBy(t => t.CoinId)
    .ToListAsync();
```

→ EF tự sinh ra SQL `SELECT ... FROM Transactions WHERE ... GROUP BY ...`.

**Migrations**: khi sửa Entity (vd: thêm field `Email` vào User), EF tự tạo file SQL `Add-Migration ChangeName` để apply lên DB.

---

### 3.4. PostgreSQL (Database)

- **Là gì?** Hệ quản trị CSDL quan hệ — như MySQL nhưng free, mạnh hơn, hỗ trợ JSON tốt.
- **Tại sao?** Open-source, được Render/Neon/Supabase support free, ACID đầy đủ, query engine mạnh.
- **Dùng ở đâu?** Lưu **tất cả** dữ liệu persistent: Users, Wallets, Transactions, Orders, Positions, PortfolioSnapshots, ...

**Connect qua Npgsql** (driver Postgres cho .NET):
```csharp
options.UseNpgsql("Host=localhost;Database=cryptodash;Username=...");
```

---

### 3.5. JWT (JSON Web Token) Authentication

- **Là gì?** Cách xác thực không cần session server — token chuỗi base64 chứa thông tin user, được server ký (sign) bằng secret key.
- **Tại sao?** Stateless (server không cần lưu session) → scale tốt. Frontend gửi token kèm mỗi request.
- **Dùng ở đâu?** `Infrastructure/Security/JwtService.cs` + middleware `app.UseAuthentication()`.

**Flow**:
```
User login → server tạo 2 token:
  • Access token (15 phút, gửi kèm mỗi request)
  • Refresh token (7 ngày, lưu hashed trong DB)

Frontend lưu vào localStorage. Mỗi API call:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Access token hết hạn → Frontend tự gọi `/api/auth/refresh` để lấy access token mới (interceptor trong axios làm tự động — bạn không phải code lại).

---

### 3.6. Polly (HTTP Resilience)

- **Là gì?** Thư viện retry + circuit breaker cho HTTP calls.
- **Tại sao?** CoinGecko thỉnh thoảng 503 hoặc 429 (rate limit). Không có Polly → user thấy lỗi. Có Polly → tự retry với exponential backoff, người dùng không biết.
- **Dùng ở đâu?** `Program.cs`:
```csharp
builder.Services.AddHttpClient<ICryptoService, CryptoService>()
    .AddPolicyHandler(GetRetryPolicy())          // 3 lần retry
    .AddPolicyHandler(GetCircuitBreakerPolicy()); // 5 fail → break 30s
```

**Circuit Breaker** = nếu CoinGecko fail 5 lần liên tiếp → "ngắt mạch" 30 giây, không gọi nữa, trả lỗi ngay → tránh DDoS chính mình.

---

### 3.7. Serilog (Logging)

- **Là gì?** Thư viện log có cấu trúc (structured logging).
- **Tại sao?** `Console.WriteLine("error: ...")` không tìm kiếm được. Serilog log dưới dạng JSON, search được theo property.
- **Dùng ở đâu?** Toàn bộ backend log qua Serilog, ghi ra **Console** + **file rolling** `logs/log-2026-05-26.txt` (retain 7 ngày).

```csharp
_logger.LogWarning("User {UserId} tried to delete wallet {WalletId}", userId, walletId);
// → JSON log: {"Level":"Warning", "UserId":"...", "WalletId":"...", "Message":"..."}
```

---

### 3.8. FluentValidation (DTO validation)

- **Là gì?** Validate request body với cú pháp đẹp.
- **Tại sao?** Thay vì viết `if (req.Quantity < 0) return BadRequest(...)` ở mọi controller, định nghĩa 1 lần ở validator.
- **Dùng ở đâu?** `Application/Validators/CreateTransactionRequestValidator.cs`:
```csharp
RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Số lượng phải > 0");
RuleFor(x => x.PricePerCoin).GreaterThan(0);
```

→ ASP.NET tự reject request invalid trước khi đến Controller.

---

### 3.9. Background Services (Hosted Services)

- **Là gì?** Workers chạy nền song song với web server.
- **Tại sao?** Có những task không phải response cho user — phải chạy định kỳ.
- **Dùng ở đâu?** 4 workers trong project:

| Worker | Tần suất | Nhiệm vụ |
|---|---|---|
| `CryptoPriceRefreshService` | Mỗi 30s | Fetch giá top 100 coin từ CoinGecko → cache |
| `OrderMonitorBackgroundService` | Mỗi 5s | Check pending orders, fill khi giá đạt trigger |
| `LiquidationBackgroundService` | Mỗi 10s | Check open positions, liquidate khi giá < liquidationPrice |
| `PortfolioSnapshotBackgroundService` | Daily 00:00 UTC | Snapshot tổng giá trị portfolio mỗi user |

→ Đây là lý do bạn có thể đặt stop-loss và đi ngủ — worker chạy 24/7 (khi server bật) tự fill cho bạn.

---

### 3.10. Rate Limiting

- **Là gì?** Giới hạn số request/phút/IP, chống abuse.
- **Tại sao?** Tránh bị bot scrape, tránh CoinGecko ban IP do gọi quá nhiều.
- **Dùng ở đâu?** 5 policies:

| Policy | Endpoint | Limit |
|---|---|---|
| `crypto` | `/api/crypto/*` | 30/phút/IP |
| `leaderboard` | `/api/portfolio/leaderboard` | 10/phút/IP |
| `auth-login` | `/api/auth/login` | 5/phút/IP (chống brute-force) |
| `auth-register` | `/api/auth/register` | 3/phút/IP (chống spam) |
| `errors` | `/api/telemetry/errors` | 20/phút/IP |

Vượt limit → HTTP 429 Too Many Requests.

---

### 3.11. Health Checks

- **Là gì?** Endpoint trả về trạng thái app (healthy/degraded/unhealthy).
- **Tại sao?** Render và các orchestrator (Kubernetes, Docker) cần biết app có sống không để restart nếu chết.
- **Dùng ở đâu?**
  - `GET /health/live` → 200 nếu process chạy (luôn xanh nếu app không crash)
  - `GET /health/ready` → 200 nếu DB connect được **và** crypto price cache đã warm

---

## 4. Frontend tech stack (React 18 + Vite)

### 4.1. React 18

- **Là gì?** Library UI của Facebook (Meta) — viết component, React quản lý DOM.
- **Tại sao?** Phổ biến nhất, hệ sinh thái lớn, dễ tuyển người, performance tốt với fiber reconciler.
- **Dùng ở đâu?** Mọi page trong `crypto-frontend/src/pages/*.tsx` là React component.

**Ví dụ** component đơn giản:
```tsx
function WalletCard({ name, balance }: { name: string; balance: number }) {
    return (
        <div className="rounded-xl bg-white/5 p-4">
            <h3>{name}</h3>
            <p>${balance.toLocaleString()}</p>
        </div>
    )
}
```

---

### 4.2. TypeScript

- **Là gì?** JavaScript + type system. Code có lỗi type → IDE báo trước khi chạy.
- **Tại sao?** Tránh `undefined.property` ở production. Refactor an toàn. Autocomplete tốt.
- **Dùng ở đâu?** Mọi file `.tsx` `.ts` trong project. Types định nghĩa ở `src/types/index.ts` (mirror DTO của backend).

---

### 4.3. Vite (Build tool)

- **Là gì?** Tool thay Webpack/Create React App — dev server siêu nhanh (Hot Module Reload < 50ms), build production tối ưu.
- **Tại sao?** Lưu file → Vite hiện thay đổi trong < 1s (Webpack ~5s). Build production split chunks tự động.
- **Dùng ở đâu?** `vite.config.ts`. Lệnh:
  - `npm run dev` → dev server port 5173
  - `npm run build` → build production vào `dist/`

---

### 4.4. Tailwind CSS

- **Là gì?** CSS framework utility-first. Thay vì viết file CSS riêng, dùng class trực tiếp trong JSX.
- **Tại sao?** Nhanh, không phải nghĩ tên class, design system nhất quán, bundle CSS chỉ chứa class đã dùng (purge).
- **Dùng ở đâu?** Mọi component đều dùng. Config ở `tailwind.config.js` (project có Toobit palette: `navy-950`, `accent-cyan #0059FB`, `profit #03c076`, `loss #f6465d`).

**Trước (CSS thuần)**:
```css
.card { padding: 1rem; background: #161a1e; border-radius: 0.75rem; }
```
**Sau (Tailwind)**:
```tsx
<div className="p-4 bg-navy-800 rounded-xl">...</div>
```

⚠️ **Pitfall**: Class số phải đúng — `w-4.5` không tồn tại (Tailwind chỉ có 0.5, 1.5, 2.5, 3.5), dùng `w-5` hoặc `w-4`. Đó là bug bạn đã gặp với icon to khổng lồ.

---

### 4.5. Zustand (State management)

- **Là gì?** Library quản lý state global đơn giản hơn Redux 10 lần.
- **Tại sao?** Redux phức tạp với action/reducer/dispatch. Zustand: viết 1 store, dùng như hook.
- **Dùng ở đâu?** 2 stores trong `src/store/`:

| Store | Lưu gì? |
|---|---|
| `authStore` | User hiện tại, isAuthenticated, login/logout actions |
| `livePriceStore` | Live ticks từ Binance WS: `ticks: Record<symbol, LiveTick>` |

**Ví dụ**:
```tsx
// Trong store
export const useAuthStore = create((set) => ({
    user: null,
    login: (user) => set({ user }),
    logout: () => set({ user: null }),
}))

// Trong component
const { user, login, logout } = useAuthStore()
```

---

### 4.6. TanStack Query v5 (Server state)

- **Là gì?** Library fetch + cache data từ API. Thay thế `useEffect + useState + fetch`.
- **Tại sao?** Tự cache theo key, dedupe requests, refetch khi tab focus, retry, invalidate sau mutation.
- **Dùng ở đâu?** Mọi API call trong frontend đều qua `useQuery` hoặc `useMutation`.

**Trước**:
```tsx
const [wallets, setWallets] = useState([])
const [loading, setLoading] = useState(false)
useEffect(() => {
    setLoading(true)
    fetch('/api/wallet').then(r => r.json()).then(data => {
        setWallets(data); setLoading(false)
    })
}, [])
```

**Sau**:
```tsx
const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: getWallets,
})
```

Cache key `['wallets']` → tất cả components dùng cùng key chia sẻ cùng 1 cache. Mutation thành công thì gọi `invalidateQueries(['wallets'])` → tự refetch.

---

### 4.7. React Router DOM v6

- **Là gì?** Routing — chuyển trang trong SPA mà không reload.
- **Tại sao?** Mặc định React không có routing. Router cho phép URL `/dashboard`, `/trade`, `/market/bitcoin`.
- **Dùng ở đâu?** `src/App.tsx` định nghĩa 19 routes.

```tsx
<Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trade"     element={<FuturesPage />} />
        </Route>
    </Route>
</Routes>
```

`ProtectedRoute` redirect về `/login` nếu chưa auth.

---

### 4.8. React Hook Form + Zod (Forms + Validation)

- **Là gì?**
  - **RHF**: Quản lý state form (input value, error, touched, ...)
  - **Zod**: Schema validation type-safe (giống FluentValidation bên backend)
- **Tại sao?** RHF tránh re-render thừa (state ở uncontrolled inputs). Zod cho TypeScript hiểu shape form.
- **Dùng ở đâu?** Login + Register page.

```tsx
const schema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Tối thiểu 6 ký tự'),
})

const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
})
```

---

### 4.9. Axios (HTTP client)

- **Là gì?** Library gọi HTTP, hơn `fetch` ở interceptor + auto JSON parse.
- **Tại sao?** Cần interceptor cho auth: tự thêm `Authorization: Bearer ...`, tự refresh khi 401.
- **Dùng ở đâu?** `src/api/client.ts` — axios instance dùng chung cho mọi API call.

**Interceptor**:
- Request interceptor: thêm token vào header
- Response interceptor: bắt 401 → gọi refresh → retry request gốc → user không thấy lỗi

---

### 4.10. Charts (3 libraries cho 3 mục đích)

| Library | Dùng ở đâu | Tại sao? |
|---|---|---|
| **KLineChart** | `/trade` — biểu đồ nến futures terminal | Hỗ trợ EMA/RSI/MACD/BOLL, drawing tools, kèm volume pane |
| **lightweight-charts** | `/market/:coinId` — biểu đồ chi tiết coin | Performance cực tốt (TradingView's library), nhẹ |
| **Recharts** | Dashboard + Portfolio — area/pie charts | Dễ dùng với React, đẹp cho dashboard |

→ Chia 3 library vì mỗi cái mạnh ở 1 lĩnh vực. Lazy-load nên user không tải hết — vào `/trade` mới tải `klinecharts`.

---

### 4.11. Lucide React (Icons)

- **Là gì?** Bộ icon SVG ~1000 cái. Fork của Feather Icons nhưng được maintain.
- **Tại sao?** Tree-shake — chỉ bundle icon đã dùng. Stroke-based, đẹp với dark theme.
- **Dùng ở đâu?** Mọi icon trong UI: `<TrendingUp />`, `<Wallet />`, `<ArrowRight />`, ...

---

### 4.12. html-to-image

- **Là gì?** Library chụp HTML element thành PNG.
- **Tại sao?** Leaderboard có nút "Export PNG" để user share thành tích lên Twitter/Facebook.
- **Dùng ở đâu?** `pages/LeaderboardPage.tsx`:
```tsx
const dataUrl = await toPng(tableRef.current, {
    cacheBust: true,
    backgroundColor: '#0a0e1a',
})
```

---

## 5. Database & EF Core

### Sơ đồ các bảng chính

```
User ──┬─< Wallet ─< Transaction
       ├─< WatchlistItem
       ├─< PriceAlert
       ├─< PortfolioSnapshot
       ├─< TradeOrder (stop-loss, take-profit, limit)
       ├─< Position (margin)
       └─< OnChainWallet
```

`──<` = một-nhiều. Vd: 1 User có nhiều Wallet. 1 Wallet có nhiều Transaction.

### Soft delete pattern

Một số bảng có cờ `IsDeleted` thay vì xóa thật:
- `Wallet`, `Transaction`, `WatchlistItem` → soft delete (vẫn lưu trong DB, ẩn khỏi query)
- `PriceAlert`, `TradeOrder`, `Position`, `OnChainWallet` → hard delete (xóa thật)

**Tại sao soft delete cho Wallet?** Lỡ user xóa nhầm, admin có thể restore. Còn PriceAlert thì xóa được rồi tạo lại đơn giản.

EF có **Global Query Filter** tự động lọc `WHERE IsDeleted = false` cho mọi query — bạn không cần viết lại trong từng repository.

---

## 6. External services

### 6.1. CoinGecko REST API

- **Cho gì?** Giá coin, market cap, volume, sparkline 7 ngày, danh sách top 100 coins.
- **Free?** Có free tier 10-30 requests/phút. Project cache 30s để tiết kiệm.
- **Gọi ở đâu?** `Infrastructure/Services/CryptoService.cs`.

### 6.2. Binance WebSocket (public, free, không cần API key)

- **Cho gì?** Giá realtime, order book, recent trades, kline (candlestick) — **stream liên tục**.
- **Tại sao Binance + CoinGecko song song?**
  - CoinGecko: dùng cho dữ liệu **chậm** (market cap, sparkline) — qua REST cached
  - Binance WS: dùng cho dữ liệu **realtime** (giá đang thay đổi từng giây) — qua WebSocket direct từ browser
- **Gọi ở đâu?** **Frontend trực tiếp** (`useBinanceWs.ts`, `useBinanceStream.ts`) — không qua backend, đỡ tải server.

### 6.3. Alchemy JSON-RPC (on-chain)

- **Cho gì?** Đọc balance ví thật trên blockchain (Ethereum, BSC, Polygon, Arbitrum).
- **Free?** Có. Cần đăng ký API key.
- **Gọi ở đâu?** Backend `Infrastructure/Services/OnChainWalletService.cs`. User add địa chỉ 0x... → backend gọi Alchemy → trả về native balance + ERC-20 tokens.

### 6.4. MetaMask (browser extension)

- **Cho gì?** User click "Connect Wallet" → MetaMask popup → user authorize → frontend lấy được địa chỉ ví.
- **Dùng ở đâu?** Frontend `hooks/useMetaMask.ts`. Dùng raw `window.ethereum` (không cần wagmi/web3modal — đỡ phình bundle).

---

## 7. Authentication flow (JWT)

```
┌─────────────┐                        ┌──────────────┐
│  Frontend   │                        │  Backend     │
└─────┬───────┘                        └──────┬───────┘
      │                                       │
      │ 1. POST /api/auth/login               │
      │    { email, password }                │
      ├──────────────────────────────────────▶│
      │                                       │
      │                          ┌────────────┴───────────┐
      │                          │ 2. Verify password     │
      │                          │ 3. Sinh accessToken    │
      │                          │    (15 phút)           │
      │                          │ 4. Sinh refreshToken   │
      │                          │    (7 ngày, hashed     │
      │                          │     SHA-256 lưu vào DB)│
      │                          └────────────┬───────────┘
      │                                       │
      │ 5. { accessToken, refreshToken, user }│
      │◀──────────────────────────────────────┤
      │                                       │
      │ 6. Lưu vào localStorage:              │
      │    crypto_access_token, ...           │
      │                                       │
      │═══════════════════════════════════════│
      │ Sau đó mọi request đính kèm:          │
      │                                       │
      │ GET /api/wallet                       │
      │ Authorization: Bearer eyJ...          │
      ├──────────────────────────────────────▶│
      │                                       │
      │ 200 OK                                │
      │◀──────────────────────────────────────┤
      │                                       │
      │═══════════════════════════════════════│
      │ Khi access token hết hạn (15 phút):   │
      │                                       │
      │ GET /api/wallet                       │
      ├──────────────────────────────────────▶│
      │                                       │
      │ 401 Unauthorized                      │
      │◀──────────────────────────────────────┤
      │                                       │
      │ ─── Axios interceptor tự động ───     │
      │ POST /api/auth/refresh                │
      │ { refreshToken: "..." }               │
      ├──────────────────────────────────────▶│
      │                                       │
      │ { accessToken, refreshToken } (new)   │
      │◀──────────────────────────────────────┤
      │                                       │
      │ Retry request gốc với token mới       │
      ├──────────────────────────────────────▶│
      │ 200 OK                                │
      │◀──────────────────────────────────────┤
```

→ User KHÔNG biết về cái refresh này. Trải nghiệm: login 1 lần, dùng 7 ngày liên tục.

---

## 8. Real-time data — Binance WebSocket

```
┌─────────────────┐
│   Browser       │
│                 │
│  ┌──────────┐   │            wss://stream.binance.com:9443
│  │useBinance│───┼──────────────────────────────────▶ ┌──────────┐
│  │   Ws()   │   │   subscribe: btcusdt@miniTicker    │ Binance  │
│  └────┬─────┘   │   etc.                              │   WS     │
│       │ ticks   │                                     │ Server   │
│       ▼         │                                     └────┬─────┘
│  ┌──────────┐   │                                          │
│  │livePrice │   │            event mỗi 1 giây               │
│  │  Store   │   │   { s: "BTCUSDT", c: "77004", ... }      │
│  │(Zustand) │   │◀─────────────────────────────────────────┤
│  └────┬─────┘   │                                          │
│       │         │                                          │
│       │         │
│   subscribe     │
│       │         │
│  ┌────▼────────┐│
│  │ MarketPage  ││  ◀── re-render với giá mới
│  │ PortfolioP. ││
│  │ Sidebar     ││
│  │ PriceAlert  ││  ◀── compare với target, fire toast nếu match
│  │ Watcher     ││
│  └─────────────┘│
└─────────────────┘
```

**Lưu ý quan trọng**:
- WS direct **browser ↔ Binance**. Backend không liên quan → đỡ tải server cực nhiều.
- Backend chỉ có cache giá từ CoinGecko (dùng cho dữ liệu chậm + background workers).
- Khi có tick mới, Zustand store update → mọi component subscribe re-render. **Một WS connection, nhiều UI components**.

---

## 9. Ví dụ flow một request

### Scenario: User mua 0.1 BTC

```
1. User trên trang /trade, click nút "Buy 0.1 BTC"
        │
        ▼
2. FuturesPage gọi useCreateTransaction().mutate(...)
        │ (TanStack Query mutation)
        ▼
3. axios.post('/api/transaction', { walletId, coinId: 'bitcoin', type: 1, quantity: 0.1, price: 77000 })
        │
        │ axios interceptor thêm: Authorization: Bearer eyJ...
        ▼
4. ASP.NET TransactionController.CreateTransaction()
        │
        │ FluentValidation validate body
        │ Lấy userId từ JWT claim
        ▼
5. ITransactionService.CreateAsync() — logic nghiệp vụ:
        │ a. Verify wallet thuộc user
        │ b. Verify fiatBalance >= total ($7,700)
        │ c. BEGIN TRANSACTION
        │ d. INSERT Transaction
        │ e. UPDATE Wallet SET FiatBalance -= 7700
        │ f. COMMIT
        ▼
6. Return TransactionResponse JSON
        │
        ▼
7. Frontend onSuccess:
        │ a. Toast "Đã mua 0.1 BTC thành công"
        │ b. queryClient.invalidateQueries(['wallets']) → refetch
        │ c. queryClient.invalidateQueries(['portfolio']) → refetch
        ▼
8. UI tự refresh: wallet balance giảm, holding tăng
```

**Trong khi đó, background**:
- `CryptoPriceRefreshService` đã fetch giá BTC vào cache trước đó
- `OrderMonitorBackgroundService` đang scan pending orders (nếu user có)
- `PortfolioSnapshotBackgroundService` sẽ snapshot lúc 00:00 UTC

---

## 10. Cấu trúc thư mục project

```
D:\DNTU\Tự Học\Crypto\
│
├── CryptoDashboard.Domain/         ← Lớp Domain
│   └── Entities/
│       ├── User.cs
│       ├── Wallet.cs
│       ├── Transaction.cs
│       ├── Position.cs              (margin)
│       ├── TradeOrder.cs            (stop-loss / take-profit / limit)
│       ├── OnChainWallet.cs
│       └── ...
│
├── CryptoDashboard.Application/    ← Lớp Application
│   ├── Interfaces/                   IAuthService, IWalletService, ...
│   ├── DTOs/                          Request/Response shapes
│   ├── Options/                       Config POCOs (AlchemyOptions)
│   └── Validators/                    FluentValidation
│
├── CryptoDashboard.Infrastructure/ ← Lớp Infrastructure
│   ├── Persistence/
│   │   ├── ApplicationDbContext.cs   ← EF Core DbContext
│   │   └── Migrations/                EF migration files
│   ├── Services/                     ← Implement các interface
│   │   ├── AuthService.cs
│   │   ├── WalletService.cs
│   │   ├── CryptoService.cs          (HTTP CoinGecko + Polly)
│   │   ├── OrderTriggerEvaluator.cs  (pure function, easy to test)
│   │   ├── OrderMonitorBackgroundService.cs    (worker)
│   │   ├── LiquidationBackgroundService.cs     (worker)
│   │   └── ...
│   ├── Security/                     JwtService, TokenHasher
│   ├── Caching/                      MemoryCryptoPriceCache
│   └── HealthChecks/                 CryptoPriceCacheHealthCheck
│
├── CryptoDashboard.Api/            ← Lớp Api (entry point)
│   ├── Controllers/                  ← Routes
│   │   ├── AuthController.cs
│   │   ├── WalletController.cs
│   │   ├── OrderController.cs
│   │   └── ... (10+ controllers)
│   ├── Middleware/                   GlobalExceptionHandlerMiddleware
│   ├── Program.cs                    ← DI registration + pipeline
│   └── appsettings.json
│
├── CryptoDashboard.Tests/          ← xUnit unit tests (100 tests)
│
├── crypto-frontend/                 ← Frontend React
│   ├── src/
│   │   ├── api/                       Axios wrappers
│   │   ├── hooks/                     Custom hooks (useWallet, useBinanceWs, ...)
│   │   ├── store/                     Zustand stores
│   │   ├── types/                     TypeScript types (mirror backend DTOs)
│   │   ├── lib/                       format.ts, indicators.ts, utils.ts
│   │   ├── pages/                     19 pages
│   │   ├── components/
│   │   │   ├── layout/                AppLayout, PublicLayout, BottomStatusBar
│   │   │   └── ui/                    Button, Modal, Toast, Card, ...
│   │   ├── App.tsx                    ← Router
│   │   └── main.tsx                   ← Entry point
│   ├── public/                        robots.txt, sitemap.xml, og-cover.svg
│   ├── index.html                     ← HTML shell + meta tags
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docs/                            ← Tài liệu
│   ├── ARCHITECTURE.md
│   ├── UI_REDESIGN_PROMPT.md
│   ├── PROJECT_GUIDE_VI.md            ← (file này!)
│   └── screenshots/
│
├── docker-compose.yml               ← Docker compose: postgres + api + frontend
├── render.yaml                       ← Render.com Blueprint
├── DEPLOY-CHECKLIST.md              ← Pre-deploy checklist
└── README.md                         ← Public README
```

---

## 11. Glossary — Từ điển thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| **SPA** | Single Page Application — app load 1 lần, sau đó chỉ đổi nội dung qua JS, không reload trang |
| **DTO** | Data Transfer Object — class chỉ chứa data để truyền qua API (vs Entity là data DB) |
| **ORM** | Object-Relational Mapper — biến class → SQL tự động (EF Core) |
| **Migration** | File SQL được sinh tự động khi đổi Entity, áp dụng để update schema DB |
| **JWT** | JSON Web Token — chuỗi base64 chứa info user + chữ ký, dùng auth không cần session |
| **CORS** | Cross-Origin Resource Sharing — cơ chế cho frontend ở domain khác gọi API |
| **Soft delete** | Đánh dấu `IsDeleted=true` thay vì DELETE khỏi DB |
| **Idempotent** | Gọi 1 lần hay 100 lần cùng key → kết quả như 1 lần (chống double-click) |
| **WebSocket (WS)** | Connection persistent giữa browser ↔ server, server có thể push event xuống |
| **Polling** | Frontend cứ X giây gọi API hỏi (vs WS là server tự push) |
| **Cache** | Lưu data tạm để gọi nhanh hơn (memory hoặc Redis) |
| **Race condition** | 2 request đồng thời sửa cùng data → kết quả không đoán được |
| **Transaction (DB)** | Group nhiều SQL thành 1 đơn vị — all success hoặc all rollback |
| **Optimistic UI** | UI update ngay khi user click (trước khi API trả về), nếu fail thì revert |
| **Tree-shaking** | Build tool loại bỏ code không dùng khỏi bundle final |
| **Hot Module Reload (HMR)** | Lưu file → trang tự cập nhật mà không mất state |
| **Cold start** | Server "ngủ" tỉnh dậy → request đầu tiên chậm |
| **Stateless** | Server không lưu thông tin về client giữa các request (như JWT) |
| **Stateful** | Server lưu session/state (như cookie session truyền thống) |
| **Singleton** | Object chỉ có 1 instance trong toàn app (như MemoryCryptoPriceCache) |
| **Scoped** | Object có 1 instance/request (như DbContext) |
| **Transient** | Object mới mỗi lần inject (như DTO) |
| **CSPRNG** | Cryptographically Secure Pseudo-Random Number Generator — random thực sự khó đoán (cho secrets) |
| **HMAC** | Hash-based Message Authentication Code — chữ ký JWT |
| **bcrypt/PBKDF2** | Algorithm hash password (chậm có chủ đích để chống brute-force) |
| **Liquidation** | Vị thế margin bị đóng tự động khi giá đạt liquidation price → mất toàn bộ collateral |
| **Leverage** | Đòn bẩy — vay tiền để mua nhiều hơn vốn thực có (1x = không vay, 10x = vay 9 lần) |
| **Collateral** | Tiền ký quỹ giữ làm tài sản đảm bảo cho vị thế margin |
| **Stop-loss** | Lệnh tự bán khi giá rơi xuống mức X để hạn chế lỗ |
| **Take-profit** | Lệnh tự bán khi giá lên mức X để chốt lời |
| **Sparkline** | Mini biểu đồ trong 1 dòng, không có axis (như trong table Markets) |

---

## 🎯 TL;DR — Project tóm tắt 1 đoạn

> CryptoDash là một **SPA React** giao tiếp với một **API ASP.NET Core .NET 9** qua **JWT auth**. Data lưu trong **PostgreSQL** (thao tác qua **EF Core**). Backend tổ chức theo **Clean Architecture** 4 lớp (Domain → Application → Infrastructure → Api). Real-time giá lấy từ **Binance WebSocket** trực tiếp browser → Zustand store → UI components. CoinGecko cho dữ liệu thị trường chậm (cache + Polly retry). Có 4 background workers chạy nền cho price refresh, order monitor, position liquidation, daily snapshot. Frontend dùng **Tailwind CSS** dark-mode, **Vite** build, **TanStack Query** cho server state, **lazy-load** 19 pages. Deploy lên **Render Blueprint** (1-click qua `render.yaml`) hoặc Docker compose.

---

## 📖 Đọc thêm

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Chi tiết kỹ thuật Clean Architecture + sequence diagrams
- [`UI_REDESIGN_PROMPT.md`](./UI_REDESIGN_PROMPT.md) — Spec để redesign UI (cho AI tool khác)
- [`../DEPLOY-CHECKLIST.md`](../DEPLOY-CHECKLIST.md) — Checklist trước khi deploy
- [`../README.md`](../README.md) — README public (English)

---

**Hỏi gì thêm về bất kỳ tech nào → ping tôi, tôi sẽ giải thích sâu hơn về phần đó.**
