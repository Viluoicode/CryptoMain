// src/pages/LeaderboardPage.tsx
import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Trophy, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { cn } from '@/lib/utils'
import type { LeaderboardPeriod } from '@/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  1: 'Tuần này',
  2: 'Tháng này',
  3: 'Tất cả',
}

export function LeaderboardPage() {
  useDocumentTitle('Leaderboard')
  const [period, setPeriod] = useState<LeaderboardPeriod>(1)
  const { data: entries, isLoading } = useLeaderboard(period)
  const tableRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!tableRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(tableRef.current, { cacheBust: true, backgroundColor: '#0a0e1a' })
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
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 shrink-0 animate-bounce">
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Leaderboard</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">Top traders by P&L%</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !entries?.length}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow disabled:opacity-40 disabled:pointer-events-none transition duration-150 uppercase tracking-wider"
        >
          <Download size={15} />
          {exporting ? 'Đang xuất…' : 'Xuất ảnh'}
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-0.5 bg-navy-950 p-1 rounded-xl w-fit border border-white/[0.04]">
        {([1, 2, 3] as LeaderboardPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 uppercase tracking-wider',
              period === p
                ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div ref={tableRef} className="bg-navy-900 border border-white/[0.08] rounded-2xl overflow-hidden shadow-glass">
        {/* Caption for exported image */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2.5 bg-navy-950/40">
          <Trophy size={16} className="text-yellow-400 animate-pulse" />
          <span className="font-bold text-white text-sm uppercase tracking-wider">CryptoDash Leaderboard</span>
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">— {PERIOD_LABELS[period]}</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[50px_1fr_120px_130px_100px] gap-4 px-6 py-3.5 text-xs text-gray-500 uppercase tracking-wider font-bold border-b border-white/[0.04] bg-navy-950/20">
          <span>#</span>
          <span>Trader</span>
          <span className="text-right">P&L%</span>
          <span className="text-right">Portfolio</span>
          <span className="text-right">Giao dịch</span>
        </div>

        {isLoading && (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <EmptyState
            icon={<Trophy size={24} />}
            title="Chưa có dữ liệu cho kỳ này"
            description="Cần ít nhất 2 snapshots portfolio để tính toán thứ hạng."
          />
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
                'grid grid-cols-[50px_1fr_120px_130px_100px] gap-4 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center text-sm',
                entry.rank === 1 && 'bg-yellow-500/5',
                entry.rank === 2 && 'bg-slate-300/5',
                entry.rank === 3 && 'bg-amber-600/5',
              )}
            >
              {/* Rank */}
              <div className="flex items-center">
                {medal ? (
                  <span className="text-xl filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.2)]">{medal}</span>
                ) : (
                  <span className="text-gray-500 font-mono font-bold text-xs pl-1.5">{entry.rank}</span>
                )}
              </div>

              {/* Username */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 flex items-center justify-center text-accent-cyan font-extrabold text-xs">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-bold">{entry.username}</span>
              </div>

              {/* P&L% */}
              <div className={cn('text-right font-mono font-bold text-sm flex items-center gap-1.5 justify-end', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {isPositive ? '+' : ''}{entry.profitLossPercentage.toFixed(2)}%
              </div>

              {/* Portfolio value */}
              <div className="text-right text-gray-300 font-mono font-semibold">
                ${entry.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>

              {/* Tx count */}
              <div className="text-right text-gray-500 font-bold uppercase text-[10px] tracking-wider font-mono">
                {entry.transactionCount} tx
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
