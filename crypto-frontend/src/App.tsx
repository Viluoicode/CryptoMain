// src/App.tsx
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WalletsPage } from '@/pages/WalletsPage'
import { WalletDetailPage } from '@/pages/WalletDetailPage'
import { MarketPage } from '@/pages/MarketPage'
import { CoinDetailPage } from '@/pages/CoinDetailPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ConvertPage } from '@/pages/ConvertPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { useWatchlistSync, getLocalStorageWatchlist } from '@/hooks/useWatchlist'

export default function App() {
    const initialize = useAuthStore((s) => s.initialize)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const syncMut = useWatchlistSync()

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
        <Routes>
            {/* ── Landing ───────────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />

            {/* ── Public với PublicLayout ───────────────────────────────────── */}
            <Route element={<PublicLayout />}>
                <Route path="/market" element={<MarketPage />} />
                <Route path="/market/:coinId" element={<CoinDetailPage />} />
            </Route>

            {/* ── Guest only ────────────────────────────────────────────────── */}
            <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* ── Protected ─────────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/wallets" element={<WalletsPage />} />
                    <Route path="/wallets/:id" element={<WalletDetailPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/convert" element={<ConvertPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}