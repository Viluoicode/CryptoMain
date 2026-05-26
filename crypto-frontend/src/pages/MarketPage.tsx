// src/pages/MarketPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Search, TrendingUp, TrendingDown, ChevronRight,
    ChevronUp, ChevronDown, ChevronsUpDown,
    Star, RefreshCw, Flame,
} from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { CryptoListResponse } from '@/types'
import type { LiveTick } from '@/store/livePriceStore'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'

type SortKey = 'marketCap' | 'currentPrice' | 'priceChangePercentage24h' | 'totalVolume'
type SortDir = 'asc' | 'desc'
type MainTab = 'favorites' | 'spot' | 'futures'
type SubTab = 'all' | 'new' | 'meme' | 'layer' | 'rwa' | 'defi'

const MAIN_TABS: { id: MainTab; label: string }[] = [
    { id: 'favorites', label: 'Favorites' },
    { id: 'spot',      label: 'Spot' },
    { id: 'futures',   label: 'Futures' },
]

const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'all',   label: 'All' },
    { id: 'new',   label: 'New' },
    { id: 'meme',  label: 'MEME' },
    { id: 'rwa',   label: 'RWA' },
    { id: 'layer', label: 'Layer 1/2' },
    { id: 'defi',  label: 'DeFi' },
]

