// src/pages/LandingPage.tsx — Exchange-style landing (Binance/OKX feel)
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    TrendingUp, TrendingDown, ArrowRight, Menu, X,
    Zap, Shield, BarChart3, Globe, Wallet, Activity,
    ChevronRight, CheckCircle2, Sparkles,
} from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { useLivePriceStore } from '@/store/livePriceStore'

// ─── Header ────────────────────────────────────────────────────────────────────
function Header() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header className={cn(
            'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
            scrolled
                ? 'bg-gray-950/85 backdrop-blur-xl border-b border-gray-800/80 shadow-lg shadow-black/20'
                : 'bg-transparent'
        )}>
            <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-600 rounded-lg blur-md opacity-50 group-hover:opacity-80 transition" />
                        <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg p-1.5">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <span className="text-white text-lg font-bold tracking-tight">CryptoDash</span>
                </Link>

                <nav className="hidden md:flex items-center gap-7">
                    <Link to="/market" className="text-sm text-gray-400 hover:text-white transition">Markets</Link>
                    <Link to="/leaderboard" className="text-sm text-gray-400 hover:text-white transition">Leaderboard</Link>
                    <a href="#features" className="text-sm text-gray-400 hover:text-white transition">Features</a>
                    <a href="#trade" className="text-sm text-gray-400 hover:text-white transition">Trade</a>
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20"
                        >
                            Dashboard <ArrowRight size={14} />
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm text-gray-300 hover:text-white transition px-3 py-2">
                                Log In
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 text-sm font-bold rounded-lg transition shadow-lg shadow-yellow-400/10"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-400 hover:text-white">
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-gray-950 border-t border-gray-800 px-6 py-4 space-y-3">
                    <Link to="/market" className="block text-sm text-gray-400 hover:text-white py-2">Markets</Link>
                    <Link to="/leaderboard" className="block text-sm text-gray-400 hover:text-white py-2">Leaderboard</Link>
                    <Link to="/login" className="block text-sm text-gray-400 hover:text-white py-2">Log In</Link>
                    <Link to="/register" className="block px-4 py-2 bg-yellow-400 text-gray-950 text-sm font-bold rounded-lg text-center">
                        Sign Up
                    </Link>
                </div>
            )}
        </header>
    )
}

// ─── Live ticker (top of page) ────────────────────────────────────────────────
const TICKER_SYMBOLS = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'avax', 'doge', 'dot', 'link']

