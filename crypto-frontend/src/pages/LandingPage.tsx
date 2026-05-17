// src/pages/LandingPage.tsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, BarChart2, Shield, Zap, ArrowRight, Menu, X, Users, DollarSign, Layers } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct } from '@/lib/format'
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
                ? 'bg-gray-950/90 backdrop-blur-md border-b border-gray-800'
                : 'bg-transparent'
        )}>
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 rounded-lg p-1.5">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white text-lg font-bold tracking-tight">CryptoDash</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    <Link to="/market" className="text-sm text-gray-400 hover:text-white transition">Thị trường</Link>
                    <a href="#features" className="text-sm text-gray-400 hover:text-white transition">Tính năng</a>
                </nav>

                {/* Auth buttons */}
                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                        >
                            Dashboard <ArrowRight size={14} />
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition px-3 py-2">
                                Đăng nhập
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                            >
                                Bắt đầu miễn phí
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden text-gray-400 hover:text-white"
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-gray-950 border-t border-gray-800 px-6 py-4 space-y-3">
                    <Link to="/market" className="block text-sm text-gray-400 hover:text-white transition py-2">Thị trường</Link>
                    <Link to="/login" className="block text-sm text-gray-400 hover:text-white transition py-2">Đăng nhập</Link>
                    <Link to="/register" className="block px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl text-center">
                        Bắt đầu miễn phí
                    </Link>
                </div>
            )}
        </header>
    )
}

// ─── Ticker ────────────────────────────────────────────────────────────────────
const TOP10_SYMBOLS = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'avax', 'doge', 'dot', 'link']

