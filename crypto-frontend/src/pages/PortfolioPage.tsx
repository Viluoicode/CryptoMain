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
    Calendar, Layers, PieChart,
} from 'lucide-react'
import { getPortfolioSummary, getPortfolioPerformance, getPortfolioHistory } from '@/api/portfolio'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PortfolioCoinAllocation } from '@/types'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Day range options ─────────────────────────────────────────────────────────
const DAY_OPTIONS = [
    { label: '7N',  value: 7   },
    { label: '1T',  value: 30  },
    { label: '3T',  value: 90  },
    { label: '1Y',  value: 365 },
]

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
        <div className="glass-card p-4 hover-glow transition-all duration-300 hover:border-white/[0.1]">
            <div className="flex items-center gap-2.5 mb-3">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border border-white/[0.04]', iconBg)}>
                    <Icon size={14} className={iconColor} />
                </div>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-white font-mono">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 font-medium mt-1">{sub}</p>}
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
        <div className="bg-navy-900/95 border border-white/[0.08] rounded-xl px-3.5 py-3 shadow-glass backdrop-blur-xl text-xs space-y-1.5 animate-scale-in">
            <p className="text-gray-400 font-medium mb-1.5">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: p.color }} />
                    <span className="text-gray-500 font-medium">{p.name}:</span>
                    <span className="font-bold text-white font-mono">{formatUSD(p.value)}</span>
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

    const strokeColor = positive ? '#0059FB' : '#f6465d' // Toobit Blue or Red
    const tickInterval = Math.max(1, Math.floor(chartData.length / 7) - 1)

    if (isLoading) return <div className="h-56 bg-navy-900/40 animate-pulse border border-white/[0.06] rounded-2xl" />

    if (!chartData.length) return (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
            <BarChart2 size={28} className="text-gray-700" />
            <p className="text-sm text-gray-500 font-semibold">Chưa có dữ liệu lịch sử</p>
            <p className="text-xs text-gray-600">Snapshot được lưu mỗi ngày lúc 00:00 UTC</p>
        </div>
    )

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#4b5563' }}
                    axisLine={false} tickLine={false}
                    interval={tickInterval}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: '#4b5563' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`}
                    width={58}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                    type="monotone"
                    dataKey="Giá trị"
                    stroke={strokeColor}
                    strokeWidth={2.5}
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
            `w-${size} h-${size} rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15`,
            'flex items-center justify-center shrink-0',
        )}>
            <span className="text-[9px] font-bold text-accent-cyan uppercase">
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
        <EmptyState
            icon={<Layers size={20} />}
            title="Chưa có holdings"
            description="Thêm giao dịch Buy để bắt đầu"
        />
    )

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06] text-gray-500 text-xs uppercase tracking-wider font-bold">
                        <th className="text-left pb-3 pl-4 font-semibold">Coin</th>
                        <th className="text-right pb-3 font-semibold">Số lượng</th>
                        <th className="text-right pb-3 font-semibold">Giá TB mua</th>
                        <th className="text-right pb-3 font-semibold">Giá hiện tại</th>
                        <th className="text-right pb-3 font-semibold">Giá trị</th>
                        <th className="text-right pb-3 font-semibold">P&amp;L</th>
                        <th className="text-right pb-3 pr-4 font-semibold">% Danh mục</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
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
                                className="hover:bg-white/[0.02] transition-colors duration-150"
                            >
                                {/* Coin */}
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <CoinAvatar image={coin.image} symbol={coin.coinSymbol} size={8} />
                                        <div>
                                            <p className="font-bold text-white text-sm">{coin.coinName}</p>
                                            <p className="text-xs text-gray-500 font-semibold uppercase">{coin.coinSymbol}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Quantity */}
                                <td className="py-4 text-right font-mono text-gray-300 text-xs font-semibold">
                                    {coin.quantity.toFixed(6)}
                                </td>

                                {/* Avg buy */}
                                <td className="py-4 text-right font-mono text-gray-500 text-xs font-medium">
                                    {avgBuy > 0 ? formatUSD(avgBuy) : '—'}
                                </td>

                                {/* Current price — live if available */}
                                <td className="py-4 text-right font-mono text-gray-300 text-xs font-semibold">
                                    <span className={cn(liveTick ? 'text-white' : 'text-gray-400')}>
                                        {formatUSD(livePrice)}
                                    </span>
                                    {liveTick && connected && (
                                        <span className="ml-1.5 text-emerald-500 text-[8px] animate-pulse">●</span>
                                    )}
                                </td>

                                {/* Value — recomputed with live price */}
                                <td className="py-4 text-right font-mono font-bold text-white">
                                    {formatUSD(liveValue)}
                                </td>

                                {/* P&L */}
                                <td className="py-4 text-right">
                                    <p className={cn('font-bold font-mono text-sm', pos ? 'text-emerald-400' : 'text-red-400')}>
                                        {pos ? '+' : ''}{formatUSD(pnl)}
                                    </p>
                                    <p className={cn('text-xs font-mono font-semibold', pos ? 'text-emerald-500/70' : 'text-red-500/70')}>
                                        {pos ? '+' : ''}{pnlPct.toFixed(2)}%
                                    </p>
                                </td>

                                {/* Allocation % */}
                                <td className="py-4 pr-4">
                                    <div className="flex items-center justify-end gap-2.5">
                                        <div className="w-16 h-1.5 bg-navy-950/60 border border-white/[0.04] rounded-full overflow-hidden shrink-0">
                                            <div
                                                className="h-full bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full"
                                                style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono font-bold w-10 text-right shrink-0">
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
    useDocumentTitle('Portfolio')
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
        <div className="space-y-6 max-w-7xl animate-fade-in">

            {/* ── Page header ── */}
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    Portfolio
                </h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">Tổng quan danh mục đầu tư của bạn</p>
            </div>

            {/* ── Row 1: 4 summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Tổng giá trị"
                    value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
                    sub={`${summary?.totalTransactionCount ?? 0} giao dịch`}
                    loading={loadingSummary}
                    icon={<Wallet size={14} />}
                />
                <StatCard
                    label="Total P&L"
                    value={summary ? `${pnlPos ? '+' : ''}${formatUSD(summary.totalProfitLoss)}` : '—'}
                    trend={summary?.totalProfitLossPercentage}
                    loading={loadingSummary}
                    icon={pnlPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                />
                <StatCard
                    label="Tổng đã đầu tư"
                    value={summary ? formatUSD(summary.totalInvestedValue) : '—'}
                    sub="Net buy - sell"
                    loading={loadingSummary}
                    icon={<Layers size={14} />}
                />
                <StatCard
                    label="Số ví"
                    value={loadingSummary ? '—' : String(summary?.walletCount ?? 0)}
                    sub={`${summary?.allocations.length ?? 0} loại coin`}
                    loading={loadingSummary}
                    icon={<PieChart size={14} />}
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
                        iconBg="bg-emerald-500/10 border-emerald-500/20"
                    />
                    <PerfCard
                        label="Tổng bán"
                        value={formatUSD(performance.totalSellAmount)}
                        sub={`${performance.totalSellTransactions} lệnh`}
                        icon={ArrowUpRight}
                        iconColor="text-red-400"
                        iconBg="bg-red-500/10 border-red-500/20"
                    />
                    <PerfCard
                        label="Net đầu tư"
                        value={formatUSD(performance.netInvested)}
                        sub="Buy - Sell"
                        icon={Wallet}
                        iconColor="text-cyan-400"
                        iconBg="bg-cyan-500/10 border-cyan-500/20"
                    />
                    <PerfCard
                        label="Unrealized P&L"
                        value={`${performance.unrealizedProfitLoss >= 0 ? '+' : ''}${formatUSD(performance.unrealizedProfitLoss)}`}
                        sub={formatPct(performance.unrealizedProfitLossPercentage)}
                        icon={performance.unrealizedProfitLoss >= 0 ? TrendingUp : TrendingDown}
                        iconColor={performance.unrealizedProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}
                        iconBg={performance.unrealizedProfitLoss >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}
                    />
                </div>
            )}

            {/* ── History Area Chart ── */}
            <Card className="p-5">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider">
                            <Calendar size={14} className="text-accent-cyan" /> Lịch sử giá trị Portfolio
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 font-bold uppercase">
                            <span className="flex items-center gap-1.5">
                                <span className="w-5 h-0.5 bg-accent-cyan inline-block rounded" />
                                Giá trị
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-5 h-0.5 bg-amber-500 border-dashed inline-block rounded opacity-80" />
                                Đầu tư
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-0.5 bg-navy-950 p-1 rounded-xl border border-white/[0.04]">
                        {DAY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setHistoryDays(opt.value)}
                                className={cn(
                                    'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-150',
                                    historyDays === opt.value
                                        ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.02]',
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <HistoryChart days={historyDays} />
            </Card>

            {/* ── Holdings Table ── */}
            <Card padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h2 className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider">
                        <Layers size={14} className="text-accent-cyan" /> Holdings
                    </h2>
                    <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {summary?.allocations.length ?? 0} coin
                    </span>
                </div>
                {loadingSummary ? (
                    <div className="p-5 space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-14 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="py-2">
                        <HoldingsTable allocations={summary?.allocations ?? []} />
                    </div>
                )}
            </Card>
        </div>
    )
}
