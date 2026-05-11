// src/pages/MarketPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, ChevronsUpDown, Flame, BarChart3, Zap, Star } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWatchlist } from '@/hooks/useWatchlist'
import type { CryptoListResponse } from '@/types'

// ─── Types ─────────────────────────────────────────────────────────────────────
type SortKey = 'marketCap' | 'currentPrice' | 'priceChangePercentage24h' | 'totalVolume'
type SortDir = 'asc' | 'desc'
type TabId   = 'all' | 'gainers' | 'losers' | 'volume' | 'trending'

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'all',      label: 'Tất cả',     icon: <BarChart3 size={13} /> },
    { id: 'gainers',  label: 'Tăng mạnh',  icon: <TrendingUp size={13} /> },
    { id: 'losers',   label: 'Giảm mạnh',  icon: <TrendingDown size={13} /> },
    { id: 'volume',   label: 'Volume cao',  icon: <Zap size={13} /> },
    { id: 'trending', label: 'Trending 🔥', icon: <Flame size={13} /> },
]

// ─── Trending score: composite of priceChange + volume/marketCap activity ─────
function trendingScore(c: CryptoListResponse): number {
    const priceScore  = Math.max(0, c.priceChangePercentage24h) // positive momentum only
    const volumeRatio = c.marketCap > 0 ? c.totalVolume / c.marketCap : 0
    return priceScore * 0.6 + volumeRatio * 1000 * 0.4
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function applyTab(coins: CryptoListResponse[], tab: TabId): { list: CryptoListResponse[]; defaultSort: SortKey; defaultDir: SortDir } {
    switch (tab) {
        case 'gainers':
            return {
                list: coins.filter((c) => c.priceChangePercentage24h > 0),
                defaultSort: 'priceChangePercentage24h',
                defaultDir: 'desc',
            }
        case 'losers':
            return {
                list: coins.filter((c) => c.priceChangePercentage24h < 0),
                defaultSort: 'priceChangePercentage24h',
                defaultDir: 'asc',
            }
        case 'volume':
            return {
                list: [...coins].sort((a, b) => b.totalVolume - a.totalVolume),
                defaultSort: 'totalVolume',
                defaultDir: 'desc',
            }
        case 'trending': {
            // Sort by composite trending score, show top 30
            const sorted = [...coins]
                .sort((a, b) => trendingScore(b) - trendingScore(a))
                .slice(0, 30)
            return { list: sorted, defaultSort: 'priceChangePercentage24h', defaultDir: 'desc' }
        }
        default:
            return { list: coins, defaultSort: 'marketCap', defaultDir: 'desc' }
    }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
    return (
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit">
            {TABS.map(({ id, label, icon }) => (
                <button
                    key={id}
                    onClick={() => onChange(id)}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        active === id
                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                    )}
                >
                    {icon}
                    {label}
                </button>
            ))}
        </div>
    )
}

function StatsStrip({ coins }: { coins: CryptoListResponse[] }) {
    const gainers  = coins.filter((c) => c.priceChangePercentage24h > 0).length
    const losers   = coins.filter((c) => c.priceChangePercentage24h < 0).length
    const topGainer = [...coins].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)[0]
    const topLoser  = [...coins].sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)[0]

    return (
        <div className="flex flex-wrap gap-3">
            <StatPill
                label="Tăng"
                value={String(gainers)}
                color="text-emerald-600 dark:text-emerald-400"
                bg="bg-emerald-50 dark:bg-emerald-900/20"
                icon={<TrendingUp size={11} />}
            />
            <StatPill
                label="Giảm"
                value={String(losers)}
                color="text-red-500 dark:text-red-400"
                bg="bg-red-50 dark:bg-red-900/20"
                icon={<TrendingDown size={11} />}
            />
            {topGainer && (
                <StatPill
                    label="Top tăng"
                    value={`${topGainer.symbol.toUpperCase()} ${formatPct(topGainer.priceChangePercentage24h)}`}
                    color="text-emerald-600 dark:text-emerald-400"
                    bg="bg-emerald-50 dark:bg-emerald-900/20"
                    icon={<Flame size={11} />}
                />
            )}
            {topLoser && (
                <StatPill
                    label="Top giảm"
                    value={`${topLoser.symbol.toUpperCase()} ${formatPct(topLoser.priceChangePercentage24h)}`}
                    color="text-red-500 dark:text-red-400"
                    bg="bg-red-50 dark:bg-red-900/20"
                    icon={<TrendingDown size={11} />}
                />
            )}
        </div>
    )
}

function StatPill({ label, value, color, bg, icon }: {
    label: string; value: string; color: string; bg: string; icon: React.ReactNode
}) {
    return (
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium', bg, color)}>
            {icon}
            <span className="text-gray-500 dark:text-gray-400">{label}:</span>
            <span>{value}</span>
        </div>
    )
}

function SortTh({ col, label, sortKey, sortDir, onSort, className }: {
    col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir
    onSort: (col: SortKey) => void; className?: string
}) {
    const active = col === sortKey
    return (
        <th
            className={cn('px-4 py-3 font-medium cursor-pointer select-none', className)}
            onClick={() => onSort(col)}
        >
            <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
                <span className={cn(
                    'transition',
                    active
                        ? 'text-brand-500 dark:text-brand-400'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
                )}>
                    {label}
                </span>
                {active
                    ? sortDir === 'desc'
                        ? <ChevronDown size={13} className="text-brand-500 dark:text-brand-400" />
                        : <ChevronUp   size={13} className="text-brand-500 dark:text-brand-400" />
                    : <ChevronsUpDown size={13} className="text-gray-300 dark:text-gray-600" />
                }
            </div>
        </th>
    )
}

