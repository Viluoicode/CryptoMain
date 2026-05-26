// src/pages/DashboardPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import {
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
    Activity, Clock, Zap, ArrowRight, Sparkles, DollarSign,
} from 'lucide-react'
import { getPortfolioSummary, getPortfolioHistory } from '@/api/portfolio'
import { getWallets } from '@/api/wallet'
import { getAllTransactionsPaged } from '@/api/transaction'
import { formatUSD, formatDate } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { FearGreedWidget } from '@/components/FearGreedWidget'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

type DayRange = 7 | 30 | 90 | 365

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; payload?: { invested?: number } }>
    label?: string
}) {
    if (!active || !payload?.length) return null
    const value = payload[0].value
    const invested = payload[0].payload?.invested
    const pnl = invested !== undefined ? value - invested : null
    const pnlPos = (pnl ?? 0) >= 0

    return (
        <div className="bg-navy-950/95 border border-white/[0.1] backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-glass text-xs min-w-[160px]">
            <p className="text-gray-500 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">{label}</p>
            <p className="font-bold text-white font-mono text-sm">{formatUSD(value)}</p>
            {pnl !== null && (
                <p className={cn(
                    'font-mono text-[10px] font-semibold mt-1',
                    pnlPos ? 'text-profit' : 'text-loss',
                )}>
                    PnL: {pnlPos ? '+' : ''}{formatUSD(pnl)}
                </p>
            )}
        </div>
    )
}

