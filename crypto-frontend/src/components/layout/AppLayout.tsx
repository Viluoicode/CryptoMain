// src/components/layout/AppLayout.tsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Wallet, BarChart2, TrendingUp,
    LogOut, Menu, X, User, ArrowLeftRight, Settings,
    ClipboardList, Star, Bell, CandlestickChart,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { GlobalMarketBar } from '@/components/GlobalMarketBar'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { useLivePriceStore } from '@/store/livePriceStore'

// ─── Sidebar live mini-ticker ──────────────────────────────────────────────────
const SIDEBAR_COINS = [
    { symbol: 'btc', label: 'BTC' },
    { symbol: 'eth', label: 'ETH' },
    { symbol: 'bnb', label: 'BNB' },
]
const SIDEBAR_SYMBOLS = SIDEBAR_COINS.map(c => c.symbol)

function SidebarTicker() {
    useBinanceWs(SIDEBAR_SYMBOLS)
    const { ticks, connected } = useLivePriceStore()

    return (
        <div className="px-3 py-3 border-t border-gray-800/60">
            <div className="space-y-1">
                {SIDEBAR_COINS.map(({ symbol, label }) => {
                    const tick = ticks[symbol]
                    const price = tick?.price
                    const pct   = tick?.change24h ?? 0
                    const isUp  = pct >= 0

                    return (
                        <div key={symbol} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-2">
                                {/* Live dot */}
                                <span className={cn(
                                    'w-1.5 h-1.5 rounded-full shrink-0',
                                    connected ? 'bg-emerald-500' : 'bg-gray-600',
                                )} />
                                <span className="text-xs font-semibold text-gray-400">{label}</span>
                            </div>
                            <div className="text-right">
                                {price ? (
                                    <>
                                        <p className="text-xs font-mono text-white leading-none">
                                            {price >= 1000
                                                ? `$${(price / 1000).toFixed(1)}K`
                                                : `$${price.toFixed(2)}`}
                                        </p>
                                        <p className={cn(
                                            'text-[10px] font-mono leading-none mt-0.5',
                                            isUp ? 'text-emerald-500' : 'text-red-500',
                                        )}>
                                            {isUp ? '+' : ''}{pct.toFixed(2)}%
                                        </p>
                                    </>
                                ) : (
                                    <div className="w-12 h-3 bg-gray-800 animate-pulse rounded" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const NAV_ITEMS = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/wallets',       icon: Wallet,          label: 'Wallets' },
    { to: '/portfolio',     icon: BarChart2,       label: 'Portfolio' },
    { to: '/market',        icon: TrendingUp,      label: 'Market' },
    { to: '/convert',       icon: ArrowLeftRight,  label: 'Convert' },
    { to: '/transactions',  icon: ClipboardList,   label: 'Transactions' },
    { to: '/watchlist',     icon: Star,              label: 'Watchlist' },
    { to: '/alerts',        icon: Bell,              label: 'Price Alerts' },
    { to: '/trade',         icon: CandlestickChart,  label: 'Terminal' },
    { to: '/settings',      icon: Settings,          label: 'Settings' },
]

export function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const isTerminal = location.pathname === '/trade'

    // Force dark mode always
    useEffect(() => {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
    }, [])

    function handleLogout() {
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-30 flex w-60 flex-col',
                'bg-gray-900 border-r border-gray-800',
                'transition-transform duration-200',
                'lg:relative lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
                    <div className="bg-indigo-600 rounded-xl p-2 shrink-0">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-white text-base tracking-tight">CryptoDash</span>
                        <span className="block text-[10px] text-gray-500 leading-none -mt-0.5">Portfolio Tracker</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                isActive
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100 border border-transparent',
                            )}
                        >
                            <Icon size={17} className="shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Live prices mini-ticker */}
                <SidebarTicker />

                {/* User + Logout */}
                <div className="border-t border-gray-800 px-3 py-3 space-y-1">
                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/50">
                        <div className="w-8 h-8 bg-indigo-600/30 rounded-full flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all duration-150"
                    >
                        <LogOut size={16} />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                {/* Mobile topbar */}
                <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 lg:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 rounded-lg p-1">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-white">CryptoDash</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 bg-indigo-600/30 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-indigo-400" />
                    </div>
                </header>

                {/* Global market stats bar — compact, always visible */}
                {!isTerminal && <GlobalMarketBar />}

                {/* Page content */}
                <main className={cn(
                    'flex-1 bg-gray-950',
                    isTerminal
                        ? 'overflow-hidden flex flex-col'
                        : 'overflow-y-auto px-6 py-6',
                )}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