const FUTURES_COINS = new Set(['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'cardano', 'dogecoin'])
const MEME_COINS  = new Set(['doge', 'shib', 'pepe', 'wif', 'bonk', 'floki', 'trump', 'mog', 'memecoin'])
const RWA_COINS   = new Set(['ondo', 'pendle', 'mkr', 'rsr', 'rwa', 'plume'])
const LAYER_COINS = new Set(['btc', 'eth', 'sol', 'bnb', 'avax', 'matic', 'pol', 'arb', 'op', 'sui', 'apt', 'near', 'atom', 'dot', 'ada', 'icp', 'tia', 'sei', 'inj', 'stx', 'base', 'mantle', 'mnt'])
const DEFI_COINS  = new Set(['uni', 'aave', 'cake', 'comp', 'crv', 'lido', 'ldo', 'sushi', 'snx', 'gmx', 'rune', 'inj', 'pendle', 'jup', 'jto'])

function applySubFilter(coins: CryptoListResponse[], sub: SubTab): CryptoListResponse[] {
    if (sub === 'all') return coins
    if (sub === 'new') return coins.slice().sort((a, b) => b.totalVolume / Math.max(b.marketCap, 1) - a.totalVolume / Math.max(a.marketCap, 1)).slice(0, 30)
    const set =
        sub === 'meme'  ? MEME_COINS :
        sub === 'rwa'   ? RWA_COINS :
        sub === 'layer' ? LAYER_COINS :
        DEFI_COINS
    return coins.filter(c => set.has(c.symbol.toLowerCase()))
}

function Sparkline({ data, positive }: { data?: number[] | null; positive: boolean }) {
    if (!data || data.length < 2) {
        return <div className="w-24 h-8 opacity-30 text-xs text-gray-500 flex items-center justify-end font-semibold">—</div>
    }
    const points = data.length > 30
        ? Array.from({ length: 30 }, (_, i) => data[Math.floor(i * data.length / 30)])
        : data

    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const w = 96
    const h = 32
    const path = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w
        const y = h - ((p - min) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    const stroke = positive ? '#10b981' : '#ef4444'
    const fill = positive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
    const lastX = w
    const lastY = h - ((points[points.length - 1] - min) / range) * h

    return (
        <svg width={w} height={h} className="ml-auto" aria-hidden>
            <path d={`${path} L${w},${h} L0,${h} Z`} fill={fill} />
            <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
            <circle cx={lastX} cy={lastY} r="1.6" fill={stroke} />
        </svg>
    )
}

function HighlightCard({
    title, icon, items, accent, onClickItem, type,
}: {
    title: string
    icon: React.ReactNode
    items: CryptoListResponse[]
    accent: 'green' | 'red' | 'gold'
    onClickItem: (id: string) => void
    type: 'gain' | 'loss' | 'volume'
}) {
    const glowClass =
        accent === 'green' ? 'hover:border-emerald-500/20 hover:shadow-glow-profit' :
        accent === 'red' ? 'hover:border-red-500/20 hover:shadow-glow-loss' :
        'hover:border-amber-500/20 hover:shadow-glow'

    const accentText =
        accent === 'green' ? 'text-profit' :
        accent === 'red' ? 'text-loss' :
        'text-amber-400'

    return (
        <Card className={cn('p-0 overflow-hidden transition-all duration-300', glowClass)}>
            <CardHeader className="px-4 py-3 border-b border-white/[0.06] mb-0 bg-white/[0.01]">
                <CardTitle icon={icon} className="text-sm font-semibold text-white">
                    {title}
                </CardTitle>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300" />
            </CardHeader>
            <div className="divide-y divide-white/[0.04]">
                {items.map(coin => {
                    const display =
                        type === 'volume'
                            ? formatMarketCap(coin.totalVolume)
                            : formatPct(coin.priceChangePercentage24h)
                    return (
                        <button
                            key={coin.id}
                            onClick={() => onClickItem(coin.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition text-left"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img src={coin.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
                                <span className="text-xs font-semibold text-gray-300 truncate uppercase">
                                    {coin.symbol}USDT
                                </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-semibold font-mono text-white">
                                    {formatUSD(coin.currentPrice, coin.currentPrice >= 1 ? 2 : 6)}
                                </span>
                                <span className={cn('text-xs font-bold font-mono w-20 text-right', accentText)}>
                                    {display}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </Card>
    )
}

function SortTh({ col, label, sortKey, sortDir, onSort, align = 'right' }: {
    col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir
    onSort: (col: SortKey) => void; align?: 'left' | 'right'
}) {
    const active = col === sortKey
    return (
        <th
            className={cn('px-4 py-3.5 cursor-pointer select-none', align === 'right' ? 'text-right' : 'text-left')}
            onClick={() => onSort(col)}
        >
            <div className={cn('inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors', active ? 'text-accent-cyan' : 'text-gray-500 hover:text-gray-350')}>
                {label}
                {active
                    ? sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    : <ChevronsUpDown size={12} className="opacity-40" />
                }
            </div>
        </th>
    )
}

function CoinRow({ coin, onClick, onTrade, isWatched, onToggleWatch, liveTick, canTrade }: {
    coin: CryptoListResponse
    onClick: () => void
    onTrade: (e: React.MouseEvent) => void
    isWatched: boolean
    onToggleWatch: (e: React.MouseEvent) => void
    liveTick?: LiveTick
    canTrade: boolean
}) {
    const price     = liveTick?.price     ?? coin.currentPrice
    const change24h = liveTick?.change24h ?? coin.priceChangePercentage24h
    const high24h   = liveTick?.high24h   ?? coin.high24h
    const low24h    = liveTick?.low24h    ?? coin.low24h
    const pos       = change24h >= 0

    const prevPriceRef = useRef<number>(price)
    const [flash, setFlash] = useState<'up' | 'down' | null>(null)

    useEffect(() => {
        if (!liveTick) return
        const prev = prevPriceRef.current
        if (liveTick.price === prev) return
        setFlash(liveTick.price > prev ? 'up' : 'down')
        prevPriceRef.current = liveTick.price
        const t = setTimeout(() => setFlash(null), 700)
        return () => clearTimeout(t)
    }, [liveTick?.price])

    return (
        <tr
            onClick={onClick}
            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition cursor-pointer group"
        >
            {/* Watch + Coin */}
            <td className="pl-4 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleWatch}
                        title={isWatched ? 'Bỏ theo dõi' : 'Thêm watchlist'}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 transition"
                    >
                        <Star
                            size={14}
                            className={cn(isWatched ? 'text-amber-400 fill-amber-400' : 'text-gray-600 group-hover:text-gray-400')}
                        />
                    </button>
                    <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-white text-sm uppercase">{coin.symbol}</span>
                            <span className="text-gray-500 text-[10px] font-semibold">USDT</span>
                        </div>
                        <span className="text-xs text-gray-500 truncate block -mt-0.5">{coin.name}</span>
                    </div>
                </div>
            </td>

            {/* Price */}
            <td className={cn(
                'px-4 py-4 text-right font-mono text-sm font-semibold transition-colors duration-500',
                flash === 'up'   ? 'text-emerald-400 bg-emerald-500/10' :
                flash === 'down' ? 'text-red-400 bg-red-500/10' :
                'text-white',
            )}>
                {formatUSD(price, price >= 1 ? 2 : 6)}
            </td>

            {/* 24h % */}
            <td className="px-4 py-4 text-right">
                <span className={cn(
                    'inline-flex items-center justify-center text-xs font-bold font-mono px-2 py-0.5 rounded-md border border-current/10',
                    pos ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10',
                )}>
                    {formatPct(change24h)}
                </span>
            </td>

            {/* Low / High */}
            <td className="px-4 py-4 text-right text-xs font-mono text-gray-400">
                <div>{formatUSD(low24h, low24h >= 1 ? 2 : 6)}</div>
                <div className="text-gray-500 mt-0.5">{formatUSD(high24h, high24h >= 1 ? 2 : 6)}</div>
            </td>

            {/* Volume */}
            <td className="px-4 py-4 text-right text-sm text-gray-405 font-mono">
                {formatMarketCap(coin.totalVolume)}
            </td>

            {/* Sparkline */}
            <td className="px-4 py-4">
                <Sparkline data={coin.sparkline7d} positive={pos} />
            </td>

            {/* Action */}
            <td className="pr-4 py-4">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick() }}
                        className="text-xs font-semibold text-gray-400 hover:text-white px-2.5 py-1.5 transition"
                    >
                        Details
                    </button>
                    <button
                        onClick={onTrade}
                        disabled={!canTrade}
                        title={canTrade ? 'Trade' : 'Coin chưa hỗ trợ trading'}
                        className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded-xl transition',
                            canTrade
                                ? 'bg-gradient-to-r from-accent-cyan to-accent-purple hover:shadow-glow text-white'
                                : 'bg-white/[0.04] text-gray-600 border border-white/[0.04] cursor-not-allowed',
                        )}
                    >
                        Trade
                    </button>
                </div>
            </td>
        </tr>
    )
}

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                    <td className="pl-4 py-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-4 h-4 rounded" />
                            <Skeleton className="w-7 h-7 rounded-full" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-2 w-16" />
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-4"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-12 rounded-md ml-auto" /></td>
                    <td className="px-4 py-4">
                        <div className="space-y-1.5 ml-auto w-16">
                            <Skeleton className="h-2.5 w-full" />
                            <Skeleton className="h-2 w-full" />
                        </div>
                    </td>
                    <td className="px-4 py-4"><Skeleton className="h-3 w-20 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-7 w-24 rounded-lg ml-auto" /></td>
                    <td className="pr-4 py-4"><Skeleton className="h-7 w-16 rounded-xl ml-auto" /></td>
                </tr>
            ))}
        </>
    )
}

