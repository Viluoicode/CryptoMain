// src/pages/PriceAlertsPage.tsx
import { useState } from 'react'
import { Bell, Trash2, TrendingUp, TrendingDown, Plus, BellOff } from 'lucide-react'
import { useAlerts, useDeleteAlert } from '@/hooks/usePriceAlert'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useToast } from '@/components/ui/Toast'
import { formatUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PriceAlertResponse } from '@/types'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// ── Alert row ──────────────────────────────────────────────────────────────────
function AlertRow({ alert, onDelete }: { alert: PriceAlertResponse; onDelete: () => void }) {
    const { ticks } = useLivePriceStore()
    const live = ticks[alert.coinSymbol.toLowerCase()]
    const currentPrice = live?.price

    const isAbove = alert.direction === 1
    const triggered = currentPrice !== undefined && (
        isAbove ? currentPrice >= alert.targetPrice : currentPrice <= alert.targetPrice
    )

    // Distance from target (%)
    const distance = currentPrice
        ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
        : null

    return (
        <div className={cn(
            'flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 transition-colors duration-150 text-sm',
            'hover:bg-white/[0.02]',
            triggered && 'bg-emerald-500/5',
        )}>
            {/* Icon */}
            <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                isAbove ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
            )}>
                {isAbove
                    ? <TrendingUp size={15} className="text-emerald-400" />
                    : <TrendingDown size={15} className="text-red-400" />}
            </div>

            {/* Coin info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white uppercase tracking-tight">{alert.coinSymbol}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{alert.coinName}</span>
                    {triggered && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full">
                            ✓ Đạt mục tiêu
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="font-medium">
                        {isAbove ? 'Khi giá ≥' : 'Khi giá ≤'}
                        <span className="text-white font-mono font-bold ml-1.5">{formatUSD(alert.targetPrice)}</span>
                    </span>
                    {currentPrice && (
                        <span className="text-gray-600 font-medium">
                            Hiện tại: <span className="text-gray-400 font-mono font-bold">{formatUSD(currentPrice)}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Distance badge */}
            {distance !== null && !triggered && (
                <div className={cn(
                    'text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border shrink-0 uppercase tracking-wider',
                    Math.abs(distance) < 2
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-white/[0.02] text-gray-500 border-white/[0.04]',
                )}>
                    {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                </div>
            )}

            {/* Created date */}
            <span className="text-xs text-gray-600 font-medium font-mono shrink-0 hidden sm:block">
                {new Date(alert.createdAt).toLocaleDateString('vi-VN')}
            </span>

            {/* Delete */}
            <button
                onClick={onDelete}
                className="p-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                title="Xoá alert"
            >
                <Trash2 size={14} />
            </button>
        </div>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PriceAlertsPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const { data: alerts, isLoading } = useAlerts()
    const deleteMut = useDeleteAlert()
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const activeCount = alerts?.length ?? 0

    return (
        <div className="space-y-6 max-w-3xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
                        <Bell size={18} className="animate-swing" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Price Alerts</h1>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">
                            {activeCount > 0
                                ? `${activeCount} alert đang hoạt động · Kiểm tra realtime`
                                : 'Nhận thông báo khi giá coin đạt mục tiêu'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/market')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow transition duration-150 uppercase tracking-wider"
                >
                    <Plus size={15} />
                    Tạo alert
                </button>
            </div>

            {/* How it works banner */}
            <div className="bg-accent-cyan/10 border border-accent-cyan/20 rounded-2xl px-5 py-4 flex items-start gap-3.5">
                <div className="w-2 h-2 rounded-full bg-accent-cyan mt-1.5 animate-pulse shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                    Alerts được kiểm tra <span className="text-accent-cyan font-bold uppercase tracking-wider">realtime</span> qua Binance WebSocket — không cần refresh.
                    Khi giá chạm mục tiêu, bạn nhận toast notification ngay lập tức và alert tự xoá (one-shot).
                    Để tạo alert mới, vào trang <span className="text-accent-cyan font-bold">Market</span> → click vào coin → nút 🔔 Set Alert.
                </p>
            </div>

            {/* Alerts list */}
            <Card padding="none" className="overflow-hidden">
                {isLoading ? (
                    <div className="space-y-2.5 p-5">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl animate-pulse" />)}
                    </div>
                ) : !alerts?.length ? (
                    <EmptyState
                        icon={<BellOff size={24} />}
                        title="Chưa có alert nào"
                        description="Vào trang Market, click vào bất kỳ coin nào và nhấn 🔔 để đặt alert."
                        action={{
                            label: 'Đặt alert đầu tiên',
                            onClick: () => navigate('/market')
                        }}
                    />
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {alerts.map(alert => (
                            <AlertRow
                                key={alert.id}
                                alert={alert}
                                onDelete={() => setConfirmDeleteId(alert.id)}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* Legend */}
            {!!alerts?.length && (
                <div className="flex items-center gap-6 text-[10px] font-bold text-gray-500 px-1 flex-wrap uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-md bg-amber-500/30 border border-amber-500/40" />
                        <span>Gần mục tiêu (&lt; 2%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/20 border border-emerald-500/30" />
                        <span>Đã đạt mục tiêu</span>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (!confirmDeleteId) return
                    deleteMut.mutate(confirmDeleteId, {
                        onSuccess: () => { setConfirmDeleteId(null); toast.success('Đã xoá alert') },
                        onError:   () => { toast.error('Xoá alert thất bại') },
                    })
                }}
                title="Xoá price alert?"
                message="Alert này sẽ bị xoá vĩnh viễn. Bạn có thể tạo alert mới từ trang Market."
                confirmLabel="Xoá"
                loading={deleteMut.isPending}
            />
        </div>
    )
}
