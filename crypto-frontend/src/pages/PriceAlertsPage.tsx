// src/pages/PriceAlertsPage.tsx
import { Bell, Trash2, TrendingUp, TrendingDown, Plus, BellOff } from 'lucide-react'
import { useAlerts, useDeleteAlert } from '@/hooks/usePriceAlert'
import { useLivePriceStore } from '@/store/livePriceStore'
import { formatUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PriceAlertResponse } from '@/types'
import { useNavigate } from 'react-router-dom'

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
            'flex items-center gap-4 px-5 py-4 border-b border-gray-800/60 last:border-0',
            'hover:bg-gray-800/20 transition-colors',
            triggered && 'bg-emerald-500/5',
        )}>
            {/* Icon */}
            <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                isAbove ? 'bg-emerald-500/10' : 'bg-red-500/10',
            )}>
                {isAbove
                    ? <TrendingUp size={16} className="text-emerald-400" />
                    : <TrendingDown size={16} className="text-red-400" />}
            </div>

            {/* Coin info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white text-sm uppercase">{alert.coinSymbol}</span>
                    <span className="text-xs text-gray-500">{alert.coinName}</span>
                    {triggered && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            ✓ Đạt mục tiêu
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                        {isAbove ? 'Khi giá ≥' : 'Khi giá ≤'}
                        <span className="text-white font-mono ml-1.5">{formatUSD(alert.targetPrice)}</span>
                    </span>
                    {currentPrice && (
                        <span className="text-gray-600">
                            Hiện tại: <span className="text-gray-400 font-mono">{formatUSD(currentPrice)}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Distance badge */}
            {distance !== null && !triggered && (
                <div className={cn(
                    'text-xs font-mono px-2.5 py-1 rounded-full border shrink-0',
                    Math.abs(distance) < 2
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-gray-800 text-gray-500 border-gray-700',
                )}>
                    {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                </div>
            )}

            {/* Created date */}
            <span className="text-xs text-gray-600 shrink-0 hidden sm:block">
                {new Date(alert.createdAt).toLocaleDateString('vi-VN')}
            </span>

            {/* Delete */}
            <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
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
    const { data: alerts, isLoading } = useAlerts()
    const deleteMut = useDeleteAlert()

    const activeCount = alerts?.length ?? 0

    return (
        <div className="space-y-6 max-w-3xl">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500/20 rounded-lg p-2">
                        <Bell size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Price Alerts</h1>
                        <p className="text-sm text-gray-500">
                            {activeCount > 0
                                ? `${activeCount} alert đang hoạt động · Kiểm tra realtime qua Binance WS`
                                : 'Nhận thông báo khi giá coin đạt mục tiêu'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/market')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                >
                    <Plus size={15} />
                    Tạo alert
                </button>
            </div>

            {/* How it works banner */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 animate-pulse shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                    Alerts được kiểm tra <span className="text-indigo-400 font-medium">realtime</span> qua Binance WebSocket — không cần refresh.
                    Khi giá chạm mục tiêu, bạn nhận toast notification ngay lập tức và alert tự xoá (one-shot).
                    Để tạo alert mới, vào trang <span className="text-indigo-400">Market</span> → click vào coin → nút 🔔 Set Alert.
                </p>
            </div>

            {/* Alerts list */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="space-y-0 divide-y divide-gray-800/50">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="px-5 py-4 flex items-center gap-4">
                                <div className="w-9 h-9 bg-gray-800 animate-pulse rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-32 h-3 bg-gray-800 animate-pulse rounded" />
                                    <div className="w-48 h-3 bg-gray-800 animate-pulse rounded" />
                                </div>
                                <div className="w-16 h-6 bg-gray-800 animate-pulse rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : !alerts?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                            <BellOff size={28} className="text-gray-600" />
                        </div>
                        <p className="text-gray-400 font-medium mb-1">Chưa có alert nào</p>
                        <p className="text-sm text-gray-600 mb-5">
                            Vào trang Market, click vào bất kỳ coin nào và nhấn 🔔 để đặt alert.
                        </p>
                        <button
                            onClick={() => navigate('/market')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                        >
                            <Plus size={14} />
                            Đặt alert đầu tiên
                        </button>
                    </div>
                ) : (
                    <div>
                        {alerts.map(alert => (
                            <AlertRow
                                key={alert.id}
                                alert={alert}
                                onDelete={() => deleteMut.mutate(alert.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            {!!alerts?.length && (
                <div className="flex items-center gap-6 text-xs text-gray-600 px-1">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-500/30" />
                        <span>Gần mục tiêu (&lt; 2%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500/20" />
                        <span>Đã đạt mục tiêu</span>
                    </div>
                </div>
            )}
        </div>
    )
}
