// src/pages/DashboardPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity } from 'lucide-react'
import { getPortfolioSummary } from '@/api/portfolio'
import { getWallets } from '@/api/wallet'
import { getTopCryptos } from '@/api/crypto'
import { getTransactions } from '@/api/transaction'
import { apiClient } from '@/api/client'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { formatUSD, formatPct, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PortfolioHistoryPoint {
    date: string
    totalValue: number
}
type DayRange = 7 | 30 | 90

async function getPortfolioHistory(days: DayRange): Promise<PortfolioHistoryPoint[]> {
    const { data } = await apiClient.get<PortfolioHistoryPoint[]>('/Portfolio/history', {
        params: { days },
    })
    return data
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="text-gray-400 mb-0.5">{label}</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatUSD(payload[0].value)}</p>
        </div>
    )
}

// ─── Portfolio Chart ────────────────────────────────────────────────────────────
function PortfolioChart() {
    const [days, setDays] = useState<DayRange>(30)

    const { data: history, isLoading } = useQuery({
        queryKey: ['portfolio', 'history', days],
        queryFn: () => getPortfolioHistory(days),
        staleTime: 1000 * 60 * 5,
    })

    const chartData = useMemo(() => {
        if (!history) return []
        return history.map((p) => ({
            date: new Date(p.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
            value: p.totalValue,
        }))
    }, [history])

    const change = useMemo(() => {
        if (!chartData.length) return null
        const first = chartData[0].value
        const last = chartData[chartData.length - 1].value
        if (first === 0) return null
        return ((last - first) / first) * 100
    }, [chartData])

    const positive = (change ?? 0) >= 0

    const RANGES: { label: string; value: DayRange }[] = [
        { label: '7N', value: 7 },
        { label: '1T', value: 30 },
        { label: '3T', value: 90 },
    ]

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">Portfolio Value</h2>
                    {change !== null && (
                        <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            positive
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                        )}>
                            {positive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    )}
                </div>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setDays(r.value)}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-md transition',
                                days === r.value
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ) : !chartData.length ? (
                <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    Chưa có dữ liệu. Thêm giao dịch để bắt đầu theo dõi.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={positive ? '#4f46e5' : '#ef4444'} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={positive ? '#4f46e5' : '#ef4444'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                            width={50}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={positive ? '#4f46e5' : '#ef4444'}
                            strokeWidth={2}
                            fill="url(#portfolioGradient)"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
    const { user } = useAuth()

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['portfolio', 'summary'],
        queryFn: getPortfolioSummary,
    })

    const { data: wallets, isLoading: loadingWallets } = useQuery({
        queryKey: ['wallets'],
        queryFn: getWallets,
    })

    const { data: topCryptos, isLoading: loadingCryptos } = useQuery({
        queryKey: ['crypto', 'top', 5],
        queryFn: () => getTopCryptos(5),
    })

    const { data: transactions, isLoading: loadingTx } = useQuery({
        queryKey: ['transactions'],
        queryFn: getTransactions,
    })

    const recentTx = transactions?.slice(0, 5) ?? []
    const pnlPositive = (summary?.totalProfitLoss ?? 0) >= 0

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Welcome */}
            <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl px-8 py-8 text-white">
                <p className="text-brand-200 text-sm font-medium mb-1">Welcome back</p>
                <h1 className="text-3xl font-bold mb-1">Hello, {user?.username}! 👋</h1>
                <p className="text-brand-200 text-sm">{user?.email}</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Portfolio Value"
                    value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
                    sub={summary ? `${summary.totalTransactionCount} transactions` : 'No data yet'}
                    loading={loadingSummary}
                />
                <StatCard
                    label="Total P&L"
                    value={
                        summary ? (
                            <span className={pnlPositive ? 'text-emerald-500' : 'text-red-500'}>
                                {pnlPositive ? '+' : ''}{formatUSD(summary.totalProfitLoss)}
                            </span>
                        ) : '—'
                    }
                    trend={summary?.totalProfitLossPercentage}
                    loading={loadingSummary}
                />
                <StatCard
                    label="Total Invested"
                    value={summary ? formatUSD(summary.totalInvestedValue) : '—'}
                    sub="Net buy - sell"
                    loading={loadingSummary}
                />
                <StatCard
                    label="Active Wallets"
                    value={wallets?.length ?? 0}
                    sub={wallets?.length === 0 ? 'Add your first wallet' : wallets?.map(w => w.name).join(', ')}
                    loading={loadingWallets}
                />
            </div>

            {/* Portfolio Chart */}
            <PortfolioChart />

            {/* Bottom grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Allocations */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-brand-600 dark:text-brand-400" />
                        Portfolio Allocation
                    </h2>
                    {loadingSummary ? (
                        <SkeletonList n={3} />
                    ) : !summary?.allocations.length ? (
                        <EmptyState
                            icon={<TrendingUp size={32} />}
                            text="No holdings yet"
                            sub="Add transactions to see allocation"
                        />
                    ) : (
                        <div className="space-y-3">
                            {summary.allocations.slice(0, 6).map((coin, index) => (
                                <div key={`${coin.coinId}-${index}`} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {coin.coinSymbol.toUpperCase()}
                                                <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">{coin.coinName}</span>
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-400">{coin.allocationPercentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500 rounded-full"
                                                style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                                        {formatUSD(coin.currentValue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-brand-600 dark:text-brand-400" />
                        Recent Transactions
                    </h2>
                    {loadingTx ? (
                        <SkeletonList n={4} h={12} />
                    ) : recentTx.length === 0 ? (
                        <EmptyState
                            icon={<ArrowUpRight size={32} />}
                            text="No transactions yet"
                            sub="Create a wallet and add your first trade"
                        />
                    ) : (
                        <div className="space-y-1">
                            {recentTx.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <div className={cn('rounded-full p-1.5 shrink-0', tx.type === 1 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40')}>
                                        {tx.type === 1
                                            ? <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                                            : <ArrowDownRight size={14} className="text-red-500 dark:text-red-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {tx.typeDisplay} {tx.coinSymbol.toUpperCase()}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.transactionDate)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatUSD(tx.totalAmount)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{tx.quantity} coins</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Top 5 Market */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                    Top 5 by Market Cap
                </h2>
                {loadingCryptos ? (
                    <SkeletonList n={5} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                                    <th className="pb-2 font-medium">Coin</th>
                                    <th className="pb-2 font-medium text-right">Price</th>
                                    <th className="pb-2 font-medium text-right">24h</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {topCryptos?.map((coin) => (
                                    <tr key={coin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full" />
                                                <span className="font-medium text-gray-900 dark:text-white">{coin.name}</span>
                                                <span className="text-gray-400 dark:text-gray-500 uppercase text-xs">{coin.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                                            {formatUSD(coin.currentPrice)}
                                        </td>
                                        <td className={cn(
                                            'py-3 text-right font-medium',
                                            coin.priceChangePercentage24h >= 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-500 dark:text-red-400'
                                        )}>
                                            {formatPct(coin.priceChangePercentage24h)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function SkeletonList({ n, h = 10 }: { n: number; h?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: n }).map((_, i) => (
                <div key={i} className={`h-${h} bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg`} />
            ))}
        </div>
    )
}

function EmptyState({ icon, text, sub }: { icon: ReactNode; text: string; sub: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-500">
            <div className="mb-3 opacity-30">{icon}</div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{text}</p>
            <p className="text-xs mt-0.5">{sub}</p>
        </div>
    )
}