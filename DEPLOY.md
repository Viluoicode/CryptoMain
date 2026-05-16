# Deployment Guide

Two ways to deploy CryptoDash: **local Docker** (for testing the production stack) or **Render.com** (for a live URL).

---

## Option 1: Local Docker (recommended first run)

Tests the full production-like stack on your machine — Postgres + .NET API + Nginx-served React.

### Prerequisites
- Docker Desktop (Windows / macOS) or Docker Engine (Linux)
- ~2 GB free disk space

### Steps

```bash
# 1. Clone the env example
cp .env.docker.example .env.docker

# 2. Edit .env.docker — at minimum set a strong JWT_SECRET_KEY (>= 32 chars)
#    On Linux/macOS:  openssl rand -base64 48
#    On Windows PowerShell:  [Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))

# 3. Build & start
docker compose --env-file .env.docker up --build
```

Open:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8080 (Swagger at `/swagger`)
- **Health**: http://localhost:8080/health/ready

### Common commands

```bash
docker compose down              # Stop everything
docker compose down -v           # Stop and wipe Postgres data
docker compose logs -f api       # Follow API logs
docker compose ps                # Service status
```

---

## Option 2: Render.com (live URL)

Free tier gives you a public HTTPS URL. API sleeps after 15 min idle (cold start ~30s), Postgres free for 30 days.

### Prerequisites
- GitHub account with this repo pushed
- Render.com account (free, no credit card)

### Steps

1. **Push to GitHub** — Render reads `render.yaml` from the default branch.

2. **Render dashboard** → **"New +"** → **"Blueprint"**.

3. Connect your GitHub repo. Render auto-detects `render.yaml` and shows the resources:
   - 1 Postgres database (`cryptodash-db`)
   - 1 Web Service for API (`cryptodash-api`)
   - 1 Web Service for frontend (`cryptodash-frontend`)

4. Click **"Apply"** — first build takes ~5-10 min.

5. Once deployed:
   - Frontend URL: `https://cryptodash-frontend.onrender.com`
   - API URL: `https://cryptodash-api.onrender.com`
   - Swagger: `https://cryptodash-api.onrender.com/swagger`

### Optional environment variables

In Render dashboard → `cryptodash-api` → Environment, add:
- `Alchemy__ApiKey` — for on-chain wallet sync (get from [alchemy.com](https://alchemy.com))
- `CryptoApi__ApiKey` — for CoinGecko Pro (free tier works without)

### Auto-migrations

The API runs `dotnet ef database update` on startup (controlled by env var `RunMigrationsOnStartup=true`). New migrations apply automatically on each deploy — no manual step.

### Limitations of free tier

- API sleeps after 15 min idle → first request after wakes the container (~30s cold start). Pings to `/health/live` keep it warm.
- Postgres free expires after 30 days; upgrade to $7/mo or migrate to [Neon](https://neon.tech) (free Postgres without expiry).

---

## Production checklist

Before exposing publicly:

- [ ] JWT secret is strong (≥ 32 random chars) and not committed
- [ ] `Cors__AllowedOrigins` set to the frontend URL only
- [ ] HTTPS enforced (Render does this automatically)
- [ ] Logs being collected (Serilog writes to `/app/logs` in the API container)
- [ ] `/health/ready` returning 200 (verifies DB reachable)
- [ ] Rate limiter active on `/api/crypto/*` (30 req/min) and `/api/portfolio/leaderboard` (10 req/min)
- [ ] Alchemy API key set if on-chain feature is wanted
