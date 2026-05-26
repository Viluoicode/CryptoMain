// src/pages/WatchlistPage.tsx
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Star, TrendingUp, TrendingDown, StarOff } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { useWatchlist } from '@/hooks/useWatchlist'
import { formatUSD, formatPct, formatMarketCap } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

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
        <div className="space-y-6 max-w-7xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 shrink-0">
                    <Star size={18} fill="currentColor" className="animate-pulse" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Watchlist</h1>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">
                        {watchlist.length > 0
                            ? `${watchlist.length} coin đang theo dõi`
                            : 'Chưa có coin nào — thêm từ trang Market'}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl animate-pulse" />)}
                </div>
            ) : watched.length === 0 ? (
                <EmptyState
                    icon={<StarOff size={24} />}
                    title="Watchlist trống"
                    description="Nhấn ⭐ trên trang Market để thêm coin vào danh sách theo dõi."
                    action={{
                        label: 'Đi tới Market',
                        onClick: () => navigate('/market')
                    }}
                />
            ) : (
                <Card padding="none" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-navy-950/20">
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Coin</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">24h %</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Market Cap</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Volume 24h</th>
                                    <th className="px-5 py-3.5 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {watched.map(coin => {
                                    const positive = coin.priceChangePercentage24h >= 0
                                    return (
                                        <tr
                                            key={coin.id}
                                            onClick={() => navigate(`/market/${coin.id}`)}
                                            className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-7 h-7 rounded-full shrink-0" />
                                                    <div>
                                                        <p className="font-bold text-white uppercase text-sm leading-tight">{coin.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5 leading-none">{coin.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-bold text-white text-sm">
                                                {formatUSD(coin.currentPrice)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 font-mono font-bold text-xs',
                                                    positive ? 'text-emerald-400' : 'text-red-400',
                                                )}>
                                                    {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                    {formatPct(coin.priceChangePercentage24h)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-xs text-gray-400">
                                                {formatMarketCap(coin.marketCap)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-xs text-gray-400">
                                                {formatMarketCap(coin.totalVolume)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggle(coin.id, coin.symbol)}
                                                    title="Bỏ theo dõi"
                                                    className="p-1.5 rounded-xl hover:bg-white/[0.05] text-amber-400 transition"
                                                >
                                                    <Star
                                                        size={15}
                                                        className="fill-amber-400"
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
