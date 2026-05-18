// src/pages/DashboardPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
    Activity, Clock, Zap,
} from 'lucide-react'
import { getPortfolioSummary, getPortfolioHistory } from '@/api/portfolio'
import { getWallets } from '@/api/wallet'
import { getAllTransactionsPaged } from '@/api/transaction'
import { formatUSD, formatPct, formatDate } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { FearGreedWidget } from '@/components/FearGreedWidget'

// ─── Helpers ───────────────────────────────────────────────────────────────────
type DayRange = 7 | 30 | 90 | 365

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
}

function getFormattedDate() {
    return new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
}

// ─── Chart Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-xs">
            <p className="text-gray-400 mb-0.5">{label}</p>
            <p className="font-bold text-white font-mono">{formatUSD(payload[0].value)}</p>
        </div>
    )
}

// ─── Portfolio Area Chart ──────────────────────────────────────────────────────
const RANGES: { label: string; value: DayRange }[] = [
    { label: '7N', value: 7 },
    { label: '1T', value: 30 },
    { label: '3T', value: 90 },
    { label: '1Y', value: 365 },
]

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

    const { change, positive } = useMemo(() => {
        if (chartData.length < 2) return { change: null, positive: true }
        const first = chartData[0].value
        const last  = chartData[chartData.length - 1].value
        if (first === 0) return { change: null, positive: true }
        const pct = ((last - first) / first) * 100
        return { change: pct, positive: pct >= 0 }
    }, [chartData])

    const strokeColor = positive ? '#4f46e5' : '#ef4444'

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-white">Lịch sử giá trị</h2>
                    {change !== null && (
                        <span className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                            positive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20',
                        )}>
                            {positive ? <TrendingUp size={10} className="inline mr-1" /> : <TrendingDown size={10} className="inline mr-1" />}
                            {positive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    )}
                </div>
                <div className="flex gap-0.5 bg-gray-800 p-1 rounded-xl">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setDays(r.value)}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150',
                                days === r.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200',
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="h-56 bg-gray-800 animate-pulse rounded-xl" />
            ) : !chartData.length ? (
                <div className="h-56 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center">
                        <Activity size={20} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Chưa có dữ liệu lịch sử</p>
                    <p className="text-gray-600 text-xs">Thêm giao dịch để bắt đầu theo dõi</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false} axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false} axisLine={false}
                            tickFormatter={(v: number) =>
                                v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`
                            }
                            width={52}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={strokeColor}
                            strokeWidth={2}
                            fill="url(#areaGrad)"
                            dot={false}
                            activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
    label, value, sub, positive, loading, icon: Icon,
}: {
    label: string
    value: string
    sub?: string
    positive?: boolean
    loading?: boolean
    icon?: typeof TrendingUp
}) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                {Icon && (
                    <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Icon size={14} className="text-gray-500" />
                    </div>
                )}
            </div>
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
            {sub && (
                <p className="text-xs text-gray-500 mt-1.5 truncate">{sub}</p>
            )}
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
    useDocumentTitle('Dashboard')
    const { user } = useAuth()
    const navigate  = useNavigate()

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['portfolio', 'summary'],
        queryFn: getPortfolioSummary,
    })

    const { data: wallets, isLoading: loadingWallets } = useQuery({
        queryKey: ['wallets'],
        queryFn: getWallets,
    })

    const { data: txPaged, isLoading: loadingTx } = useQuery({
        queryKey: ['transactions', 'recent'],
        queryFn: () => getAllTransactionsPaged({ page: 1, pageSize: 5 }),
    })

    const recentTx  = txPaged?.items ?? []
    const pnlPos    = (summary?.totalProfitLoss ?? 0) >= 0

    return (
        <div className="space-y-6 max-w-7xl">

            {/* ── Greeting row ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {getGreeting()}, <span className="text-indigo-400">{user?.username}</span> 👋
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">{getFormattedDate()}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-400">Giá live</span>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Portfolio Value"
                    value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
                    sub={`${summary?.totalTransactionCount ?? 0} giao dịch`}
                    loading={loadingSummary}
                    icon={Activity}
                />
                <StatCard
                    label="Total P&L"
                    value={summary
                        ? `${pnlPos ? '+' : ''}${formatUSD(summary.totalProfitLoss)}`
                        : '—'
                    }
                    sub={summary ? formatPct(summary.totalProfitLossPercentage) : undefined}
                    positive={pnlPos}
                    loading={loadingSummary}
                    icon={pnlPos ? TrendingUp : TrendingDown}
                />
                <StatCard
                    label="Tổng đầu tư"
                    value={summary ? formatUSD(summary.totalInvestedValue) : '—'}
                    sub="Net buy - sell"
                    loading={loadingSummary}
                    icon={Wallet}
                />
                <StatCard
                    label="Số ví"
                    value={loadingWallets ? '—' : String(wallets?.length ?? 0)}
                    sub={wallets?.map(w => w.name).join(' · ') || 'Chưa có ví'}
                    loading={loadingWallets}
                    icon={Zap}
                />
            </div>

            {/* ── Chart ── */}
            <PortfolioChart />

            {/* ── Bottom grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Allocation */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={15} className="text-indigo-400" />
                        Phân bổ danh mục
                    </h2>

                    {loadingSummary ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-8 bg-gray-800 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : !summary?.allocations.length ? (
                        <EmptyState
                            icon={<Activity size={22} />}
                            text="Chưa có holdings"
                            sub="Thêm giao dịch Buy để bắt đầu"
                        />
                    ) : (
                        <div className="space-y-3.5">
                            {summary.allocations.slice(0, 6).map((coin, i) => (
                                <div key={`${coin.coinId}-${i}`} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase">
                                            {coin.coinSymbol.slice(0, 2)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-gray-200 uppercase">
                                                {coin.coinSymbol}
                                                <span className="text-gray-500 font-normal normal-case ml-1">{coin.coinName}</span>
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2 shrink-0">
                                                {coin.allocationPercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-white font-mono w-20 text-right shrink-0">
                                        {formatUSD(coin.currentValue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fear & Greed */}
                <FearGreedWidget />

                {/* Recent Transactions */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Clock size={15} className="text-indigo-400" />
                            Giao dịch gần đây
                        </h2>
                        <button
                            onClick={() => navigate('/transactions')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition font-medium"
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {loadingTx ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 bg-gray-800 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : !recentTx.length ? (
                        <EmptyState
                            icon={<ArrowUpRight size={22} />}
                            text="Chưa có giao dịch"
                            sub="Tạo ví và thêm giao dịch đầu tiên"
                        />
                    ) : (
                        <div className="space-y-1">
                            {recentTx.map((tx) => {
                                const isBuy = tx.type === 1
                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-800/50 transition cursor-default"
                                    >
                                        <div className={cn(
                                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                            isBuy ? 'bg-emerald-500/10' : 'bg-red-500/10',
                                        )}>
                                            {isBuy
                                                ? <ArrowDownRight size={15} className="text-emerald-400" />
                                                : <ArrowUpRight   size={15} className="text-red-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-100">
                                                <span className={isBuy ? 'text-emerald-400' : 'text-red-400'}>
                                                    {tx.typeDisplay}
                                                </span>
                                                {' '}{tx.coinSymbol.toUpperCase()}
                                            </p>
                                            <p className="text-xs text-gray-500">{formatDate(tx.transactionDate)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-semibold text-white font-mono">
                                                {formatUSD(tx.totalAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500">{tx.quantity.toFixed(4)}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── EmptyState ─────────────────────────────────────────────────────────────────
function EmptyState({ icon, text, sub }: {
    icon: React.ReactNode
    text: string
    sub: string
}) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600">
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-400">{text}</p>
            <p className="text-xs text-gray-600">{sub}</p>
        </div>
    )
}