function MarketTicker() {
    const { data: coins } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 2,
    })

    // Connect WebSocket for top 10 — gives the ticker live prices
    useBinanceWs(TOP10_SYMBOLS)
    const { ticks } = useLivePriceStore()

    if (!coins?.length) return null

    // Duplicate for seamless CSS loop
    const items = [...coins, ...coins]

    return (
        <div className="border-y border-gray-800 bg-gray-950/50 overflow-hidden py-3">
            <div className="flex animate-ticker gap-8 w-max">
                {items.map((coin, i) => {
                    const live   = ticks[coin.symbol.toLowerCase()]
                    const price  = live?.price    ?? coin.currentPrice
                    const pct    = live?.change24h ?? coin.priceChangePercentage24h
                    const isUp   = pct >= 0
                    return (
                        <div key={`${coin.id}-${i}`} className="flex items-center gap-2 shrink-0">
                            <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                            <span className="text-xs font-semibold text-gray-300 uppercase">{coin.symbol}</span>
                            <span className="text-xs text-white font-mono">{formatUSD(price)}</span>
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
        queryKey: ['crypto', 'top', 5],
        queryFn: () => getTopCryptos(5),
        staleTime: 1000 * 60 * 2,
    })

    // Read live prices from store (populated by MarketTicker's WS above)
    const { ticks } = useLivePriceStore()

    const btc = coins?.find(c => c.id === 'bitcoin')
    const eth = coins?.find(c => c.id === 'ethereum')

    const btcPrice  = ticks['btc']?.price    ?? btc?.currentPrice
    const btcChange = ticks['btc']?.change24h ?? btc?.priceChangePercentage24h ?? 0
    const ethPrice  = ticks['eth']?.price    ?? eth?.currentPrice
    const ethChange = ticks['eth']?.change24h ?? eth?.priceChangePercentage24h ?? 0

    return (
        <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-16 px-6 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-800/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,#030712_100%)]" />
            </div>

            <div className="relative max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left */}
                    <div>
                        <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-600/20 rounded-full px-4 py-1.5 mb-6">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs text-indigo-400 font-medium">Live market data</span>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                            Theo dõi crypto
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                                thông minh hơn
                            </span>
                        </h1>

                        <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-md">
                            Quản lý danh mục đầu tư crypto, theo dõi P&L real-time, và phân tích thị trường — tất cả trong một nơi.
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <Link
                                to="/register"
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
                            >
                                Bắt đầu miễn phí <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/market"
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-gray-700 text-white font-semibold rounded-xl transition"
                            >
                                Xem thị trường
                            </Link>
                        </div>

                        {/* Stats bar */}
                        <div className="flex flex-wrap items-center gap-5 pt-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Users size={14} className="text-indigo-500" />
                                <span><span className="text-gray-300 font-semibold">10,000+</span> users</span>
                            </div>
                            <div className="w-px h-4 bg-gray-800" />
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <DollarSign size={14} className="text-emerald-500" />
                                <span><span className="text-gray-300 font-semibold">$50M+</span> tracked</span>
                            </div>
                            <div className="w-px h-4 bg-gray-800" />
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Layers size={14} className="text-amber-500" />
                                <span><span className="text-gray-300 font-semibold">100+</span> coins</span>
                            </div>
                        </div>
                    </div>

                    {/* Right — Price cards */}
                    <div className="space-y-3">
                        {/* BTC Card */}
                        {btc && (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <img src={btc.image} alt="Bitcoin" className="w-10 h-10 rounded-full" />
                                        <div>
                                            <p className="font-semibold text-white">Bitcoin</p>
                                            <p className="text-xs text-gray-500">BTC</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full',
                                        btcChange >= 0
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400'
                                    )}>
                                        {btcChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        {formatPct(btcChange)}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-white font-mono">
                                    {btcPrice ? formatUSD(btcPrice) : '—'}
                                </p>
                            </div>
                        )}

                        {/* ETH Card */}
                        {eth && (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <img src={eth.image} alt="Ethereum" className="w-10 h-10 rounded-full" />
                                        <div>
                                            <p className="font-semibold text-white">Ethereum</p>
                                            <p className="text-xs text-gray-500">ETH</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full',
                                        ethChange >= 0
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400'
                                    )}>
                                        {ethChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        {formatPct(ethChange)}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-white font-mono">
                                    {ethPrice ? formatUSD(ethPrice) : '—'}
                                </p>
                            </div>
                        )}

                        {/* Top 3 mini */}
                        <div className="grid grid-cols-3 gap-3">
                            {coins?.slice(2, 5).map((coin) => (
                                <div key={coin.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition">
                                    <div className="flex items-center gap-2 mb-2">
                                        <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                                        <span className="text-xs font-medium text-gray-400 uppercase">{coin.symbol}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white font-mono">{formatUSD(coin.currentPrice)}</p>
                                    <p className={cn(
                                        'text-xs font-medium mt-0.5',
                                        coin.priceChangePercentage24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {formatPct(coin.priceChangePercentage24h)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ─── Top Coins Table ───────────────────────────────────────────────────────────
function TopCoinsSection() {
    const navigate = useNavigate()
    const { data: coins, isLoading } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 2,
    })

    return (
        <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Top thị trường</h2>
                        <p className="text-gray-500 text-sm">Giá cập nhật real-time từ CoinGecko</p>
                    </div>
                    <Link to="/market" className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition font-medium">
                        Xem tất cả <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    {isLoading ? (
                        <div className="space-y-0 divide-y divide-gray-800">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-6 py-4">
                                    <div className="w-6 h-3 bg-gray-800 animate-pulse rounded" />
                                    <div className="w-8 h-8 bg-gray-800 animate-pulse rounded-full" />
                                    <div className="w-32 h-3 bg-gray-800 animate-pulse rounded" />
                                    <div className="ml-auto w-24 h-3 bg-gray-800 animate-pulse rounded" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {coins?.slice(0, 10).map((coin, index) => (
                                <div
                                    key={coin.id}
                                    onClick={() => navigate(`/market/${coin.id}`)}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/50 transition cursor-pointer group"
                                >
                                    <span className="text-xs text-gray-600 w-5 font-mono">{index + 1}</span>
                                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                                    <div className="flex-1">
                                        <span className="font-semibold text-white text-sm">{coin.name}</span>
                                        <span className="text-gray-600 uppercase text-xs ml-2">{coin.symbol}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white text-sm font-mono">{formatUSD(coin.currentPrice)}</p>
                                        <p className={cn(
                                            'text-xs font-medium font-mono',
                                            coin.priceChangePercentage24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        )}>
                                            {formatPct(coin.priceChangePercentage24h)}
                                        </p>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-700 group-hover:text-gray-400 transition ml-2" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

// ─── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
    const features = [
        {
            icon: <BarChart2 size={22} className="text-indigo-400" />,
            title: 'Portfolio real-time',
            desc: 'Theo dõi tổng giá trị, P&L và phân bổ danh mục theo thời gian thực.',
        },
        {
            icon: <TrendingUp size={22} className="text-emerald-400" />,
            title: 'Candlestick chart',
            desc: 'Biểu đồ nến chuyên nghiệp với nhiều khung thời gian từ 1 ngày đến 3 tháng.',
        },
        {
            icon: <Shield size={22} className="text-indigo-400" />,
            title: 'Bảo mật JWT',
            desc: 'Xác thực an toàn với JWT token, refresh token tự động.',
        },
        {
            icon: <Zap size={22} className="text-amber-400" />,
            title: 'Quản lý đa ví',
            desc: 'Tạo nhiều ví khác nhau, theo dõi holdings và giao dịch từng ví.',
        },
    ]

    return (
        <section id="features" className="py-20 px-6 border-t border-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-3">Tính năng nổi bật</h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Mọi thứ bạn cần để theo dõi và quản lý danh mục crypto hiệu quả.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/30 transition group"
                        >
                            <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ─── CTA Footer ────────────────────────────────────────────────────────────────
function CTASection() {
    return (
        <section className="py-24 px-6">
            <div className="max-w-2xl mx-auto text-center">
                <div className="relative bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-600/30 rounded-3xl px-8 py-16 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
                    </div>
                    <div className="relative">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            Bắt đầu theo dõi crypto ngay hôm nay
                        </h2>
                        <p className="text-gray-400 mb-8">
                            Miễn phí hoàn toàn. Không cần thẻ tín dụng.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link
                                to="/register"
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
                            >
                                Tạo tài khoản miễn phí <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/market"
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-gray-700 text-white font-semibold rounded-xl transition"
                            >
                                Xem thị trường
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="border-t border-gray-800 px-6 py-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 rounded-lg p-1">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-500 text-sm font-medium">CryptoDash</span>
                </div>
                <p className="text-xs text-gray-700">
                    Dữ liệu từ CoinGecko API · Chỉ dành cho mục đích học tập
                </p>
            </div>
        </footer>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function LandingPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Header />
            <MarketTicker />
            <Hero />
            <TopCoinsSection />
            <FeaturesSection />
            <CTASection />
            <Footer />
        </div>
    )
}
