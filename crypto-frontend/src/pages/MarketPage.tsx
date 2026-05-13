// src/pages/MarketPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Search, TrendingUp, TrendingDown,
    ChevronUp, ChevronDown, ChevronsUpDown,
    Flame, BarChart3, Zap, Star, RefreshCw, Wifi, WifiOff,
} from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { useLivePriceStore } from '@/store/livePriceStore'
import type { CryptoListResponse } from '@/types'
import type { LiveTick } from '@/store/livePriceStore'

// ─── Types ─────────────────────────────────────────────────────────────────────
type SortKey = 'marketCap' | 'currentPrice' | 'priceChangePercentage24h' | 'totalVolume'
type SortDir = 'asc' | 'desc'
type TabId   = 'all' | 'gainers' | 'losers' | 'volume' | 'trending'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'all',      label: 'Tất cả',     icon: <BarChart3 size={13} /> },
    { id: 'gainers',  label: 'Tăng mạnh',  icon: <TrendingUp size={13} /> },
    { id: 'losers',   label: 'Giảm mạnh',  icon: <TrendingDown size={13} /> },
    { id: 'volume',   label: 'Volume cao',  icon: <Zap size={13} /> },
    { id: 'trending', label: 'Trending 🔥', icon: <Flame size={13} /> },
]

// ─── Logic helpers ─────────────────────────────────────────────────────────────
function trendingScore(c: CryptoListResponse): number {
    const priceScore  = Math.max(0, c.priceChangePercentage24h)
    const volumeRatio = c.marketCap > 0 ? c.totalVolume / c.marketCap : 0
    return priceScore * 0.6 + volumeRatio * 1000 * 0.4
}

function applyTab(coins: CryptoListResponse[], tab: TabId): {
    list: CryptoListResponse[]; defaultSort: SortKey; defaultDir: SortDir
} {
    switch (tab) {
        case 'gainers':
            return { list: coins.filter(c => c.priceChangePercentage24h > 0), defaultSort: 'priceChangePercentage24h', defaultDir: 'desc' }
        case 'losers':
            return { list: coins.filter(c => c.priceChangePercentage24h < 0), defaultSort: 'priceChangePercentage24h', defaultDir: 'asc' }
        case 'volume':
            return { list: [...coins].sort((a, b) => b.totalVolume - a.totalVolume), defaultSort: 'totalVolume', defaultDir: 'desc' }
        case 'trending': {
            const sorted = [...coins].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 30)
            return { list: sorted, defaultSort: 'priceChangePercentage24h', defaultDir: 'desc' }
        }
        default:
            return { list: coins, defaultSort: 'marketCap', defaultDir: 'desc' }
    }
}

// ─── Live status badge ─────────────────────────────────────────────────────────
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
                    <Wifi size={11} />
                    LIVE
                </>
            ) : (
                <>
                    <WifiOff size={11} />
                    Offline
                </>
            )}
        </div>
    )
}

// ─── Stats strip ───────────────────────────────────────────────────────────────
function StatsStrip({ coins }: { coins: CryptoListResponse[] }) {
    const gainers   = coins.filter(c => c.priceChangePercentage24h > 0).length
    const losers    = coins.filter(c => c.priceChangePercentage24h < 0).length
    const topGainer = [...coins].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)[0]
    const topLoser  = [...coins].sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)[0]

    return (
        <div className="flex flex-wrap gap-2">
            <Pill icon={<TrendingUp size={11} />} label="Tăng" value={String(gainers)} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
            <Pill icon={<TrendingDown size={11} />} label="Giảm" value={String(losers)} color="text-red-400" bg="bg-red-500/10 border-red-500/20" />
            {topGainer && (
                <Pill icon={<Flame size={11} />} label="Top tăng"
                    value={`${topGainer.symbol.toUpperCase()} ${formatPct(topGainer.priceChangePercentage24h)}`}
                    color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
            )}
            {topLoser && (
                <Pill icon={<TrendingDown size={11} />} label="Top giảm"
                    value={`${topLoser.symbol.toUpperCase()} ${formatPct(topLoser.priceChangePercentage24h)}`}
                    color="text-red-400" bg="bg-red-500/10 border-red-500/20" />
            )}
        </div>
    )
}

