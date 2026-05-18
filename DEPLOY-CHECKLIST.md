# Production Deploy Checklist

Complete each item before pointing real traffic at the deployment.

---

## 1. Secrets & Configuration

- [ ] `Jwt:SecretKey` set in production env vars — **minimum 32 chars**, generated with a CSPRNG.
      Render: auto-generated via `generateValue: true` in `render.yaml`.
- [ ] `ConnectionStrings:MyConnect` points at the production Postgres instance.
- [ ] `Alchemy:ApiKey` set (optional — on-chain sync degrades to zeros without it).
- [ ] `CryptoApi:ApiKey` set if you have a paid CoinGecko plan (otherwise free tier; current rate limit assumes free).
- [ ] No real secrets committed to git. Grep the repo:
      ```bash
      git log --all --full-history -p | grep -iE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"]?[a-z0-9]" | head
      ```
- [ ] `.env.docker` not committed (check `.gitignore` includes `.env.docker`).

## 2. CORS

- [ ] `Cors:AllowedOrigins` in `appsettings.Production.json` (or env) lists the **exact** frontend origin(s):
      `["https://cryptodash.app", "https://www.cryptodash.app"]`
- [ ] Confirm CORS by hitting the API from the frontend in production once — the browser will block silently if wrong.

## 3. Database

- [ ] `RunMigrationsOnStartup=true` set so EF auto-applies pending migrations on cold start.
- [ ] Database backups enabled (Render auto-backups daily on paid tier — verify on free tier or self-hosted).
- [ ] Connection pool sized for the host:
      Render free Postgres has a low connection cap (~20); set `MaxPoolSize=10` in connection string to be safe.
- [ ] Test restore: take a backup, drop DB, restore — confirm app comes back online cleanly.

## 4. Rate Limiting (already wired in code)

| Policy           | Endpoint                       | Limit       |
|------------------|--------------------------------|-------------|
| `crypto`         | `/api/Crypto/*`                | 30 req/min  |
| `leaderboard`    | `/api/Portfolio/leaderboard`   | 10 req/min  |
| `auth-login`     | `/api/auth/login`              | 5 req/min   |
| `auth-register`  | `/api/auth/register`           | 3 req/min   |
| `errors`         | `/api/telemetry/errors`        | 20 req/min  |

- [ ] Hit each endpoint from a single IP past the limit — should see HTTP 429.

## 5. Health Checks

- [ ] `GET /health/live` returns 200 (liveness — process is up).
- [ ] `GET /health/ready` returns 200 with Postgres reachable **and** the crypto price cache warm.
      Cache fills within ~30s of startup (`CryptoPriceRefreshService` polls CoinGecko on boot).
- [ ] Wire your host's health-check probe to `/health/ready`. Render `render.yaml` already does this.
- [ ] Dockerfile `HEALTHCHECK` already pings `/health/live` every 30s.

## 6. HTTPS

- [ ] `UseHttpsRedirection()` enabled (already in `Program.cs`).
- [ ] Production cert provisioned by the platform (Render: auto via Let's Encrypt).
- [ ] HSTS header set if you want it — currently relying on ASP.NET defaults.

## 7. Logging & Observability

- [ ] Serilog console output captured by the platform's log stream (Render shows console).
- [ ] **File log retention is short-lived on PaaS** — `logs/log-*.txt` evaporates on restart.
      For persistent logs, point Serilog at one of (sign up separately):
      - Better Stack (free 1GB/mo): `Serilog.Sinks.BetterStack`
      - Seq Cloud (free 1GB/mo): `Serilog.Sinks.Seq`
      - Axiom (free 500MB/mo): `Serilog.Sinks.Axiom`
- [ ] Frontend errors arrive at `POST /api/telemetry/errors` and surface in logs (test by triggering an error).
- [ ] Optional: add Sentry to the frontend for richer stack traces (`@sentry/react`).
      Get a DSN from sentry.io (free tier 5k errors/mo) and wire it in `main.tsx` before `ReactDOM.createRoot`.

## 8. Frontend

- [ ] `VITE_API_URL` set to the production API origin (e.g. `https://api.cryptodash.app`).
- [ ] Build artifact gzip sizes reasonable: `vendor-charts` ~76KB, main `index` ~9KB, total first paint < 200KB gzip.
- [ ] `index.html` OG image (`/og-cover.svg`) loads when shared on Twitter/Discord/LinkedIn (test with [opengraph.xyz](https://www.opengraph.xyz/)).
- [ ] `public/robots.txt` + `public/sitemap.xml` accessible at `https://your-domain/robots.txt`.
- [ ] Update both files: replace `cryptodash.app` placeholder with your real domain.
- [ ] `loading="lazy"` on coin icons (already applied to Market / Watchlist / WalletDetail).

## 9. Security review

- [ ] JWT `ClockSkew = TimeSpan.Zero` (already set — tokens expire exactly at `exp`).
- [ ] Refresh tokens stored hashed via `TokenHasher.Hash` (already in `AuthService`).
- [ ] Password complexity: currently min 6 chars (`RegisterPage` zod schema). Bump to 8+ and require digit + letter if you expect adversarial signups.
- [ ] No PII in logs: review Serilog output — should not contain raw passwords, full tokens, or email addresses beyond what's needed for debugging.
- [ ] Run `dotnet list package --vulnerable` and `npm audit` — patch any high/critical.

## 10. Domain & DNS

- [ ] Custom domain pointed at Render (or your host) via CNAME / A.
- [ ] `www` → apex redirect (or vice versa) — pick one as canonical.
- [ ] SSL cert active (Render auto-provisions on domain add).

## 11. Monitoring & Alerting (post-launch)

- [ ] Uptime monitoring: ping `/health/live` every 5 minutes from an external service
      (UptimeRobot free, BetterStack Uptime free, Cronitor).
- [ ] Alert on:
      - `/health/ready` failing for > 2 minutes (DB or upstream issue)
      - 5xx rate > 1% over 5 min
      - Login failure rate spike (possible brute-force)

## 12. Legal & Communication

- [ ] Disclaimer prominent on landing: "Simulated trading — no real money, no financial advice."
- [ ] Privacy policy page if you collect any user data (email = personal data under GDPR).
- [ ] Terms of Service if you want any liability shield.
- [ ] Support contact: email or Discord link in footer.

---

## Quick deploy command (Render Blueprint)

```bash
# 1. Push everything to main
git push origin main

# 2. In Render dashboard
#    "New +" → "Blueprint" → connect this repo
#    Render reads render.yaml and provisions Postgres + API + Frontend
#    First deploy takes ~5-8 minutes (cold build)

# 3. After services are healthy
#    - Open Render → API service → Environment
#    - Set Alchemy__ApiKey (double underscore for nested config)
#    - Trigger "Manual Deploy" to pick up the env var
```

---

## Smoke test plan (run once after each deploy)

1. **Landing**: load `/`, verify ticker scrolls, BTC price shows up within 5s.
2. **Register**: create a fresh account, get redirected to `/dashboard`.
3. **Wallet**: see default wallet with $10,000 fiat.
4. **Transaction**: buy 0.001 BTC, verify balance updates.
5. **Market**: load `/market`, verify sparkline column renders, click coin → `/market/:id`.
6. **Trade**: open `/trade`, see KLineChart + order book stream from Binance.
7. **Leaderboard**: load `/leaderboard` (public) without auth — should work.
8. **Logout & log back in**: confirm session round-trip.
9. **404**: hit a random URL → see NotFoundPage.
10. **Error**: trigger a render error in dev console (`throw new Error('test')` inside a component) — verify it lands in API logs via `/api/telemetry/errors`.