function CoinRow({ coin, rank, onClick, isTrending, isWatched, onToggleWatch }: {
    coin: CryptoListResponse; rank: number; onClick: () => void; isTrending?: boolean
    isWatched: boolean; onToggleWatch: (e: React.MouseEvent) => void
}) {
    const positive = coin.priceChangePercentage24h >= 0
    return (
        <tr onClick={onClick} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition cursor-pointer group">
            <td className="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 font-medium">
                {isTrending && rank <= 3
                    ? <span className="text-base leading-none">{'🥇🥈🥉'[rank - 1]}</span>
                    : rank}
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                    <img src={coin.image} alt={coin.name} className="w-7 h-7 rounded-full shrink-0" />
                    <div className="min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white">{coin.name}</span>
                        <span className="text-gray-400 dark:text-gray-500 uppercase text-xs ml-1.5">{coin.symbol}</span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5 text-right font-semibold text-gray-900 dark:text-white">
                {formatUSD(coin.currentPrice)}
            </td>
            <td className="px-4 py-3.5 text-right">
                <span className={cn(
                    'inline-flex items-center gap-1 font-medium text-sm',
                    positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                )}>
                    {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {formatPct(coin.priceChangePercentage24h)}
                </span>
            </td>
            <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300 text-sm">
                {formatMarketCap(coin.marketCap)}
            </td>
            <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300 text-sm">
                {formatMarketCap(coin.totalVolume)}
            </td>
            <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={onToggleWatch}
                        title={isWatched ? 'Bỏ theo dõi' : 'Thêm vào Watchlist'}
                        className="p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                    >
                        <Star
                            size={14}
                            className={cn(
                                'transition',
                                isWatched
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400',
                            )}
                        />
                    </button>
                    <span className="text-xs text-brand-600 dark:text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition">
                        Chi tiết →
                    </span>
                </div>
            </td>
        </tr>
    )
}

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3.5"><div className="w-5 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" /></td>
                    <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full" />
                            <div className="w-28 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                        </div>
                    </td>
                    <td className="px-4 py-3.5"><div className="w-20 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3.5"><div className="w-14 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3.5"><div className="w-20 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3.5"><div className="w-20 h-3.5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3.5" />
                </tr>
            ))}
        </>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function MarketPage() {
    const navigate = useNavigate()
    const { isWatched, toggle } = useWatchlist()
    const [search,  setSearch]  = useState('')
    const [tab,     setTab]     = useState<TabId>('all')
    const [sortKey, setSortKey] = useState<SortKey>('marketCap')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const { data: coins, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['crypto', 'top', 100],
        queryFn:  () => getTopCryptos(100),
        staleTime: 1000 * 60 * 2,
    })

    // Switch tab → reset sort to tab's default
    function handleTabChange(newTab: TabId) {
        setTab(newTab)
        setSearch('')
        const { defaultSort, defaultDir } = applyTab(coins ?? [], newTab)
        setSortKey(defaultSort)
        setSortDir(defaultDir)
    }

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
    }

    const filtered = useMemo(() => {
        const { list } = applyTab(coins ?? [], tab)
        let result = [...list]

        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(
                (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
            )
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thị trường</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Top 100 coin theo Market Cap</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                    {isFetching ? 'Đang tải...' : '↻ Cập nhật giá'}
                </button>
            </div>

            {/* Stats strip */}
            {!isLoading && !isError && coins && coins.length > 0 && (
                <StatsStrip coins={coins} />
            )}

            {/* Tabs + Search row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <TabBar active={tab} onChange={handleTabChange} />

                <div className="relative max-w-xs sm:ml-auto">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Tìm coin..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 hover:text-gray-500 text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                {isError ? (
                    <div className="py-16 text-center text-sm text-red-400">
                        Không thể tải dữ liệu.{' '}
                        <button onClick={() => refetch()} className="text-brand-600 dark:text-brand-400 underline">
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                                    <th className="px-4 py-3 text-gray-400 dark:text-gray-500 font-medium text-left w-10">#</th>
                                    <th className="px-4 py-3 text-gray-400 dark:text-gray-500 font-medium text-left">Coin</th>
                                    <SortTh col="currentPrice"            label="Giá"         className="text-right" {...sortProps} />
                                    <SortTh col="priceChangePercentage24h" label="24h %"       className="text-right" {...sortProps} />
                                    <SortTh col="marketCap"               label="Market Cap"  className="text-right" {...sortProps} />
                                    <SortTh col="totalVolume"             label="Volume 24h"  className="text-right" {...sortProps} />
                                    <th className="px-4 py-3 w-20" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {isLoading ? (
                                    <SkeletonRows />
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                                            {search
                                                ? <>Không tìm thấy coin nào với từ khoá "<strong>{search}</strong>"</>
                                                : 'Không có coin nào trong danh mục này.'}
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
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!isLoading && !isError && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                    {tab === 'trending'
                        ? `🔥 Top ${filtered.length} coin trending (xếp hạng theo điểm momentum × volume)`
                        : `Hiển thị ${filtered.length} / ${coins?.length ?? 0} coin`}
                </p>
            )}
        </div>
    )
}
