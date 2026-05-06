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

export default function App() {
    const initialize = useAuthStore((s) => s.initialize)

    useEffect(() => { initialize() }, [initialize])

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
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}