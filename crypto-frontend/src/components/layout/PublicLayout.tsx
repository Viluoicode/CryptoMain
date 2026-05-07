// src/components/layout/PublicLayout.tsx
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { TrendingUp, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PublicLayout() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const { isDark, toggleTheme } = useTheme()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="bg-brand-600 rounded-lg p-1.5">
                            <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-base">CryptoDash</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink
                            to="/market"
                            className={({ isActive }) => cn(
                                'px-4 py-2 text-sm font-medium rounded-lg transition',
                                isActive
                                    ? 'bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            )}
                        >
                            Thị trường
                        </NavLink>
                    </nav>

                    {/* Right actions */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                        </button>

                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition"
                            >
                                Dashboard →
                            </button>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition"
                                >
                                    Đăng ký
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile buttons */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                        </button>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-gray-100 dark:border-gray-800 px-6 py-3 space-y-1">
                        <NavLink
                            to="/market"
                            onClick={() => setMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                        >
                            Thị trường
                        </NavLink>
                        {isAuthenticated ? (
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
                                className="w-full text-left px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            >
                                Dashboard →
                            </button>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                                    Đăng nhập
                                </Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                                    Đăng ký miễn phí
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </header>

            {/* ── Content ── */}
            <main className="max-w-7xl mx-auto px-6 py-6">
                <Outlet />
            </main>
        </div>
    )
}