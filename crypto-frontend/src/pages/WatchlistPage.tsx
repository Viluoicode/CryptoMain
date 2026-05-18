// src/pages/WatchlistPage.tsx
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Star, TrendingUp, TrendingDown, StarOff } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { useWatchlist } from '@/hooks/useWatchlist'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'

export function WatchlistPage() {
    const navigate = useNavigate()
    const { watchlist, toggle, isWatched, isLoading: watchlistLoading } = useWatchlist()

    const { data: coins, isLoading: coinsLoading } = useQuery({
        queryKey: ['crypto', 'top', 100],
        queryFn: () => getTopCryptos(100),
        staleTime: 1000 * 60 * 2,
    })

    const isLoading = watchlistLoading || coinsLoading
    const watched = (coins ?? []).filter(c => isWatched(c.id))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-amber-500 rounded-lg p-2">
                    <Star size={20} className="text-white" fill="white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {watchlist.length > 0
                            ? `${watchlist.length} coin đang theo dõi`
                            : 'Chưa có coin nào — thêm từ trang Market'}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : watched.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 py-20 flex flex-col items-center gap-3 text-gray-400">
                    <StarOff size={48} className="opacity-30" />
                    <p className="text-sm font-medium">Watchlist trống</p>
                    <p className="text-xs">Nhấn ⭐ trên trang Market để thêm coin vào đây</p>
                    <button
                        onClick={() => navigate('/market')}
                        className="mt-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                    >
                        Đi tới Market
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Coin</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Giá</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">24h %</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Cap</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Volume 24h</th>
                                    <th className="px-4 py-3 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {watched.map(coin => {
                                    const positive = coin.priceChangePercentage24h >= 0
                                    return (
                                        <tr
                                            key={coin.id}
                                            onClick={() => navigate(`/market/${coin.id}`)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition group"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{coin.name}</p>
                                                        <p className="text-xs text-gray-400 uppercase">{coin.symbol}</p>
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
                                                    {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    {formatPct(coin.priceChangePercentage24h)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400">
                                                {formatMarketCap(coin.marketCap)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400">
                                                {formatMarketCap(coin.totalVolume)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggle(coin.id, coin.symbol)}
                                                    title="Bỏ theo dõi"
                                                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                                                >
                                                    <Star
                                                        size={16}
                                                        className="text-amber-400 fill-amber-400"
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