function MarketTicker() {
    const { data: coins } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 2,
    })

    useBinanceWs(TICKER_SYMBOLS)
    const { ticks } = useLivePriceStore()

    if (!coins?.length) return null
    const items = [...coins, ...coins]

    return (
        <div className="relative border-y border-gray-800/80 bg-gray-950/60 backdrop-blur-sm overflow-hidden py-2.5">
            <div className="flex animate-ticker gap-10 w-max">
                {items.map((coin, i) => {
                    const live   = ticks[coin.symbol.toLowerCase()]
                    const price  = live?.price    ?? coin.currentPrice
                    const pct    = live?.change24h ?? coin.priceChangePercentage24h
                    const isUp   = pct >= 0
                    return (
                        <div key={`${coin.id}-${i}`} className="flex items-center gap-2 shrink-0">
                            <img src={coin.image} alt="" className="w-4 h-4 rounded-full" />
                            <span className="text-xs font-semibold text-gray-300 uppercase">{coin.symbol}</span>
                            <span className="text-xs text-white font-mono">{formatUSD(price, price >= 1 ? 2 : 6)}</span>
                            <span className={cn('text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
                                {formatPct(pct)}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
    const { data: coins } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 2,
    })

    const { ticks } = useLivePriceStore()
    const btc = coins?.find(c => c.id === 'bitcoin')
    const btcPrice  = ticks['btc']?.price     ?? btc?.currentPrice ?? 0
    const btcChange = ticks['btc']?.change24h ?? btc?.priceChangePercentage24h ?? 0

    return (
        <section className="relative pt-28 pb-16 px-6 overflow-hidden">
            {/* Animated mesh background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030712_70%)]" />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    {/* Left content */}
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1.5 mb-7">
                            <Sparkles size={12} className="text-yellow-400" />
                            <span className="text-xs text-yellow-300 font-medium">Simulated trading · No real money</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
                            Trade Crypto
                            <span className="block mt-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                                Like a Pro
                            </span>
                        </h1>

                        <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
                            Professional crypto portfolio simulator với <span className="text-white font-semibold">spot trading, futures, margin positions</span> và on-chain wallet tracking — tất cả miễn phí, real-time data từ Binance.
                        </p>

                        <div className="flex flex-wrap gap-3 mb-10">
                            <Link
                                to="/register"
                                className="flex items-center gap-2 px-7 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-xl transition shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/40"
                            >
                                Bắt đầu ngay <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/market"
                                className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white font-semibold rounded-xl transition backdrop-blur-sm"
                            >
                                Xem markets
                            </Link>
                        </div>

                        {/* Trust stats */}
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-800/60 max-w-md">
                            <div>
                                <div className="text-2xl font-bold text-white">100+</div>
                                <div className="text-xs text-gray-500 mt-1">Coins tracked</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">24/7</div>
                                <div className="text-xs text-gray-500 mt-1">Real-time data</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">$10K</div>
                                <div className="text-xs text-gray-500 mt-1">Demo balance</div>
                            </div>
                        </div>
                    </div>

                    {/* Right — BTC big ticker card */}
                    <div className="lg:col-span-5">
                        <div className="relative">
                            {/* Glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/30 to-indigo-600/30 rounded-3xl blur-2xl opacity-60" />

                            <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-7 shadow-2xl">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        {btc && <img src={btc.image} alt="" className="w-12 h-12 rounded-full" />}
                                        <div>
                                            <div className="text-lg font-bold text-white">BTC/USDT</div>
                                            <div className="text-xs text-gray-500">Bitcoin · Spot</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        LIVE
                                    </span>
                                </div>

                                <div className="mb-2">
                                    <div className="text-5xl font-bold text-white font-mono tracking-tight">
                                        {btcPrice ? formatUSD(btcPrice) : '—'}
                                    </div>
                                    <div className={cn(
                                        'flex items-center gap-1.5 mt-2 text-sm font-semibold',
                                        btcChange >= 0 ? 'text-emerald-400' : 'text-red-400',
                                    )}>
                                        {btcChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {formatPct(btcChange)} (24h)
                                    </div>
                                </div>

                                {/* Top 3 mini */}
                                <div className="mt-6 pt-6 border-t border-gray-800/60 space-y-2.5">
                                    {coins?.slice(1, 4).map(coin => {
                                        const live   = ticks[coin.symbol.toLowerCase()]
                                        const price  = live?.price ?? coin.currentPrice
                                        const change = live?.change24h ?? coin.priceChangePercentage24h
                                        return (
                                            <div key={coin.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <img src={coin.image} alt="" className="w-6 h-6 rounded-full" />
                                                    <span className="text-sm font-medium text-white uppercase">{coin.symbol}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono text-gray-300">{formatUSD(price, price >= 1 ? 2 : 4)}</span>
                                                    <span className={cn(
                                                        'text-xs font-semibold font-mono w-16 text-right',
                                                        change >= 0 ? 'text-emerald-400' : 'text-red-400',
                                                    )}>
                                                        {formatPct(change)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <Link
                                    to="/market"
                                    className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-gray-800 rounded-xl text-sm text-gray-300 font-medium transition"
                                >
                                    View all markets <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ─── Market Overview ──────────────────────────────────────────────────────────
function MarketOverview() {
    const navigate = useNavigate()
    const { data: coins, isLoading } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 2,
    })

    const { ticks } = useLivePriceStore()

    return (
        <section className="relative py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
                    <div>
                        <div className="text-xs font-bold tracking-widest text-yellow-400 uppercase mb-2">Live Markets</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">Top cryptocurrencies</h2>
                    </div>
                    <Link to="/market" className="flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300 transition font-semibold">
                        View all markets <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 bg-gray-950/40">
                                    <th className="pl-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-12">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">24h Change</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Volume</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Market Cap</th>
                                    <th className="pr-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide" />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-800/50">
                                            <td className="pl-6 py-4"><div className="w-3 h-3 bg-gray-800 animate-pulse rounded" /></td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-gray-800 animate-pulse rounded-full" />
                                                    <div className="w-24 h-3 bg-gray-800 animate-pulse rounded" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-4"><div className="w-14 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-4 hidden md:table-cell"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-4 hidden lg:table-cell"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="pr-6 py-4" />
                                        </tr>
                                    ))
                                    : coins?.slice(0, 10).map((coin, i) => {
                                        const live   = ticks[coin.symbol.toLowerCase()]
                                        const price  = live?.price     ?? coin.currentPrice
                                        const change = live?.change24h ?? coin.priceChangePercentage24h
                                        const pos    = change >= 0
                                        return (
                                            <tr
                                                key={coin.id}
                                                onClick={() => navigate(`/market/${coin.id}`)}
                                                className="border-b border-gray-800/40 hover:bg-gray-800/30 transition cursor-pointer group"
                                            >
                                                <td className="pl-6 py-4 text-xs text-gray-500 font-mono">{i + 1}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={coin.image} alt="" className="w-7 h-7 rounded-full" />
                                                        <div>
                                                            <div className="font-semibold text-white text-sm">{coin.name}</div>
                                                            <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right text-sm text-white font-mono font-semibold">
                                                    {formatUSD(price, price >= 1 ? 2 : 6)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={cn(
                                                        'text-sm font-semibold font-mono',
                                                        pos ? 'text-emerald-400' : 'text-red-400',
                                                    )}>
                                                        {formatPct(change)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-sm text-gray-400 font-mono hidden md:table-cell">
                                                    {formatMarketCap(coin.totalVolume)}
                                                </td>
                                                <td className="px-4 py-4 text-right text-sm text-gray-400 font-mono hidden lg:table-cell">
                                                    {formatMarketCap(coin.marketCap)}
                                                </td>
                                                <td className="pr-6 py-4 text-right">
                                                    <Link
                                                        to="/register"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs font-bold text-gray-950 bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Trade
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ─── Trading Showcase ─────────────────────────────────────────────────────────
function TradingShowcase() {
    return (
        <section id="trade" className="relative py-24 px-6 border-t border-gray-800/60 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <div className="text-xs font-bold tracking-widest text-yellow-400 uppercase mb-2">Pro Tools</div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Built for serious traders</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Advanced charts, real-time order books, conditional orders và margin positions — mọi thứ bạn cần để thực hành trading.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FeatureCard
                        icon={<BarChart3 className="text-yellow-400" size={22} />}
                        title="Advanced Charts"
                        desc="KLineChart với EMA, RSI, MACD, Bollinger Bands. 9 drawing tools cho technical analysis."
                        accent="yellow"
                    />
                    <FeatureCard
                        icon={<Zap className="text-indigo-400" size={22} />}
                        title="Real-time Order Book"
                        desc="Depth-of-market 20 levels, recent trades stream, depth chart visualization."
                        accent="indigo"
                    />
                    <FeatureCard
                        icon={<Activity className="text-emerald-400" size={22} />}
                        title="Margin Positions"
                        desc="Long/Short với leverage 1-100x. Stop-loss, take-profit, auto-liquidation."
                        accent="emerald"
                    />
                    <FeatureCard
                        icon={<Wallet className="text-violet-400" size={22} />}
                        title="Multi-Wallet Portfolio"
                        desc="Quản lý nhiều ví khác nhau, theo dõi holdings và P&L real-time."
                        accent="violet"
                    />
                    <FeatureCard
                        icon={<Globe className="text-cyan-400" size={22} />}
                        title="On-Chain Tracking"
                        desc="Track external EVM wallets qua MetaMask. Hỗ trợ Ethereum, BSC, Polygon, Arbitrum."
                        accent="cyan"
                    />
                    <FeatureCard
                        icon={<Shield className="text-pink-400" size={22} />}
                        title="Secure JWT Auth"
                        desc="Access + refresh token rotation, auto re-auth, SHA-256 hashed refresh tokens."
                        accent="pink"
                    />
                </div>
            </div>
        </section>
    )
}

function FeatureCard({ icon, title, desc, accent }: {
    icon: React.ReactNode; title: string; desc: string
    accent: 'yellow' | 'indigo' | 'emerald' | 'violet' | 'cyan' | 'pink'
}) {
    const glowColors: Record<string, string> = {
        yellow:  'group-hover:shadow-yellow-500/10',
        indigo:  'group-hover:shadow-indigo-500/10',
        emerald: 'group-hover:shadow-emerald-500/10',
        violet:  'group-hover:shadow-violet-500/10',
        cyan:    'group-hover:shadow-cyan-500/10',
        pink:    'group-hover:shadow-pink-500/10',
    }
    return (
        <div className={cn(
            'group bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl',
            glowColors[accent],
        )}>
            <div className="w-11 h-11 bg-gray-800/80 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </div>
    )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
    const steps = [
        { n: '01', title: 'Tạo tài khoản', desc: 'Đăng ký miễn phí trong 30 giây. Nhận ngay $10,000 demo balance.' },
        { n: '02', title: 'Khám phá thị trường', desc: 'Theo dõi top 100 coin với real-time price từ Binance WebSocket.' },
        { n: '03', title: 'Trade & track', desc: 'Mua bán, mở margin positions, đặt orders, theo dõi P&L mọi lúc.' },
        { n: '04', title: 'Compete', desc: 'Vào leaderboard, so kè với top traders, export rank thành PNG.' },
    ]
    return (
        <section id="features" className="relative py-20 px-6 border-t border-gray-800/60">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <div className="text-xs font-bold tracking-widest text-yellow-400 uppercase mb-2">Get Started</div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">Bắt đầu trong 4 bước</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {steps.map((s, i) => (
                        <div key={i} className="relative bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-yellow-400/30 transition">
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-700 to-gray-800 mb-3">
                                {s.n}
                            </div>
                            <h3 className="font-bold text-white text-base mb-2">{s.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTASection() {
    const benefits = [
        '$10,000 demo balance miễn phí',
        'Real-time data từ Binance + CoinGecko',
        'Không cần thẻ tín dụng — không phí ẩn',
        'Margin trading & on-chain wallet tracking',
    ]
    return (
        <section className="py-24 px-6 border-t border-gray-800/60">
            <div className="max-w-5xl mx-auto">
                <div className="relative bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-yellow-400/10 border border-gray-800 rounded-3xl px-8 md:px-16 py-16 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-yellow-400/10 rounded-full blur-3xl" />
                    </div>
                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                Sẵn sàng trade
                                <span className="block bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
                                    như một pro?
                                </span>
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Tham gia cộng đồng traders đang dùng CryptoDash để học và thử nghiệm strategies.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    to="/register"
                                    className="flex items-center gap-2 px-7 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-xl transition shadow-xl shadow-yellow-400/20"
                                >
                                    Đăng ký miễn phí <ArrowRight size={16} />
                                </Link>
                                <Link
                                    to="/leaderboard"
                                    className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-gray-700 text-white font-semibold rounded-xl transition"
                                >
                                    Xem leaderboard
                                </Link>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <CheckCircle2 size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                                    <span className="text-gray-200 text-sm">{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="border-t border-gray-800 px-6 py-12 bg-gray-950">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg p-1.5">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-white font-bold">CryptoDash</span>
                        </div>
                        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                            Professional crypto portfolio simulator với real-time data, margin trading và on-chain tracking.
                        </p>
                    </div>

                    <FooterCol title="Product" links={[
                        { to: '/market', label: 'Markets' },
                        { to: '/trade', label: 'Trade' },
                        { to: '/leaderboard', label: 'Leaderboard' },
                    ]} />
                    <FooterCol title="Resources" links={[
                        { to: '/register', label: 'Get Started' },
                        { to: '/login', label: 'Log In' },
                    ]} />
                    <FooterCol title="Legal" links={[
                        { to: '/', label: 'Disclaimer' },
                    ]} />
                </div>

                <div className="pt-6 border-t border-gray-800/60 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-600">
                        © 2026 CryptoDash · Built with React + .NET 9 · Data from CoinGecko & Binance
                    </p>
                    <p className="text-xs text-gray-700">
                        Chỉ dành cho mục đích học tập — không phải investment advice
                    </p>
                </div>
            </div>
        </footer>
    )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
    return (
        <div>
            <div className="text-sm font-semibold text-white mb-3">{title}</div>
            <ul className="space-y-2">
                {links.map(l => (
                    <li key={l.to + l.label}>
                        <Link to={l.to} className="text-sm text-gray-500 hover:text-white transition">{l.label}</Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-yellow-400/30 selection:text-yellow-100">
            <Header />
            <div className="pt-16">
                <MarketTicker />
            </div>
            <Hero />
            <MarketOverview />
            <TradingShowcase />
            <HowItWorks />
            <CTASection />
            <Footer />
        </div>
    )
}
