// src/pages/MarketPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CryptoListResponse } from '@/types'

type SortKey = 'marketCap' | 'currentPrice' | 'priceChangePercentage24h' | 'totalVolume'
type SortDir = 'asc' | 'desc'

function formatLargeNumber(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return formatUSD(value)
}

// ─── Sort Header ───────────────────────────────────────────────────────────────
function SortTh({ col, label, sortKey, sortDir, onSort, className }: {
    col: SortKey
    label: string
    sortKey: SortKey
    sortDir: SortDir
    onSort: (col: SortKey) => void
    className?: string
}) {
    const active = col === sortKey
    return (
        <th
            className={cn('px-4 py-3 font-medium cursor-pointer select-none', className)}
            onClick={() => onSort(col)}
        >
            <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
                <span className={cn('transition', active ? 'text-brand-500 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300')}>
                    {label}
                </span>
                {active
                    ? sortDir === 'desc'
                        ? <ChevronDown size={13} className="text-brand-500 dark:text-brand-400" />
                        : <ChevronUp size={13} className="text-brand-500 dark:text-brand-400" />
                    : <ChevronsUpDown size={13} className="text-gray-300 dark:text-gray-600" />
                }
            </div>
        </th>
    )
}

// ─── Coin Row ──────────────────────────────────────────────────────────────────
function CoinRow({ coin, rank, onClick }: {
    coin: CryptoListResponse
    rank: number
    onClick: () => void
}) {
    const positive = coin.priceChangePercentage24h >= 0

    return (
        <tr onClick={onClick} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition cursor-pointer group">
            <td className="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 font-medium">{rank}</td>
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
                    positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                )}>
                    {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {formatPct(coin.priceChangePercentage24h)}
                </span>
            </td>
            <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300 text-sm">
                {formatLargeNumber(coin.marketCap)}
            </td>
            <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300 text-sm">
                {formatLargeNumber(coin.totalVolume)}
            </td>
            <td className="px-4 py-3.5 text-right">
                <span className="text-xs text-brand-600 dark:text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition">
                    Chi tiết →
                </span>
            </td>
        </tr>
    )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 10 }).map((_, i) => (
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function MarketPage() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('marketCap')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const { data: coins, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['crypto', 'top', 50],
        queryFn: () => getTopCryptos(50),
        staleTime: 1000 * 60 * 2,
    })

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
    }

    const filtered = useMemo(() => {
        let list = [...(coins ?? [])]
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter((c) =>
                c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
            )
        }
        list.sort((a, b) => {
            const aVal = a[sortKey] as number
            const bVal = b[sortKey] as number
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal
        })
        return list
    }, [coins, search, sortKey, sortDir])

    const sortProps = { sortKey, sortDir, onSort: handleSort }

    return (
        <div className="space-y-5 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thị trường</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Top 50 coin theo Market Cap</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                    {isFetching ? 'Đang tải...' : '↻ Cập nhật giá'}
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                    type="text"
                    placeholder="Tìm coin (vd: bitcoin, BTC)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-sm"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                {isError ? (
                    <div className="py-16 text-center text-sm text-red-400">
                        Không thể tải dữ liệu.{' '}
                        <button onClick={() => refetch()} className="text-brand-600 dark:text-brand-400 underline">Thử lại</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                                    <th className="px-4 py-3 text-gray-400 dark:text-gray-500 font-medium text-left w-10">#</th>
                                    <th className="px-4 py-3 text-gray-400 dark:text-gray-500 font-medium text-left">Coin</th>
                                    <SortTh col="currentPrice" label="Giá" className="text-right" {...sortProps} />
                                    <SortTh col="priceChangePercentage24h" label="24h %" className="text-right" {...sortProps} />
                                    <SortTh col="marketCap" label="Market Cap" className="text-right" {...sortProps} />
                                    <SortTh col="totalVolume" label="Volume 24h" className="text-right" {...sortProps} />
                                    <th className="px-4 py-3 w-20" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {isLoading ? (
                                    <SkeletonRows />
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                                            Không tìm thấy coin nào với từ khoá "<strong>{search}</strong>"
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((coin, index) => (
                                        <CoinRow
                                            key={coin.id}
                                            coin={coin}
                                            rank={index + 1}
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
                    Hiển thị {filtered.length} / {coins?.length ?? 0} coin
                </p>
            )}
        </div>
    )
}