function Pill({ icon, label, value, color, bg }: {
    icon: React.ReactNode; label: string; value: string; color: string; bg: string
}) {
    return (
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border', bg, color)}>
            {icon}
            <span className="text-gray-500">{label}:</span>
            <span>{value}</span>
        </div>
    )
}

// ─── Sort column header ────────────────────────────────────────────────────────
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
                {align === 'right' && (active
                    ? sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    : <ChevronsUpDown size={12} className="opacity-40" />
                )}
                {label}
                {align === 'left' && (active
                    ? sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    : <ChevronsUpDown size={12} className="opacity-40" />
                )}
            </div>
        </th>
    )
}

// ─── Coin row (with live price flash) ─────────────────────────────────────────
function CoinRow({ coin, rank, onClick, isTrending, isWatched, onToggleWatch, liveTick }: {
    coin: CryptoListResponse
    rank: number
    onClick: () => void
    isTrending?: boolean
    isWatched: boolean
    onToggleWatch: (e: React.MouseEvent) => void
    liveTick?: LiveTick
}) {
    // Resolved values — live takes priority over CoinGecko snapshot
    const price     = liveTick?.price     ?? coin.currentPrice
    const change24h = liveTick?.change24h ?? coin.priceChangePercentage24h
    const isLive    = !!liveTick
    const pos       = change24h >= 0

    // ── Price flash effect ──────────────────────────────────────────────────────
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
    }, [liveTick?.price])   // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <tr
            onClick={onClick}
            className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors duration-150 cursor-pointer group"
        >
            {/* Rank */}
            <td className="pl-4 py-3 w-10 text-xs text-gray-600">
                {isTrending && rank <= 3
                    ? <span className="text-base leading-none">{'🥇🥈🥉'[rank - 1]}</span>
                    : rank}
            </td>

            {/* Coin */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shrink-0" />
                    <div>
                        <span className="font-medium text-white text-sm">{coin.name}</span>
                        <span className="text-gray-500 text-xs ml-2 uppercase">{coin.symbol}</span>
                    </div>
                </div>
            </td>

            {/* Price — flashes green/red on update */}
            <td className={cn(
                'px-4 py-3 text-right font-mono text-sm font-semibold transition-colors duration-500',
                flash === 'up'   ? 'text-emerald-300 bg-emerald-500/10' :
                flash === 'down' ? 'text-red-300 bg-red-500/10' :
                'text-white',
            )}>
                <div className="flex items-center justify-end gap-1.5">
                    {/* Tiny live dot — only when receiving Binance data */}
                    {isLive && !flash && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-70 shrink-0" />
                    )}
                    {formatUSD(price)}
                </div>
            </td>

            {/* 24h % */}
            <td className="px-4 py-3 text-right">
                <span className={cn('text-sm font-semibold font-mono', pos ? 'text-emerald-400' : 'text-red-400')}>
                    {formatPct(change24h)}
                </span>
            </td>

            {/* Market Cap */}
            <td className="px-4 py-3 text-right text-sm text-gray-400 font-mono">
                {formatMarketCap(coin.marketCap)}
            </td>

            {/* Volume */}
            <td className="px-4 py-3 text-right text-sm text-gray-400 font-mono">
                {formatMarketCap(coin.totalVolume)}
            </td>

            {/* Actions */}
            <td className="pr-4 py-3 w-16">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={onToggleWatch}
                        title={isWatched ? 'Bỏ theo dõi' : 'Thêm watchlist'}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors duration-150"
                    >
                        <Star
                            size={14}
                            className={cn(
                                'transition-all duration-150',
                                isWatched
                                    ? 'text-amber-400 fill-amber-400 scale-110'
                                    : 'text-gray-600 group-hover:text-gray-400',
                            )}
                        />
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
            {Array.from({ length: 15 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                    <td className="pl-4 py-3"><div className="w-4 h-3 bg-gray-800 animate-pulse rounded" /></td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-800 animate-pulse rounded-full" />
                            <div className="w-24 h-3 bg-gray-800 animate-pulse rounded" />
                        </div>
                    </td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-14 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-20 h-3 bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="pr-4 py-3" />
                </tr>
            ))}
        </>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function MarketPage() {
    const navigate = useNavigate()
    const { isWatched, toggle } = useWatchlist()
    const [search,  setSearch]  = useState('')
    const [tab,     setTab]     = useState<TabId>('all')
    const [sortKey, setSortKey] = useState<SortKey>('marketCap')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // ── CoinGecko query (snapshot, refreshes every 2 min) ─────────────────────
    const { data: coins, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['crypto', 'top', 100],
        queryFn:  () => getTopCryptos(100),
        staleTime: 1000 * 60 * 2,
    })

    // ── Binance WebSocket (real-time overlay) ─────────────────────────────────
    const symbols = useMemo(
        () => coins?.map(c => c.symbol.toLowerCase()) ?? [],
        [coins],
    )
    useBinanceWs(symbols)
    const { ticks, connected } = useLivePriceStore()

    // ── Table logic ───────────────────────────────────────────────────────────
    function handleTabChange(newTab: TabId) {
        setTab(newTab)
        setSearch('')
        const { defaultSort, defaultDir } = applyTab(coins ?? [], newTab)
        setSortKey(defaultSort)
        setSortDir(defaultDir)
    }

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const filtered = useMemo(() => {
        const { list } = applyTab(coins ?? [], tab)
        let result = [...list]
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
    }, [coins, tab, search, sortKey, sortDir])

    const sortProps = { sortKey, sortDir, onSort: handleSort }

    return (
        <div className="space-y-5 max-w-7xl">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Thị trường</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Top 100 coin theo Market Cap</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Live connection indicator */}
                    {!isLoading && <LiveBadge connected={connected} />}

                    {/* Manual refresh */}
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

            {/* ── Stats strip ── */}
            {!isLoading && !isError && coins && <StatsStrip coins={coins} />}

            {/* ── Tabs + Search ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Tabs */}
                <div className="flex gap-0.5 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit">
                    {TABS.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            onClick={() => handleTabChange(id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                                tab === id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
                            )}
                        >
                            {icon}{label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative sm:ml-auto">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Tìm coin..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-56 pl-9 pr-8 py-2 bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-sm transition"
                        >✕</button>
                    )}
                </div>
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
                                <tr className="border-b border-gray-800 bg-gray-800/40">
                                    <th className="pl-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-10">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Coin</th>
                                    <SortTh col="currentPrice"             label="Giá"        {...sortProps} />
                                    <SortTh col="priceChangePercentage24h" label="24h %"      {...sortProps} />
                                    <SortTh col="marketCap"                label="Mkt Cap"    {...sortProps} />
                                    <SortTh col="totalVolume"              label="Volume 24h" {...sortProps} />
                                    <th className="pr-4 py-3 w-16" />
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
                                                    {search ? `Không tìm thấy "${search}"` : 'Không có coin nào'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((coin, i) => (
                                        <CoinRow
                                            key={coin.id}
                                            coin={coin}
                                            rank={i + 1}
                                            isTrending={tab === 'trending'}
                                            isWatched={isWatched(coin.id)}
                                            onToggleWatch={(e) => { e.stopPropagation(); toggle(coin.id, coin.symbol) }}
                                            onClick={() => navigate(`/market/${coin.id}`)}
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
                    {tab === 'trending'
                        ? `🔥 Top ${filtered.length} trending (momentum × volume)`
                        : `${filtered.length} / ${coins?.length ?? 0} coin`}
                    {connected && (
                        <span className="ml-2 text-emerald-600">· giá cập nhật realtime từ Binance</span>
                    )}
                </p>
            )}
        </div>
    )
}
