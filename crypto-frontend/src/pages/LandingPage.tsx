// src/pages/LandingPage.tsx — Exchange-style landing (Web3/DeFi modern feel)
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
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
                ? 'bg-navy-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-glass'
                : 'bg-transparent'
        )}>
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-accent-gradient rounded-xl blur-md opacity-45 group-hover:opacity-70 transition" />
                        <div className="relative bg-gradient-to-br from-accent-cyan to-accent-purple rounded-xl p-2">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <span className="text-white text-base font-bold tracking-tight">CryptoDash</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    <Link to="/market" className="text-sm font-semibold text-gray-400 hover:text-white transition">Markets</Link>
                    <Link to="/leaderboard" className="text-sm font-semibold text-gray-400 hover:text-white transition">Leaderboard</Link>
                    <a href="#features" className="text-sm font-semibold text-gray-400 hover:text-white transition">Features</a>
                    <a href="#trade" className="text-sm font-semibold text-gray-400 hover:text-white transition">Trade</a>
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated ? (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => navigate('/dashboard')}
                        >
                            Dashboard <ArrowRight size={14} />
                        </Button>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-semibold text-gray-400 hover:text-white transition px-3 py-2">
                                Log In
                            </Link>
                            <Link to="/register">
                                <Button variant="primary" size="md">
                                    Sign Up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-400 hover:text-white">
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-navy-950/95 border-t border-white/[0.06] px-6 py-4 space-y-3">
                    <Link to="/market" className="block text-sm font-semibold text-gray-400 hover:text-white py-2">Markets</Link>
                    <Link to="/leaderboard" className="block text-sm font-semibold text-gray-400 hover:text-white py-2">Leaderboard</Link>
                    <Link to="/login" className="block text-sm font-semibold text-gray-400 hover:text-white py-2">Log In</Link>
                    <Link to="/register" className="block">
                        <Button variant="primary" size="md" className="w-full">
                            Sign Up
                        </Button>
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
        <div className="relative border-y border-white/[0.04] bg-navy-950/40 backdrop-blur-sm overflow-hidden py-3">
            <div className="flex animate-ticker gap-10 w-max">
                {items.map((coin, i) => {
                    const live   = ticks[coin.symbol.toLowerCase()]
                    const price  = live?.price    ?? coin.currentPrice
                    const pct    = live?.change24h ?? coin.priceChangePercentage24h
                    const isUp   = pct >= 0
                    return (
                        <div key={`${coin.id}-${i}`} className="flex items-center gap-2 shrink-0">
                            <img src={coin.image} alt="" loading="lazy" decoding="async" className="w-5 h-5 rounded-full shrink-0" />
                            <span className="text-xs font-semibold text-gray-400 uppercase">{coin.symbol}</span>
                            <span className="text-xs text-white font-mono font-medium">{formatUSD(price, price >= 1 ? 2 : 6)}</span>
                            <span className={cn('text-xs font-semibold font-mono', isUp ? 'text-profit' : 'text-loss')}>
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
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-cyan/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0e1a_80%)]" />
                {/* Grid overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Left side */}
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 border border-accent-cyan/20 rounded-full px-3 py-1.5 mb-7">
                            <Sparkles size={12} className="text-accent-cyan" />
                            <span className="text-xs text-cyan-300 font-medium">Demo Simulator · Live Binance Data</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
                            Learn Trading
                            <span className="block mt-2 bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
                                Without Risk
                            </span>
                        </h1>

                        <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
                            Next-gen crypto portfolio simulator. Thực hành trading chuyên nghiệp với <span className="text-white font-semibold">Spot &amp; Futures trading, margin positions</span>, dynamic order books và on-chain tracking.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-12">
                            <Link to="/register">
                                <Button variant="primary" size="lg" className="px-8 shadow-glow">
                                    Start Trading <ArrowRight size={16} />
                                </Button>
                            </Link>
                            <Link to="/market">
                                <Button variant="outline" size="lg" className="px-8">
                                    Explore Markets
                                </Button>
                            </Link>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/[0.06] max-w-md">
                            <div>
                                <div className="text-2xl font-bold text-white font-mono">100+</div>
                                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Assets</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white font-mono">24/7</div>
                                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Real-Time</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white font-mono">$10K</div>
                                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Demo Balance</div>
                            </div>
                        </div>
                    </div>

                    {/* Right side — BTC Card */}
                    <div className="lg:col-span-5">
                        <div className="relative">
                            <div className="absolute -inset-1.5 bg-gradient-to-r from-accent-cyan/30 to-accent-purple/30 rounded-3xl blur-2xl opacity-60" />
                            <Card className="p-7 relative" glow>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        {btc && <img src={btc.image} alt="" className="w-11 h-11 rounded-full shrink-0" />}
                                        <div>
                                            <div className="text-base font-bold text-white leading-tight">BTC/USDT</div>
                                            <div className="text-xs text-gray-500">Bitcoin · Spot</div>
                                        </div>
                                    </div>
                                    <Badge variant="success" dot>LIVE</Badge>
                                </div>

                                <div className="mb-4">
                                    <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight leading-none">
                                        {btcPrice ? formatUSD(btcPrice) : '—'}
                                    </div>
                                    <div className={cn(
                                        'flex items-center gap-1.5 mt-2.5 text-sm font-semibold font-mono',
                                        btcChange >= 0 ? 'text-profit' : 'text-loss',
                                    )}>
                                        {btcChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {formatPct(btcChange)} (24h)
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-3.5">
                                    {coins?.slice(1, 4).map(coin => {
                                        const live   = ticks[coin.symbol.toLowerCase()]
                                        const price  = live?.price ?? coin.currentPrice
                                        const change = live?.change24h ?? coin.priceChangePercentage24h
                                        return (
                                            <div key={coin.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <img src={coin.image} alt="" className="w-6 h-6 rounded-full" />
                                                    <span className="text-sm font-semibold text-gray-300 uppercase">{coin.symbol}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-white font-mono">{formatUSD(price, price >= 1 ? 2 : 4)}</span>
                                                    <span className={cn(
                                                        'text-xs font-semibold font-mono w-16 text-right',
                                                        change >= 0 ? 'text-profit' : 'text-loss',
                                                    )}>
                                                        {formatPct(change)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <Link to="/market" className="block mt-6">
                                    <Button variant="outline" size="sm" className="w-full">
                                        View all markets <ChevronRight size={14} />
                                    </Button>
                                </Link>
                            </Card>
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
                <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <div className="text-xs font-bold tracking-widest text-accent-cyan uppercase mb-2">Live Markets</div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Top Trading Assets</h2>
                    </div>
                    <Link to="/market" className="text-sm text-accent-cyan hover:text-accent-cyan/80 transition font-semibold flex items-center gap-1">
                        View all markets <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-navy-950/40">
                                    <th className="pl-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">24h Change</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Volume</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Market Cap</th>
                                    <th className="pr-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-white/[0.04]">
                                            <td className="pl-6 py-5"><div className="w-3 h-3 bg-gray-800 animate-pulse rounded" /></td>
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-gray-800 animate-pulse rounded-full" />
                                                    <div className="w-24 h-3 bg-gray-800 animate-pulse rounded" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-5"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-5"><div className="w-14 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-5 hidden md:table-cell"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="px-4 py-5 hidden lg:table-cell"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                                            <td className="pr-6 py-5" />
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
                                                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition cursor-pointer group"
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
                                                        pos ? 'text-profit' : 'text-loss',
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
                                                    >
                                                        <Button variant="outline" size="sm">
                                                            Trade
                                                        </Button>
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
        <section id="trade" className="relative py-24 px-6 border-t border-white/[0.06] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-purple/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="text-xs font-bold tracking-widest text-accent-cyan uppercase mb-2">Pro Tools</div>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Built for Serious Traders</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-base">
                        Advanced charts, real-time order books, conditional orders và margin positions — mọi thứ bạn cần để thực hành trading.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FeatureCard
                        icon={<BarChart3 className="text-accent-cyan" size={20} />}
                        title="Advanced Charts"
                        desc="KLineChart với EMA, RSI, MACD, Bollinger Bands. 9 drawing tools cho technical analysis."
                        accent="cyan"
                    />
                    <FeatureCard
                        icon={<Zap className="text-accent-purple" size={20} />}
                        title="Real-time Order Book"
                        desc="Depth-of-market 20 levels, recent trades stream, depth chart visualization."
                        accent="purple"
                    />
                    <FeatureCard
                        icon={<Activity className="text-emerald-400" size={20} />}
                        title="Margin Positions"
                        desc="Long/Short với leverage 1-100x. Stop-loss, take-profit, auto-liquidation."
                        accent="emerald"
                    />
                    <FeatureCard
                        icon={<Wallet className="text-blue-400" size={20} />}
                        title="Multi-Wallet Portfolio"
                        desc="Quản lý nhiều ví khác nhau, theo dõi holdings và P&L real-time."
                        accent="blue"
                    />
                    <FeatureCard
                        icon={<Globe className="text-cyan-400" size={20} />}
                        title="On-Chain Tracking"
                        desc="Track external EVM wallets qua MetaMask. Hỗ trợ Ethereum, BSC, Polygon, Arbitrum."
                        accent="cyan"
                    />
                    <FeatureCard
                        icon={<Shield className="text-pink-400" size={20} />}
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
    accent: 'cyan' | 'purple' | 'emerald' | 'blue' | 'pink'
}) {
    const borderGlows = {
        cyan:    'hover:border-accent-cyan/30 hover:shadow-glow',
        purple:  'hover:border-accent-purple/30 hover:shadow-glow-purple',
        emerald: 'hover:border-emerald-500/30 hover:shadow-glow-profit',
        blue:    'hover:border-blue-500/30 hover:shadow-glow',
        pink:    'hover:border-pink-500/30 hover:shadow-glow-loss',
    }

    return (
        <Card className={cn('p-6 transition-all duration-300 hover:-translate-y-1', borderGlows[accent])}>
            <div className="w-11 h-11 bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center justify-center mb-4 transition-transform">
                {icon}
            </div>
            <CardTitle className="text-lg font-bold mb-2">{title}</CardTitle>
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </Card>
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
        <section id="features" className="relative py-20 px-6 border-t border-white/[0.06]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="text-xs font-bold tracking-widest text-accent-cyan uppercase mb-2">Get Started</div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Simple 4-Step Process</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((s, i) => (
                        <Card key={i} className="relative p-6 hover:border-accent-cyan/30 transition-all duration-300">
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-700 to-gray-800 mb-3 font-mono">
                                {s.n}
                            </div>
                            <CardTitle className="text-base font-bold mb-2">{s.title}</CardTitle>
                            <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                        </Card>
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
        <section className="py-20 px-6 border-t border-white/[0.06]">
            <div className="max-w-5xl mx-auto">
                <div className="relative bg-gradient-to-br from-accent-cyan/10 via-accent-purple/10 to-transparent border border-white/[0.06] rounded-3xl px-8 md:px-16 py-16 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-accent-cyan/5 rounded-full blur-3xl" />
                    </div>
                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                                Start Trading
                                <span className="block bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
                                    Like a Pro Today
                                </span>
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Tham gia cộng đồng traders đang dùng CryptoDash để học và thử nghiệm strategies.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link to="/register">
                                    <Button variant="primary" size="lg" className="px-6 shadow-glow">
                                        Sign Up Free <ArrowRight size={16} />
                                    </Button>
                                </Link>
                                <Link to="/leaderboard">
                                    <Button variant="outline" size="lg" className="px-6">
                                        Leaderboard
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-accent-cyan shrink-0 mt-0.5" />
                                    <span className="text-gray-200 text-sm font-semibold">{b}</span>
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
        <footer className="border-t border-white/[0.06] px-6 py-12 bg-navy-950/60">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="bg-gradient-to-br from-accent-cyan to-accent-purple rounded-lg p-1.5">
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

                <div className="pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-gray-650">
                        © 2026 CryptoDash · Built with React + .NET 9 · Data from CoinGecko & Binance
                    </p>
                    <p className="text-xs text-gray-650">
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
            <div className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{title}</div>
            <ul className="space-y-2.5">
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
        <div className="min-h-screen bg-navy-900 text-white selection:bg-accent-cyan/30 selection:text-cyan-100">
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
