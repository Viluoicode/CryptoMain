// src/pages/MarketPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Search, TrendingUp, TrendingDown, ChevronRight,
    ChevronUp, ChevronDown, ChevronsUpDown,
    Star, RefreshCw, Wifi, WifiOff, Flame,
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

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// 7 pairs that are tradeable on /trade
const FUTURES_COINS = new Set(['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'cardano', 'dogecoin'])

// Simple category mapping by symbol — heuristic, no backend needed
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

// ─── Sparkline (mini SVG chart) ────────────────────────────────────────────────
function Sparkline({ data, positive }: { data?: number[] | null; positive: boolean }) {
    if (!data || data.length < 2) {
        return <div className="w-24 h-8 opacity-30 text-xs text-gray-600 flex items-center justify-end">—</div>
    }
    // Downsample to 30 points if larger
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
    const fill = positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'
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

// ─── Highlight card (Gainers / Losers / Volume) ───────────────────────────────
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
    const headerBg =
        accent === 'green' ? 'bg-gradient-to-r from-emerald-900/40 via-emerald-900/20 to-transparent border-emerald-800/40'
      : accent === 'red'   ? 'bg-gradient-to-r from-red-900/40 via-red-900/20 to-transparent border-red-800/40'
                           : 'bg-gradient-to-r from-amber-900/40 via-amber-900/20 to-transparent border-amber-800/40'
    const accentText =
        accent === 'green' ? 'text-emerald-400'
      : accent === 'red'   ? 'text-red-400'
                           : 'text-amber-400'

    return (
        <div className="group bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition">
            <div className={cn('flex items-center justify-between px-4 py-3 border-b', headerBg)}>
                <div className="flex items-center gap-2">
                    <span className={accentText}>{icon}</span>
                    <span className="text-sm font-semibold text-white">{title}</span>
                </div>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 transition" />
            </div>
            <div className="divide-y divide-gray-800/60">
                {items.map(coin => {
                    const display =
                        type === 'volume'
                            ? formatMarketCap(coin.totalVolume)
                            : formatPct(coin.priceChangePercentage24h)
                    return (
                        <button
                            key={coin.id}
                            onClick={() => onClickItem(coin.id)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/40 transition text-left"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img src={coin.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
                                <span className="text-sm font-medium text-white truncate uppercase">
                                    {coin.symbol}USDT
                                </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-mono text-gray-300">
                                    {formatUSD(coin.currentPrice, coin.currentPrice >= 1 ? 2 : 6)}
                                </span>
                                <span className={cn('text-xs font-semibold font-mono w-20 text-right', accentText)}>
                                    {display}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Live status badge ────────────────────────────────────────────────────────
function LiveBadge({ connected }: { connected: boolean }) {
    return (
        <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-500',
            connected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-gray-800 border-gray-700 text-gray-500',
        )}>
            {connected ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <Wifi size={11} />LIVE
                </>
            ) : (<><WifiOff size={11} />Offline</>)}
        </div>
    )
}

// ─── Sort column header ───────────────────────────────────────────────────────
function SortTh({ col, label, sortKey, sortDir, onSort, align = 'right' }: {
    col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir
    onSort: (col: SortKey) => void; align?: 'left' | 'right'
}) {
    const active = col === sortKey
    return (
        <th
            className={cn('px-4 py-3 cursor-pointer select-none', align === 'right' ? 'text-right' : 'text-left')}
            onClick={() => onSort(col)}
        >
            <div className={cn('inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors', active ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300')}>
                {label}
                {active
                    ? sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    : <ChevronsUpDown size={12} className="opacity-40" />
                }
            </div>
        </th>
    )
}

// ─── Coin row ─────────────────────────────────────────────────────────────────
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
    }, [liveTick?.price]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <tr
            onClick={onClick}
            className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors duration-150 cursor-pointer group"
        >
            {/* Watch + Coin */}
            <td className="pl-4 py-3">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onToggleWatch}
                        title={isWatched ? 'Bỏ theo dõi' : 'Thêm watchlist'}
                        className="p-1 rounded hover:bg-amber-500/10 transition"
                    >
                        <Star
                            size={13}
                            className={cn(isWatched ? 'text-amber-400 fill-amber-400' : 'text-gray-600 group-hover:text-gray-400')}
                        />
                    </button>
                    <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-semibold text-white text-sm uppercase">{coin.symbol}</span>
                            <span className="text-gray-500 text-xs">USDT</span>
                        </div>
                        <span className="text-[11px] text-gray-500 truncate block">{coin.name}</span>
                    </div>
                </div>
            </td>

            {/* Price */}
            <td className={cn(
                'px-4 py-3 text-right font-mono text-sm font-semibold transition-colors duration-500',
                flash === 'up'   ? 'text-emerald-300 bg-emerald-500/10' :
                flash === 'down' ? 'text-red-300 bg-red-500/10' :
                'text-white',
            )}>
                {formatUSD(price, price >= 1 ? 2 : 6)}
            </td>

            {/* 24h % */}
            <td className="px-4 py-3 text-right">
                <span className={cn(
                    'inline-block text-xs font-semibold font-mono px-2 py-0.5 rounded',
                    pos ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10',
                )}>
                    {formatPct(change24h)}
                </span>
            </td>

            {/* Low / High */}
            <td className="px-4 py-3 text-right text-xs font-mono text-gray-400">
                <div>{formatUSD(low24h, low24h >= 1 ? 2 : 6)}</div>
                <div className="text-gray-500 mt-0.5">{formatUSD(high24h, high24h >= 1 ? 2 : 6)}</div>
            </td>

            {/* Volume */}
            <td className="px-4 py-3 text-right text-sm text-gray-400 font-mono">
                {formatMarketCap(coin.totalVolume)}
            </td>

            {/* Sparkline */}
            <td className="px-4 py-3">
                <Sparkline data={coin.sparkline7d} positive={pos} />
            </td>

            {/* Action */}
            <td className="pr-4 py-3">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick() }}
                        className="text-xs text-gray-400 hover:text-white px-2.5 py-1 transition"
                    >
                        Details
                    </button>
                    <button
                        onClick={onTrade}
                        disabled={!canTrade}
                        title={canTrade ? 'Trade' : 'Coin chưa hỗ trợ trading'}
                        className={cn(
                            'text-xs font-semibold px-3 py-1.5 rounded-lg transition',
                            canTrade
                                ? 'bg-gray-800 hover:bg-indigo-600 text-white border border-gray-700 hover:border-indigo-600'
                                : 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed',
                        )}
                    >
                        Trade
                    </button>
                </div>
            </td>
        </tr>
    )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                    <td className="pl-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 bg-gray-800 animate-pulse rounded" />
                            <div className="w-7 h-7 bg-gray-800 animate-pulse rounded-full" />
                            <div className="w-20 h-3 bg-gray-800 animate-pulse rounded" />
                        </div>
                    </td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-14 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-24 h-8 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="pr-4 py-3"><div className="w-20 h-7 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                </tr>
            ))}
        </>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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

    // ── Highlight cards data — always from full list ───────────────────────────
    const highlights = useMemo(() => {
        if (!coins) return { gainers: [], losers: [], volume: [] }
        const sortedByChange = [...coins].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
        return {
            gainers: sortedByChange.slice(0, 3),
            losers:  sortedByChange.slice(-3).reverse(),
            volume:  [...coins].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3),
        }
    }, [coins])

    // ── Main filtering ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!coins) return []
        // 1. Main tab filter
        let result: CryptoListResponse[]
        if (mainTab === 'favorites') {
            const watchedIds = new Set(watchlist.map(w => w.coinId))
            result = coins.filter(c => watchedIds.has(c.id))
        } else if (mainTab === 'futures') {
            result = coins.filter(c => FUTURES_COINS.has(c.id))
        } else {
            result = [...coins]
        }
        // 2. Sub-tab filter
        result = applySubFilter(result, subTab)
        // 3. Search
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
        }
        // 4. Sort
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
        <div className="space-y-5 max-w-7xl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Markets</h1>
                </div>
                <div className="flex items-center gap-3">
                    {!isLoading && <LiveBadge connected={connected} />}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-400 bg-gray-900 border border-gray-800 hover:border-indigo-500/40 px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
                        {isFetching ? 'Đang tải...' : 'Cập nhật'}
                    </button>
                </div>
            </div>

            {/* ── Category tabs (top) + Search ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-6 border-b border-gray-800 -mb-px">
                    {MAIN_TABS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setMainTab(id)}
                            className={cn(
                                'pb-3 text-sm font-medium transition border-b-2',
                                mainTab === id
                                    ? 'text-white border-indigo-500'
                                    : 'text-gray-500 hover:text-gray-300 border-transparent',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-56 pl-9 pr-8 py-2 bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-sm transition"
                        >✕</button>
                    )}
                </div>
            </div>

            {/* ── 3 Highlight cards ── */}
            {!isLoading && !isError && coins && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <HighlightCard
                        title="Gainers"
                        icon={<TrendingUp size={15} />}
                        accent="green"
                        items={highlights.gainers}
                        type="gain"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                    <HighlightCard
                        title="Top losers"
                        icon={<TrendingDown size={15} />}
                        accent="red"
                        items={highlights.losers}
                        type="loss"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                    <HighlightCard
                        title="Top volume"
                        icon={<Flame size={15} />}
                        accent="gold"
                        items={highlights.volume}
                        type="volume"
                        onClickItem={(id) => navigate(`/market/${id}`)}
                    />
                </div>
            )}

            {/* ── Sub-tabs ── */}
            <div className="flex items-center gap-1 flex-wrap bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit">
                {SUB_TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setSubTab(id)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                            subTab === id
                                ? 'bg-gray-800 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Table ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {isError ? (
                    <div className="py-16 text-center">
                        <p className="text-red-400 text-sm mb-3">Không thể tải dữ liệu thị trường.</p>
                        <button onClick={() => refetch()} className="text-xs text-indigo-400 hover:text-indigo-300 underline transition">
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 bg-gray-950/40">
                                    <th className="pl-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                                    <SortTh col="currentPrice"             label="Price"      {...sortProps} />
                                    <SortTh col="priceChangePercentage24h" label="24h Change" {...sortProps} />
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">24h Low / High</th>
                                    <SortTh col="totalVolume"              label="24h Volume" {...sortProps} />
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Market Trends</th>
                                    <th className="pr-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Operation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <SkeletonRows />
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={28} className="text-gray-700" />
                                                <p className="text-gray-400 text-sm font-medium">
                                                    {mainTab === 'favorites' && watchlist.length === 0
                                                        ? 'Chưa có coin nào trong Favorites. Bấm ⭐ để thêm.'
                                                        : search
                                                            ? `Không tìm thấy "${search}"`
                                                            : 'Không có coin nào trong filter này'}
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
                <p className="text-xs text-center text-gray-600">
                    {filtered.length} / {coins?.length ?? 0} coin
                    {connected && (
                        <span className="ml-2 text-emerald-600">· giá cập nhật realtime từ Binance</span>
                    )}
                </p>
            )}
        </div>
    )
}
