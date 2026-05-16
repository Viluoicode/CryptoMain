# CryptoDashboard 📈

A comprehensive, full-stack cryptocurrency portfolio tracker and trading simulation platform. Built with a modern tech stack featuring real-time market data, interactive charting, and a clean, scalable backend architecture.

## ✨ Key Features

- **Real-Time Market Data**: Live crypto prices streamed directly via Binance WebSockets.
- **Advanced Trading Terminal**: Full-featured futures trading interface with KLineCharts, depth charts, order books, and technical indicators (EMA, RSI, MACD, BOLL).
- **Portfolio Management**: Track holdings, view historical performance snapshots, and analyze asset allocation.
- **Wallet System**: Multi-wallet support with simulated fiat deposits and internal transfers.
- **Watchlist & Price Alerts**: Keep track of favorite coins and receive frontend toast notifications when price targets are hit.
- **Secure Authentication**: JWT-based authentication with secure refresh token rotation and session management.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Dark-mode optimized)
- **State Management**: Zustand (Auth, Live Prices) & TanStack Query v5 (Server State)
- **Charting**: KLineChart, Lightweight Charts, Recharts
- **Routing**: React Router DOM (with lazy-loaded route chunks)

### Backend
- **Framework**: ASP.NET Core (.NET 9)
- **Architecture**: Clean Architecture (Domain, Application, Infrastructure, Api)
- **Database**: PostgreSQL with Entity Framework Core (Code-First)
- **Caching**: In-Memory Cache for CoinGecko API responses
- **Resilience**: Polly (Retry & Circuit Breaker patterns for external APIs)

## 📁 Project Structure

```text
CryptoDashboard/
├── crypto-frontend/          # React Vite application
├── CryptoDashboard.Api/      # ASP.NET Core Web API (Entry point)
├── CryptoDashboard.Application/ # Business logic, DTOs, Interfaces
├── CryptoDashboard.Domain/   # Entities, Enums, Base types
├── CryptoDashboard.Infrastructure/ # EF Core DbContext, Services, Migrations
└── CryptoDashboard.Tests/    # Unit and Integration tests
