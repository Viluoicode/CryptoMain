// src/pages/PortfolioPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts'
import {
    TrendingUp, TrendingDown, Wallet,
    ArrowUpRight, ArrowDownRight, BarChart2,
} from 'lucide-react'
import { getPortfolioSummary, getPortfolioPerformance, getPortfolioHistory } from '@/api/portfolio'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PortfolioCoinAllocation } from '@/types'
import { useLivePriceStore } from '@/store/livePriceStore'

// ─── Day range options ─────────────────────────────────────────────────────────
const DAY_OPTIONS = [
    { label: '7N',  value: 7   },
    { label: '1T',  value: 30  },
    { label: '3T',  value: 90  },
    { label: '1Y',  value: 365 },
]

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, positive, loading }: {
    label: string
    value: string
    sub?: string
    positive?: boolean
    loading?: boolean
}) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors duration-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{label}</p>
            {loading ? (
                <div className="h-8 w-28 bg-gray-800 animate-pulse rounded-lg" />
            ) : (
                <p className={cn(
                    'text-2xl font-bold font-mono',
                    positive === true  ? 'text-emerald-400' :
                    positive === false ? 'text-red-400' :
                    'text-white',
                )}>
                    {value}
                </p>
            )}
            {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
        </div>
    )
}

// ─── Performance mini card ─────────────────────────────────────────────────────
function PerfCard({ label, value, sub, icon: Icon, iconColor, iconBg }: {
    label: string
    value: string
    sub?: string
    icon: typeof TrendingUp
    iconColor: string
    iconBg: string
}) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors duration-200">
            <div className="flex items-center gap-2.5 mb-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
                    <Icon size={14} className={iconColor} />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-lg font-bold text-white font-mono">{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
        </div>
    )
}