export function MarketPage() {
    useDocumentTitle('Markets')
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const { isWatched, toggle, watchlist } = useWatchlist()
    const [search,  setSearch]  = useState('')
    const [mainTab, setMainTab] = useState<MainTab>('spot')
    const [subTab,  setSubTab]  = useState<SubTab>('all')
    const [sortKey, setSortKey] = useState<SortKey>('marketCap')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const { data: coins, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['crypto', 'top', 100],
        queryFn:  () => getTopCryptos(100),
        staleTime: 1000 * 60 * 2,
    })

    const symbols = useMemo(
        () => coins?.map(c => c.symbol.toLowerCase()) ?? [],
        [coins],
    )
    useBinanceWs(symbols)
    const { ticks, connected } = useLivePriceStore()

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const highlights = useMemo(() => {
        if (!coins) return { gainers: [], losers: [], volume: [] }
        const sortedByChange = [...coins].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
        return {
            gainers: sortedByChange.slice(0, 3),
            losers:  sortedByChange.slice(-3).reverse(),
            volume:  [...coins].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3),
        }
    }, [coins])

    const filtered = useMemo(() => {
        if (!coins) return []
        let result: CryptoListResponse[]
        if (mainTab === 'favorites') {
            const watchedIds = new Set(watchlist.map(w => w.coinId))
            result = coins.filter(c => watchedIds.has(c.id))
        } else if (mainTab === 'futures') {
            result = coins.filter(c => FUTURES_COINS.has(c.id))
        } else {
            result = [...coins]
        }
        result = applySubFilter(result, subTab)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
        }
        result.sort((a, b) => {
            const av = a[sortKey] as number
            const bv = b[sortKey] as number
            return sortDir === 'desc' ? bv - av : av - bv
        })
        return result
    }, [coins, mainTab, subTab, search, sortKey, sortDir, watchlist])

    const sortProps = { sortKey, sortDir, onSort: handleSort }

    function handleTrade(e: React.MouseEvent, coinId: string) {
        e.stopPropagation()
        if (!isAuthenticated) { navigate('/login'); return }
        if (FUTURES_COINS.has(coinId)) navigate('/trade')
        else navigate(`/market/${coinId}`)
    }

    return (
        <div className="space-y-6 max-w-7xl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Market Crypto</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time crypto asset tracking and analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isLoading && <Badge variant={connected ? 'success' : 'neutral'} dot>{connected ? 'Live Prices' : 'Offline'}</Badge>}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        loading={isFetching}
                    >
                        <RefreshCw size={12} className={cn(!isFetching && 'mr-1')} />
                        {!isFetching && 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* ── Category tabs + Search ── */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06]">
                <Tabs
                    tabs={MAIN_TABS}
                    active={mainTab}
                    onChange={(id) => setMainTab(id as MainTab)}
                />

                {/* Search */}
                <div className="relative pb-3">
                    <Search size={14} className="absolute left-3.5 top-[15px] text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64 pl-10 pr-8 py-2 bg-navy-800/60 backdrop-blur-sm border border-white/[0.08] text-white placeholder-gray-500 rounded-xl text-sm outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 transition-all duration-200"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-[15px] text-gray-500 hover:text-gray-300 text-xs transition"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ── 3 Highlight cards ── */}
            {!isLoading && !isError && coins && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <HighlightCard
                        title="Top Gainers"
                        icon={<TrendingUp size={14} />}
                        accent="green"
                        items={highlights.gainers}
                        type="gain"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                    <HighlightCard
                        title="Top Losers"
                        icon={<TrendingDown size={14} />}
                        accent="red"
                        items={highlights.losers}
                        type="loss"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                    <HighlightCard
                        title="Top Volume"
                        icon={<Flame size={14} />}
                        accent="gold"
                        items={highlights.volume}
                        type="volume"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                </div>
            )}

            {/* ── Sub-tabs ── */}
            <Tabs
                variant="pills"
                tabs={SUB_TABS}
                active={subTab}
                onChange={(id) => setSubTab(id as SubTab)}
            />

            {/* ── Table ── */}
            <div className="glass-card overflow-hidden">
                {isError ? (
                    <div className="py-16 text-center">
                        <p className="text-red-400 text-sm mb-3 font-semibold">Failed to fetch market data.</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            Try Again
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-navy-950/40">
                                    <th className="pl-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                                    <SortTh col="currentPrice"             label="Price"      {...sortProps} />
                                    <SortTh col="priceChangePercentage24h" label="24h Change" {...sortProps} />
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">24h Low / High</th>
                                    <SortTh col="totalVolume"              label="24h Volume" {...sortProps} />
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">7D Sparkline</th>
                                    <th className="pr-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <SkeletonRows />
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-gray-500">
                                                    <Search size={20} />
                                                </div>
                                                <p className="text-gray-400 text-sm font-semibold">
                                                    {mainTab === 'favorites' && watchlist.length === 0
                                                        ? 'No assets in your watchlist. Star an asset to add it here.'
                                                        : search
                                                            ? `No results found for "${search}"`
                                                            : 'No assets matching this filter'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((coin) => (
                                        <CoinRow
                                            key={coin.id}
                                            coin={coin}
                                            isWatched={isWatched(coin.id)}
                                            onToggleWatch={(e) => { e.stopPropagation(); toggle(coin.id, coin.symbol) }}
                                            onClick={() => navigate(`/market/${coin.id}`)}
                                            onTrade={(e) => handleTrade(e, coin.id)}
                                            canTrade={FUTURES_COINS.has(coin.id)}
                                            liveTick={ticks[coin.symbol.toLowerCase()]}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Footer count ── */}
            {!isLoading && !isError && (
                <p className="text-xs text-center text-gray-500 font-medium">
                    Showing {filtered.length} of {coins?.length ?? 0} assets
                    {connected && (
                        <span className="ml-1 text-emerald-500 font-semibold">· prices update in real-time</span>
                    )}
                </p>
            )}
        </div>
    )
}
