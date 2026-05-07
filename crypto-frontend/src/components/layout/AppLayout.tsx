// src/components/layout/AppLayout.tsx
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, Wallet, BarChart2, TrendingUp,
    LogOut, Menu, X, User, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/wallets', icon: Wallet, label: 'Wallets' },
    { to: '/portfolio', icon: BarChart2, label: 'Portfolio' },
    { to: '/market', icon: TrendingUp, label: 'Market' },
]

export function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { isDark, toggleTheme } = useTheme()

    function handleLogout() {
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-30 flex w-60 flex-col',
                'bg-white dark:bg-gray-900',
                'border-r border-gray-200 dark:border-gray-800',
                'transition-all duration-200',
                'lg:relative lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="bg-brand-600 rounded-lg p-1.5 shrink-0">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">CryptoDash</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                            )}
                        >
                            <Icon className="shrink-0" size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Theme toggle + User + Logout */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3 space-y-1">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {isDark
                            ? <Sun size={16} className="text-amber-400" />
                            : <Moon size={16} className="text-brand-500" />}
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                        <div className="bg-brand-100 dark:bg-brand-600/20 rounded-full p-1.5 shrink-0">
                            <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                {/* Mobile topbar */}
                <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 lg:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <span className="font-semibold text-gray-900 dark:text-white">CryptoDash</span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                    </button>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}