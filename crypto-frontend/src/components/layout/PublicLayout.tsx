// src/components/layout/PublicLayout.tsx
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { TrendingUp, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function PublicLayout() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-navy-900">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-navy-850/70 backdrop-blur-2xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent-gradient rounded-lg blur-md opacity-40 group-hover:opacity-60 transition" />
                            <div className="relative bg-gradient-to-br from-accent-cyan to-accent-purple rounded-lg p-1.5">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <span className="font-bold text-white text-base">CryptoDash</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink
                            to="/market"
                            className={({ isActive }) => cn(
                                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-accent-cyan/10 text-accent-cyan'
                                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                            )}
                        >
                            Markets
                        </NavLink>
                        <NavLink
                            to="/leaderboard"
                            className={({ isActive }) => cn(
                                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-accent-cyan/10 text-accent-cyan'
                                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                            )}
                        >
                            Leaderboard
                        </NavLink>
                    </nav>

                    {/* Right actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-4 py-2 bg-gradient-to-r from-accent-cyan to-accent-purple hover:shadow-glow text-white text-sm font-semibold rounded-xl transition-all duration-200"
                            >
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
                                >
                                    Log In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 bg-gradient-to-r from-accent-cyan to-accent-purple hover:shadow-glow text-white text-sm font-semibold rounded-xl transition-all duration-200"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile buttons */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle menu"
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/[0.06] transition"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-white/[0.06] px-6 py-3 space-y-1 bg-navy-850/80 backdrop-blur-xl animate-slide-in">
                        <NavLink
                            to="/market"
                            onClick={() => setMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/[0.04] hover:text-white rounded-lg transition"
                        >
                            Markets
                        </NavLink>
                        <NavLink
                            to="/leaderboard"
                            onClick={() => setMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/[0.04] hover:text-white rounded-lg transition"
                        >
                            Leaderboard
                        </NavLink>
                        {isAuthenticated ? (
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
                                className="w-full text-left px-3 py-2 text-sm font-medium text-accent-cyan hover:bg-white/[0.04] rounded-lg transition"
                            >
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/[0.04] hover:text-white rounded-lg transition">
                                    Log In
                                </Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-accent-cyan hover:bg-white/[0.04] rounded-lg transition">
                                    Sign Up Free
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