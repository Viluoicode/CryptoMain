// src/App.tsx
import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PriceAlertWatcher } from '@/components/PriceAlertWatcher'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useWatchlistSync, getLocalStorageWatchlist } from '@/hooks/useWatchlist'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
// Each dynamic import creates a separate JS chunk, so klinecharts and
// lightweight-charts are never downloaded until the user navigates there.

const LandingPage       = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage         = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage      = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))

const DashboardPage     = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const WalletsPage       = lazy(() => import('@/pages/WalletsPage').then(m => ({ default: m.WalletsPage })))
const WalletDetailPage  = lazy(() => import('@/pages/WalletDetailPage').then(m => ({ default: m.WalletDetailPage })))
const MarketPage        = lazy(() => import('@/pages/MarketPage').then(m => ({ default: m.MarketPage })))
const CoinDetailPage    = lazy(() => import('@/pages/CoinDetailPage').then(m => ({ default: m.CoinDetailPage })))
const PortfolioPage     = lazy(() => import('@/pages/PortfolioPage').then(m => ({ default: m.PortfolioPage })))
const SettingsPage      = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ConvertPage       = lazy(() => import('@/pages/ConvertPage').then(m => ({ default: m.ConvertPage })))
const TransactionsPage  = lazy(() => import('@/pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const WatchlistPage     = lazy(() => import('@/pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })))
const PriceAlertsPage   = lazy(() => import('@/pages/PriceAlertsPage').then(m => ({ default: m.PriceAlertsPage })))
const FuturesPage       = lazy(() => import('@/pages/FuturesPage').then(m => ({ default: m.FuturesPage })))
const NotFoundPage      = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageSkeleton() {
    return (
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">Đang tải...</p>
            </div>
        </div>
    )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
    const initialize     = useAuthStore((s) => s.initialize)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const syncMut        = useWatchlistSync()

    useEffect(() => { initialize() }, [initialize])

    // Sync localStorage watchlist to DB once after login
    useEffect(() => {
        if (!isAuthenticated) return
        const items = getLocalStorageWatchlist()
        if (items.length > 0) {
            syncMut.mutate(items)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])

    return (
        <ErrorBoundary>
            {/* PriceAlertWatcher: invisible, checks live WS prices against user alerts */}
            {isAuthenticated && <PriceAlertWatcher />}

            <Suspense fallback={<PageSkeleton />}>
                <Routes>
                    {/* ── Landing ─────────────────────────────────────────── */}
                    <Route path="/" element={<LandingPage />} />

                    {/* ── Public (market is accessible without login) ──────── */}
                    <Route element={<PublicLayout />}>
                        <Route path="/market"           element={<MarketPage />} />
                        <Route path="/market/:coinId"   element={<CoinDetailPage />} />
                    </Route>

                    {/* ── Guest only (redirect to /dashboard if logged in) ── */}
                    <Route element={<GuestRoute />}>
                        <Route path="/login"    element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                    </Route>

                    {/* ── Protected ─────────────────────────────────────────── */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/dashboard"   element={<DashboardPage />} />
                            <Route path="/wallets"      element={<WalletsPage />} />
                            <Route path="/wallets/:id"  element={<WalletDetailPage />} />
                            <Route path="/portfolio"    element={<PortfolioPage />} />
                            <Route path="/convert"      element={<ConvertPage />} />
                            <Route path="/transactions" element={<TransactionsPage />} />
                            <Route path="/watchlist"    element={<WatchlistPage />} />
                            <Route path="/alerts"       element={<PriceAlertsPage />} />
                            <Route path="/trade"        element={<FuturesPage />} />
                            <Route path="/settings"     element={<SettingsPage />} />
                        </Route>
                    </Route>

                    {/* ── 404 ───────────────────────────────────────────────── */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    )
}