// ─── Chart Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1">
            <p className="text-gray-400 mb-1.5">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-gray-400">{p.name}:</span>
                    <span className="font-semibold text-white font-mono">{formatUSD(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

// ─── History Area Chart ────────────────────────────────────────────────────────
function HistoryChart({ days }: { days: number }) {
    const { data: history, isLoading } = useQuery({
        queryKey: ['portfolio', 'history', days],
        queryFn: () => getPortfolioHistory(days),
        staleTime: 5 * 60 * 1000,
    })

    const chartData = useMemo(() => (history ?? []).map((p) => ({
        date: new Date(p.date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }),
        'Giá trị': p.totalValue,
        'Đầu tư':  p.totalInvested,
    })), [history])

    const positive = useMemo(() => {
        if (chartData.length < 2) return true
        return chartData[chartData.length - 1]['Giá trị'] >= chartData[0]['Giá trị']
    }, [chartData])

    const strokeColor = positive ? '#4f46e5' : '#ef4444'
    const tickInterval = Math.max(1, Math.floor(chartData.length / 7) - 1)

    if (isLoading) return <div className="h-56 bg-gray-800 animate-pulse rounded-xl" />

    if (!chartData.length) return (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
            <BarChart2 size={28} className="text-gray-700" />
            <p className="text-sm text-gray-500">Chưa có dữ liệu lịch sử</p>
            <p className="text-xs text-gray-600">Snapshot được lưu mỗi ngày lúc 00:00 UTC</p>
        </div>
    )

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false} tickLine={false}
                    interval={tickInterval}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`}
                    width={58}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                    type="monotone"
                    dataKey="Giá trị"
                    stroke={strokeColor}
                    strokeWidth={2}
                    fill="url(#portfolioGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                />
                <Area
                    type="monotone"
                    dataKey="Đầu tư"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// ─── Coin Avatar ───────────────────────────────────────────────────────────────
function CoinAvatar({ image, symbol, size = 8 }: { image: string; symbol: string; size?: number }) {
    if (image) {
        return (
            <img
                src={image}
                alt={symbol}
                className={cn(`w-${size} h-${size} rounded-full object-cover`)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
        )
    }
    return (
        <div className={cn(
            `w-${size} h-${size} rounded-full bg-indigo-600/20 border border-indigo-500/20`,
            'flex items-center justify-center shrink-0',
        )}>
            <span className="text-[9px] font-bold text-indigo-400 uppercase">
                {symbol.slice(0, 2)}
            </span>
        </div>
    )
}

// ─── Holdings Table ────────────────────────────────────────────────────────────
function HoldingsTable({ allocations }: { allocations: PortfolioCoinAllocation[] }) {
    const { ticks, connected } = useLivePriceStore()
    const sorted = [...allocations].sort((a, b) => b.currentValue - a.currentValue)

    if (!sorted.length) return (
        <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart2 size={22} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium mb-1">Chưa có holdings</p>
            <p className="text-gray-600 text-sm">Thêm giao dịch Buy để bắt đầu</p>
        </div>
    )

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pl-1">Coin</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">Số lượng</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">Giá TB mua</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">Giá hiện tại</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">Giá trị</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">P&amp;L</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-1">% Danh mục</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                    {sorted.map((coin) => {
                        // Prefer live Binance price over stale CoinGecko price
                        const liveTick    = ticks[coin.coinSymbol.toLowerCase()]
                        const livePrice   = liveTick?.price ?? coin.currentPrice
                        const liveValue   = livePrice * coin.quantity
                        const pnl         = liveValue - coin.investedValue
                        const pnlPct      = coin.investedValue > 0 ? (pnl / coin.investedValue) * 100 : 0
                        const avgBuy      = coin.quantity > 0 ? coin.investedValue / coin.quantity : 0
                        const pos         = pnl >= 0

                        return (
                            <tr
                                key={coin.coinId}
                                className="hover:bg-gray-800/30 transition-colors duration-150"
                            >
                                {/* Coin */}
                                <td className="py-4 pl-1">
                                    <div className="flex items-center gap-3">
                                        <CoinAvatar image={coin.image} symbol={coin.coinSymbol} size={8} />
                                        <div>
                                            <p className="font-semibold text-white">{coin.coinName}</p>
                                            <p className="text-xs text-gray-500 uppercase">{coin.coinSymbol}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Quantity */}
                                <td className="py-4 text-right font-mono text-gray-300 text-xs">
                                    {coin.quantity.toFixed(6)}
                                </td>

                                {/* Avg buy */}
                                <td className="py-4 text-right font-mono text-gray-400 text-xs">
                                    {avgBuy > 0 ? formatUSD(avgBuy) : '—'}
                                </td>

                                {/* Current price — live if available */}
                                <td className="py-4 text-right font-mono text-gray-200 text-xs">
                                    <span className={liveTick ? 'text-white' : 'text-gray-400'}>
                                        {formatUSD(livePrice)}
                                    </span>
                                    {liveTick && connected && (
                                        <span className="ml-1 text-emerald-500 text-[9px]">●</span>
                                    )}
                                </td>

                                {/* Value — recomputed with live price */}
                                <td className="py-4 text-right font-mono font-semibold text-white">
                                    {formatUSD(liveValue)}
                                </td>

                                {/* P&L */}
                                <td className="py-4 text-right">
                                    <p className={cn('font-semibold font-mono text-sm', pos ? 'text-emerald-400' : 'text-red-400')}>
                                        {pos ? '+' : ''}{formatUSD(pnl)}
                                    </p>
                                    <p className={cn('text-xs font-mono', pos ? 'text-emerald-500/70' : 'text-red-500/70')}>
                                        {pos ? '+' : ''}{pnlPct.toFixed(2)}%
                                    </p>
                                </td>

                                {/* Allocation % */}
                                <td className="py-4 pr-1">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono w-10 text-right">
                                            {coin.allocationPercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function PortfolioPage() {
    const [historyDays, setHistoryDays] = useState(30)

    const { data: summary,     isLoading: loadingSummary } = useQuery({
        queryKey: ['portfolio', 'summary'],
        queryFn:  getPortfolioSummary,
    })
    const { data: performance, isLoading: loadingPerf } = useQuery({
        queryKey: ['portfolio', 'performance'],
        queryFn:  getPortfolioPerformance,
    })

    const pnlPos = (summary?.totalProfitLoss ?? 0) >= 0

    return (
        <div className="space-y-6 max-w-7xl">

            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-bold text-white">Portfolio</h1>
                <p className="text-sm text-gray-500 mt-0.5">Tổng quan danh mục đầu tư của bạn</p>
            </div>

            {/* ── Row 1: 4 summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Tổng giá trị"
                    value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
                    sub={`${summary?.totalTransactionCount ?? 0} giao dịch`}
                    loading={loadingSummary}
                />
                <StatCard
                    label="Total P&L"
                    value={summary ? `${pnlPos ? '+' : ''}${formatUSD(summary.totalProfitLoss)}` : '—'}
                    sub={summary ? formatPct(summary.totalProfitLossPercentage) : undefined}
                    positive={pnlPos}
                    loading={loadingSummary}
                />
                <StatCard
                    label="Tổng đã đầu tư"
                    value={summary ? formatUSD(summary.totalInvestedValue) : '—'}
                    sub="Net buy - sell"
                    loading={loadingSummary}
                />
                <StatCard
                    label="Số ví"
                    value={String(summary?.walletCount ?? '—')}
                    sub={`${summary?.allocations.length ?? 0} loại coin`}
                    loading={loadingSummary}
                />
            </div>

            {/* ── Row 2: 4 performance mini cards ── */}
            {!loadingPerf && performance && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <PerfCard
                        label="Tổng mua"
                        value={formatUSD(performance.totalBuyAmount)}
                        sub={`${performance.totalBuyTransactions} lệnh`}
                        icon={ArrowDownRight}
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                    />
                    <PerfCard
                        label="Tổng bán"
                        value={formatUSD(performance.totalSellAmount)}
                        sub={`${performance.totalSellTransactions} lệnh`}
                        icon={ArrowUpRight}
                        iconColor="text-red-400"
                        iconBg="bg-red-500/10"
                    />
                    <PerfCard
                        label="Net đầu tư"
                        value={formatUSD(performance.netInvested)}
                        sub="Buy - Sell"
                        icon={Wallet}
                        iconColor="text-indigo-400"
                        iconBg="bg-indigo-500/10"
                    />
                    <PerfCard
                        label="Unrealized P&L"
                        value={`${performance.unrealizedProfitLoss >= 0 ? '+' : ''}${formatUSD(performance.unrealizedProfitLoss)}`}
                        sub={formatPct(performance.unrealizedProfitLossPercentage)}
                        icon={performance.unrealizedProfitLoss >= 0 ? TrendingUp : TrendingDown}
                        iconColor={performance.unrealizedProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}
                        iconBg={performance.unrealizedProfitLoss >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                    />
                </div>
            )}

            {/* ── History Area Chart ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="font-semibold text-white">Lịch sử giá trị Portfolio</h2>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-5 h-0.5 bg-indigo-500 inline-block rounded" />
                                Giá trị
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-5 h-0.5 bg-amber-500 border-dashed inline-block rounded opacity-80" />
                                Đầu tư
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-0.5 bg-gray-800 p-1 rounded-xl">
                        {DAY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setHistoryDays(opt.value)}
                                className={cn(
                                    'px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150',
                                    historyDays === opt.value
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200',
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <HistoryChart days={historyDays} />
            </div>

            {/* ── Holdings Table ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold text-white">Holdings</h2>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
                        {summary?.allocations.length ?? 0} coin
                    </span>
                </div>
                {loadingSummary ? (
                    <div className="p-5 space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-14 bg-gray-800 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="px-5 py-2">
                        <HoldingsTable allocations={summary?.allocations ?? []} />
                    </div>
                )}
            </div>
        </div>
    )
}