// ─── Mini sparkline for stat cards ────────────────────────────────────────────
function StatSparkline({ data, positive }: { data: number[]; positive: boolean }) {
    if (data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const w = 72
    const h = 24
    const path = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((v - min) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    const stroke = positive ? '#03c076' : '#f6465d'

    return (
        <svg width={w} height={h} className="opacity-90 shrink-0" aria-hidden>
            <defs>
                <linearGradient id={`sg-${positive ? 'p' : 'n'}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#sg-${positive ? 'p' : 'n'})`} />
            <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

// ─── Stat card with sparkline ────────────────────────────────────────────────
function StatTile({
    label, value, sub, accent, icon, loading, trend, sparklineData, sparklinePositive,
}: {
    label: string
    value: string
    sub?: string
    accent: 'cyan' | 'profit' | 'loss' | 'amber'
    icon: React.ReactNode
    loading?: boolean
    trend?: number
    sparklineData?: number[]
    sparklinePositive?: boolean
}) {
    const accentMap = {
        cyan:   { bg: 'from-accent-cyan/15 to-accent-cyan/5',   text: 'text-accent-cyan',   border: 'border-accent-cyan/15' },
        profit: { bg: 'from-profit/15 to-profit/5',             text: 'text-profit',         border: 'border-profit/15' },
        loss:   { bg: 'from-loss/15 to-loss/5',                 text: 'text-loss',           border: 'border-loss/15' },
        amber:  { bg: 'from-amber-500/15 to-amber-500/5',       text: 'text-amber-400',      border: 'border-amber-500/15' },
    }
    const a = accentMap[accent]
    const trendPos = (trend ?? 0) >= 0

    return (
        <div className={cn(
            'group relative overflow-hidden rounded-2xl border bg-card-gradient p-5 transition-all duration-200',
            'hover:border-white/[0.12] hover:shadow-glass',
            a.border,
        )}>
            {/* Decorative glow */}
            <div className={cn('absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-50 bg-gradient-to-br', a.bg)} />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center bg-gradient-to-br', a.bg, a.border, a.text)}>
                        {icon}
                    </div>
                    {trend !== undefined && !loading && (
                        <span className={cn(
                            'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                            trendPos ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10',
                        )}>
                            {trendPos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {trendPos ? '+' : ''}{trend.toFixed(2)}%
                        </span>
                    )}
                </div>

                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    {label}
                </p>

                {loading ? (
                    <Skeleton className="h-7 w-32 rounded-lg" />
                ) : (
                    <p className="text-2xl font-extrabold text-white font-mono tracking-tight leading-tight">
                        {value}
                    </p>
                )}

                <div className="flex items-end justify-between mt-2 gap-2">
                    {sub && (
                        <p className="text-[10px] text-gray-500 font-semibold truncate flex-1">
                            {sub}
                        </p>
                    )}
                    {sparklineData && sparklineData.length >= 2 && (
                        <StatSparkline data={sparklineData} positive={sparklinePositive ?? true} />
                    )}
                </div>
            </div>
        </div>
    )
}

const RANGES: { label: string; value: DayRange }[] = [
    { label: '7D', value: 7 },
    { label: '1M', value: 30 },
    { label: '3M', value: 90 },
    { label: '1Y', value: 365 },
]

// ─── Performance chart ───────────────────────────────────────────────────────
function PortfolioChart({ summary }: { summary?: { totalCurrentValue: number; totalInvestedValue: number } }) {
    const [days, setDays] = useState<DayRange>(30)

    const { data: history, isLoading } = useQuery({
        queryKey: ['portfolio', 'history', days],
        queryFn: () => getPortfolioHistory(days),
        staleTime: 1000 * 60 * 5,
    })

    const chartData = useMemo(() => {
        if (!history) return []
        const points = history.map((p) => ({
            date: new Date(p.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
            value: p.totalValue,
            invested: p.totalInvested,
        }))

        // If we only have 1 snapshot, append a "live now" point so the chart
        // can draw a line instead of a lonely dot.
        if (points.length === 1 && summary) {
            points.push({
                date: 'Now',
                value: summary.totalCurrentValue,
                invested: summary.totalInvestedValue,
            })
        }
        return points
    }, [history, summary])

    // Compute Y-domain with padding so flat data still has visible range.
    const yDomain = useMemo<[number, number]>(() => {
        if (chartData.length === 0) return [0, 1]
        const values = chartData.map(d => d.value)
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min
        // If range is tiny (< 1% of value), pad to ±5% so the area chart isn't a flat ribbon
        const pad = range > min * 0.01 ? range * 0.15 : Math.max(min * 0.05, 1)
        return [Math.max(0, min - pad), max + pad]
    }, [chartData])

    const { change, positive, currentValue, baselineInvested } = useMemo(() => {
        if (chartData.length < 2) {
            return { change: null, positive: true, currentValue: chartData[0]?.value, baselineInvested: chartData[0]?.invested }
        }
        const first = chartData[0].value
        const last = chartData[chartData.length - 1].value
        const pct = first === 0 ? 0 : ((last - first) / first) * 100
        return {
            change: pct,
            positive: pct >= 0,
            currentValue: last,
            baselineInvested: chartData[chartData.length - 1].invested,
        }
    }, [chartData])

    const strokeColor = positive ? '#03c076' : '#f6465d'

    return (
        <Card className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Performance History</h2>
                        {change !== null && (
                            <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md',
                                positive ? 'text-profit bg-profit/10 border border-profit/20'
                                         : 'text-loss bg-loss/10 border border-loss/20',
                            )}>
                                {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {positive ? '+' : ''}{change.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    {currentValue !== undefined && (
                        <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
                            {formatUSD(currentValue)}
                        </p>
                    )}
                </div>

                {/* Range tabs */}
                <div className="flex gap-0.5 bg-navy-950/60 p-1 rounded-xl border border-white/[0.04]">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setDays(r.value)}
                            className={cn(
                                'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-150',
                                days === r.value
                                    ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-white border border-white/[0.08] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300',
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart body */}
            {isLoading ? (
                <Skeleton className="h-64 rounded-xl" />
            ) : !chartData.length ? (
                <div className="h-64 flex flex-col items-center justify-center text-center gap-3 px-6">
                    <div className="w-14 h-14 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.04]">
                        <Activity size={22} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-gray-300 text-sm font-semibold">Chưa có lịch sử performance</p>
                        <p className="text-gray-500 text-xs font-medium mt-1">
                            Snapshots được tạo daily lúc 00:00 UTC. Hãy thêm giao dịch để bắt đầu.
                        </p>
                    </div>
                </div>
            ) : chartData.length === 1 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center gap-3 px-6">
                    <div className="w-14 h-14 bg-accent-cyan/10 rounded-2xl flex items-center justify-center border border-accent-cyan/20">
                        <Sparkles size={22} className="text-accent-cyan" />
                    </div>
                    <div>
                        <p className="text-gray-300 text-sm font-semibold">Chỉ có 1 snapshot duy nhất</p>
                        <p className="text-gray-500 text-xs font-medium mt-1">
                            Cần ≥ 2 snapshot để vẽ biểu đồ. Snapshot kế tiếp lúc 00:00 UTC.
                        </p>
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                                <stop offset="60%" stopColor={strokeColor} stopOpacity={0.08} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                            tickLine={false} axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                            tickLine={false} axisLine={false}
                            tickFormatter={(v: number) => {
                                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
                                if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`
                                return `$${v.toFixed(0)}`
                            }}
                            width={56}
                        />
                        <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        {baselineInvested !== undefined && (
                            <ReferenceLine
                                y={baselineInvested}
                                stroke="rgba(255,255,255,0.18)"
                                strokeDasharray="4 4"
                                label={{
                                    value: `Invested ${formatUSD(baselineInvested)}`,
                                    position: 'insideTopRight',
                                    fill: '#9ca3af',
                                    fontSize: 9,
                                    fontWeight: 700,
                                }}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={strokeColor}
                            strokeWidth={2.5}
                            fill="url(#areaGrad)"
                            dot={false}
                            activeDot={{ r: 5, fill: strokeColor, stroke: '#0b0e11', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </Card>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
    useDocumentTitle('Dashboard')
    const { user } = useAuth()

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

    // 30-day history for stat sparklines
    const { data: history30 } = useQuery({
        queryKey: ['portfolio', 'history', 30],
        queryFn: () => getPortfolioHistory(30),
        staleTime: 1000 * 60 * 5,
    })

    const recentTx = txPaged?.items ?? []
    const pnlPos = (summary?.totalProfitLoss ?? 0) >= 0

    // Sparkline data points for Portfolio Value card
    const valueSpark = useMemo(() => history30?.map(p => p.totalValue) ?? [], [history30])
    const pnlSpark   = useMemo(() => history30?.map(p => p.profitLoss) ?? [], [history30])
    const valuePositive = valueSpark.length >= 2 && valueSpark[valueSpark.length - 1] >= valueSpark[0]

    return (
        <div className="space-y-6 max-w-7xl animate-fade-in">

            {/* ── Hero greeting card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card-gradient">
                {/* Background glow blobs */}
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="success" dot>Live Prices</Badge>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                {getFormattedDate()}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            {getGreeting()},{' '}
                            <span className="bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
                                {user?.username ?? 'Trader'}
                            </span>{' '}
                            <span className="inline-block animate-float">👋</span>
                        </h1>
                        <p className="text-sm text-gray-400 mt-1.5 font-medium">
                            {loadingSummary
                                ? 'Đang tải tổng quan portfolio...'
                                : summary
                                    ? `Portfolio đang ${pnlPos ? 'lời' : 'lỗ'} ${formatUSD(Math.abs(summary.totalProfitLoss))} (${pnlPos ? '+' : ''}${summary.totalProfitLossPercentage.toFixed(2)}%)`
                                    : 'Bắt đầu với giao dịch đầu tiên để xem performance'}
                        </p>
                    </div>

                    {/* Quick action — fastest path forward */}
                    <div className="flex gap-2 shrink-0">
                        <Link to="/trade">
                            <Button variant="primary" size="md" className="shadow-glow">
                                <Activity size={14} className="mr-1.5" />
                                Trade now
                            </Button>
                        </Link>
                        <Link to="/wallets">
                            <Button variant="ghost" size="md">
                                <Wallet size={14} className="mr-1.5" />
                                Wallets
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Stat Tiles (4 cards) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile
                    label="Portfolio Value"
                    value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
                    sub={`${summary?.totalTransactionCount ?? 0} transactions`}
                    accent="cyan"
                    icon={<DollarSign size={15} />}
                    loading={loadingSummary}
                    sparklineData={valueSpark}
                    sparklinePositive={valuePositive}
                />
                <StatTile
                    label="Total P&L"
                    value={summary
                        ? `${pnlPos ? '+' : ''}${formatUSD(summary.totalProfitLoss)}`
                        : '—'}
                    trend={summary?.totalProfitLossPercentage}
                    accent={pnlPos ? 'profit' : 'loss'}
                    icon={pnlPos ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    loading={loadingSummary}
                    sparklineData={pnlSpark}
                    sparklinePositive={pnlPos}
                />
                <StatTile
                    label="Total Invested"
                    value={summary ? formatUSD(summary.totalInvestedValue) : '—'}
                    sub="Net buy − sell"
                    accent="amber"
                    icon={<Wallet size={15} />}
                    loading={loadingSummary}
                />
                <StatTile
                    label="Wallets"
                    value={loadingWallets ? '—' : String(wallets?.length ?? 0)}
                    sub={wallets?.map(w => w.name).join(' · ') || 'No wallets'}
                    accent="cyan"
                    icon={<Zap size={15} />}
                    loading={loadingWallets}
                />
            </div>

            {/* ── Performance Chart ── */}
            <PortfolioChart summary={summary} />

            {/* ── Bottom grid: Allocation + F&G + Recent Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Asset Allocation */}
                <Card className="p-5">
                    <CardHeader className="px-0 pt-0 pb-4 border-b border-white/[0.06] mb-4 flex items-center justify-between">
                        <CardTitle icon={<Activity size={15} className="text-accent-cyan" />} className="text-sm font-bold text-white uppercase tracking-wider">
                            Asset Allocation
                        </CardTitle>
                        {summary && summary.allocations.length > 0 && (
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Top {Math.min(6, summary.allocations.length)} / {summary.allocations.length}
                            </span>
                        )}
                    </CardHeader>

                    {loadingSummary ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-10 rounded-xl" />
                            ))}
                        </div>
                    ) : !summary?.allocations.length ? (
                        <EmptyState
                            icon={<Activity size={20} />}
                            title="No holdings yet"
                            description="Record a BUY transaction on any coin detail page to start building your portfolio."
                        />
                    ) : (
                        <div className="space-y-3.5">
                            {summary.allocations.slice(0, 6).map((coin, i) => {
                                // Color rotation per index — matches a typical allocation palette
                                const colors = [
                                    'from-accent-cyan to-accent-purple',
                                    'from-amber-400 to-amber-500',
                                    'from-profit to-emerald-400',
                                    'from-pink-400 to-pink-500',
                                    'from-loss to-red-400',
                                    'from-indigo-400 to-violet-500',
                                ]
                                const c = colors[i % colors.length]
                                return (
                                    <div key={`${coin.coinId}-${i}`} className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-9 h-9 rounded-xl bg-gradient-to-br border border-white/[0.06] flex items-center justify-center shrink-0',
                                            c,
                                        )}>
                                            <span className="text-[10px] font-extrabold text-navy-950 uppercase">
                                                {coin.coinSymbol.slice(0, 3)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1.5">
                                                <div className="flex items-baseline gap-1.5 min-w-0">
                                                    <span className="text-xs font-bold text-white uppercase truncate">
                                                        {coin.coinSymbol}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-semibold truncate">
                                                        {coin.coinName}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-gray-300 font-mono ml-2 shrink-0">
                                                    {coin.allocationPercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-navy-950/80 border border-white/[0.04] rounded-full overflow-hidden">
                                                <div
                                                    className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-500', c)}
                                                    style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-white font-mono w-20 text-right shrink-0">
                                            {formatUSD(coin.currentValue)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>

                {/* Fear & Greed */}
                <FearGreedWidget />

                {/* Recent Activity */}
                <Card className="p-5">
                    <CardHeader className="px-0 pt-0 pb-4 border-b border-white/[0.06] mb-4 flex items-center justify-between">
                        <CardTitle icon={<Clock size={15} className="text-accent-cyan" />} className="text-sm font-bold text-white uppercase tracking-wider">
                            Recent Activity
                        </CardTitle>
                        <Link to="/transactions">
                            <Button variant="ghost" size="sm" className="text-accent-cyan">
                                View All <ArrowRight size={12} className="ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>

                    {loadingTx ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} className="h-12 rounded-xl" />
                            ))}
                        </div>
                    ) : !recentTx.length ? (
                        <EmptyState
                            icon={<ArrowUpRight size={20} />}
                            title="No transactions yet"
                            description="Create a paper wallet and log your first transaction to view activity."
                        />
                    ) : (
                        <div className="space-y-2">
                            {recentTx.map((tx) => {
                                const isBuy = tx.type === 1
                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.03] transition cursor-default"
                                    >
                                        <div className={cn(
                                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                                            isBuy
                                                ? 'bg-profit/10 text-profit border-profit/20'
                                                : 'bg-loss/10 text-loss border-loss/20',
                                        )}>
                                            {isBuy
                                                ? <ArrowDownRight size={16} />
                                                : <ArrowUpRight size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-100">
                                                <span className={isBuy ? 'text-profit' : 'text-loss'}>
                                                    {tx.typeDisplay}
                                                </span>
                                                {' '}
                                                <span className="uppercase">{tx.coinSymbol}</span>
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                                {formatDate(tx.transactionDate)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-white font-mono">
                                                {formatUSD(tx.totalAmount)}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono font-semibold mt-0.5">
                                                {tx.quantity.toFixed(4)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
