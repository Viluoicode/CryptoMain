import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Trophy, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { cn } from '@/lib/utils'
import type { LeaderboardPeriod } from '@/types'

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  1: 'Tuần này',
  2: 'Tháng này',
  3: 'Tất cả',
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>(1)
  const { data: entries, isLoading } = useLeaderboard(period)
  const tableRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!tableRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(tableRef.current, { cacheBust: true, backgroundColor: '#111827' })
      const link = document.createElement('a')
      link.download = `leaderboard-${PERIOD_LABELS[period]}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="text-yellow-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-gray-400">Top traders by P&L%</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !entries?.length}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-xl transition"
        >
          <Download size={16} />
          {exporting ? 'Đang xuất…' : 'Xuất ảnh'}
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 bg-gray-800 p-1 rounded-xl w-fit">
        {([1, 2, 3] as LeaderboardPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition',
              period === p
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div ref={tableRef} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Caption for exported image */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" />
          <span className="font-semibold text-white">CryptoDash Leaderboard</span>
          <span className="text-gray-500 text-sm">— {PERIOD_LABELS[period]}</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
          <span>#</span>
          <span>Trader</span>
          <span className="text-right">P&L%</span>
          <span className="text-right">Portfolio</span>
          <span className="text-right">Giao dịch</span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <Trophy size={40} className="opacity-20" />
            <p className="text-sm">Chưa có dữ liệu cho kỳ này</p>
            <p className="text-xs text-gray-600">Cần ít nhất 2 snapshots portfolio</p>
          </div>
        )}

        {entries?.map(entry => {
          const isPositive = entry.profitLossPercentage >= 0
          const medal =
            entry.rank === 1 ? '🥇' :
            entry.rank === 2 ? '🥈' :
            entry.rank === 3 ? '🥉' : null

          return (
            <div
              key={entry.userId}
              className={cn(
                'grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors',
                entry.rank <= 3 && 'bg-yellow-400/5',
              )}
            >
              {/* Rank */}
              <div className="flex items-center w-8">
                {medal ? (
                  <span className="text-xl">{medal}</span>
                ) : (
                  <span className="text-gray-500 font-mono text-sm">{entry.rank}</span>
                )}
              </div>

              {/* Username */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium text-sm">{entry.username}</span>
              </div>

              {/* P&L% */}
              <div className={cn('text-right font-mono font-bold text-sm flex items-center gap-1 justify-end', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositive ? '+' : ''}{entry.profitLossPercentage.toFixed(2)}%
              </div>

              {/* Portfolio value */}
              <div className="text-right text-gray-300 text-sm font-mono">
                ${entry.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>

              {/* Tx count */}
              <div className="text-right text-gray-500 text-xs">
                {entry.transactionCount} tx
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
