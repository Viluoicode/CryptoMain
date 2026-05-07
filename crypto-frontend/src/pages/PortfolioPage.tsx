// src/pages/PortfolioPage.tsx
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { getPortfolioSummary, getPortfolioPerformance } from '@/api/portfolio'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PortfolioCoinAllocation } from '@/types'

// ─── Constants ─────────────────────────────────────────────────────────────────
const PIE_COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mt-1" />
      ) : (
        <p className={cn(
          'text-2xl font-bold',
          positive === true  ? 'text-emerald-500' :
          positive === false ? 'text-red-500' :
          'text-gray-900 dark:text-white'
        )}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Tooltips ──────────────────────────────────────────────────────────────────
function CustomPieTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { pct: number } }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white uppercase mb-0.5">{payload[0].name}</p>
      <p className="text-gray-600 dark:text-gray-300">{formatUSD(payload[0].value)}</p>
      <p className="text-brand-600 dark:text-brand-400 font-medium">{payload[0].payload.pct.toFixed(1)}%</p>
    </div>
  )
}

function CustomBarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatUSD(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Holdings Table ────────────────────────────────────────────────────────────
function HoldingsTable({ allocations }: { allocations: PortfolioCoinAllocation[] }) {
  const sorted = [...allocations].sort((a, b) => b.currentValue - a.currentValue)
  const thCls = "px-5 py-3 font-medium text-xs text-gray-400 dark:text-gray-500"

  if (!sorted.length) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
        Chưa có holdings nào. Thêm giao dịch Buy để bắt đầu.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <th className={thCls}>Coin</th>
            <th className={cn(thCls, 'text-right')}>Số lượng</th>
            <th className={cn(thCls, 'text-right')}>Giá TB mua</th>
            <th className={cn(thCls, 'text-right')}>Giá hiện tại</th>
            <th className={cn(thCls, 'text-right')}>Giá trị</th>
            <th className={cn(thCls, 'text-right')}>P&L</th>
            <th className={cn(thCls, 'text-right')}>Tỷ trọng</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {sorted.map((coin) => {
            const pnl = coin.currentValue - coin.investedValue
            const pnlPct = coin.investedValue > 0 ? (pnl / coin.investedValue) * 100 : 0
            const positive = pnl >= 0

            return (
              <tr key={coin.coinId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-gray-900 dark:text-white uppercase">{coin.coinSymbol}</span>
                  <span className="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">{coin.coinName}</span>
                </td>
                <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-300">{coin.quantity}</td>
                <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-300">
                  {coin.investedValue > 0 ? formatUSD(coin.investedValue / coin.quantity) : '—'}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-300">
                  {formatUSD(coin.currentPrice)}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">
                  {formatUSD(coin.currentValue)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className={cn('font-semibold text-sm', positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                    <div className="flex items-center justify-end gap-1">
                      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {positive ? '+' : ''}{formatUSD(pnl)}
                    </div>
                    <div className="text-xs font-normal">
                      {positive ? '+' : ''}{pnlPct.toFixed(2)}%
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${Math.min(coin.allocationPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
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
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: getPortfolioSummary,
  })

  const { data: performance, isLoading: loadingPerf } = useQuery({
    queryKey: ['portfolio', 'performance'],
    queryFn: getPortfolioPerformance,
  })

  const pnlPositive = (summary?.totalProfitLoss ?? 0) >= 0

  const pieData = (summary?.allocations ?? [])
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 8)
    .map((c) => ({
      name: c.coinSymbol.toUpperCase(),
      value: c.currentValue,
      pct: c.allocationPercentage,
    }))

  const barData = performance
    ? [{ name: 'Tổng quan', Buy: performance.totalBuyAmount, Sell: performance.totalSellAmount }]
    : []

  const sectionCls = "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
  const sectionHeaderCls = "px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tổng quan danh mục đầu tư của bạn</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng giá trị"
          value={summary ? formatUSD(summary.totalCurrentValue) : '—'}
          sub={`${summary?.totalTransactionCount ?? 0} giao dịch`}
          loading={loadingSummary}
        />
        <StatCard
          label="Tổng P&L"
          value={summary ? `${pnlPositive ? '+' : ''}${formatUSD(summary.totalProfitLoss)}` : '—'}
          sub={summary ? formatPct(summary.totalProfitLossPercentage) : undefined}
          positive={pnlPositive}
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

      {/* ── Performance Cards ── */}
      {performance && !loadingPerf && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />,
              iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
              label: 'Tổng mua',
              value: formatUSD(performance.totalBuyAmount),
              sub: `${performance.totalBuyTransactions} lệnh`,
            },
            {
              icon: <ArrowDownRight size={14} className="text-red-500 dark:text-red-400" />,
              iconBg: 'bg-red-100 dark:bg-red-900/30',
              label: 'Tổng bán',
              value: formatUSD(performance.totalSellAmount),
              sub: `${performance.totalSellTransactions} lệnh`,
            },
            {
              icon: <Wallet size={14} className="text-brand-600 dark:text-brand-400" />,
              iconBg: 'bg-brand-100 dark:bg-brand-900/30',
              label: 'Net đầu tư',
              value: formatUSD(performance.netInvested),
              sub: 'Buy - Sell',
            },
            {
              icon: performance.unrealizedProfitLoss >= 0
                ? <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                : <TrendingDown size={14} className="text-red-500 dark:text-red-400" />,
              iconBg: performance.unrealizedProfitLoss >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-red-100 dark:bg-red-900/30',
              label: 'Unrealized P&L',
              value: `${performance.unrealizedProfitLoss >= 0 ? '+' : ''}${formatUSD(performance.unrealizedProfitLoss)}`,
              sub: formatPct(performance.unrealizedProfitLossPercentage),
              valueColor: performance.unrealizedProfitLoss >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', item.iconBg)}>
                  {item.icon}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{item.label}</span>
              </div>
              <p className={cn('text-lg font-bold', item.valueColor ?? 'text-gray-900 dark:text-white')}>
                {item.value}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Phân bổ danh mục</h2>
          </div>
          <div className="p-5">
            {loadingSummary ? (
              <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ) : !pieData.length ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Chưa có holdings
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip content={<CustomPieTooltip />} />
                  <Legend formatter={(value: string) => (
                    <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Buy vs Sell</h2>
          </div>
          <div className="p-5">
            {loadingPerf ? (
              <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ) : !performance ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                      width={55}
                    />
                    <BarTooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="Buy" name="Mua" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={80} />
                    <Bar dataKey="Sell" name="Bán" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">Tổng mua</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatUSD(performance.totalBuyAmount)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-red-500 dark:text-red-400 mb-0.5">Tổng bán</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-300">{formatUSD(performance.totalSellAmount)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Holdings Table ── */}
      <div className={sectionCls}>
        <div className={sectionHeaderCls}>
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Tất cả Holdings</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {summary?.allocations.length ?? 0} coin
          </span>
        </div>
        {loadingSummary ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <HoldingsTable allocations={summary?.allocations ?? []} />
        )}
      </div>
    </div>
  )
}