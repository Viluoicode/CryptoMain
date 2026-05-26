// src/pages/TransactionsPage.tsx
import { useState, useCallback } from 'react'
import {
    ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
    Search, Trash2, TrendingDown, TrendingUp, ClipboardList,
    ArrowUpDown, ArrowUp, ArrowDown, Download,
} from 'lucide-react'
import { useAllTransactions, useDeleteTransaction } from '@/hooks/useTransaction'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/api/client'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 20

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type FilterType = 'All' | 'Buy' | 'Sell'
type SortDir = 'asc' | 'desc'
type SortCol = 'date' | 'coin' | 'amount' | 'quantity' | 'price' | 'type'

// ── Delete confirm dialog ──────────────────────────────────────────────────
function DeleteConfirm({
    onConfirm, onCancel, busy,
}: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-fade-in">
            <div className="bg-navy-900 border border-white/[0.08] rounded-2xl shadow-glass p-6 w-full max-w-sm animate-scale-in">
                <h3 className="text-base font-bold text-white mb-2 uppercase tracking-wider">
                    Xóa giao dịch
                </h3>
                <p className="text-xs text-gray-500 mb-5 font-semibold leading-relaxed">
                    Hành động này không thể hoàn tác. Giao dịch sẽ bị xóa vĩnh viễn khỏi ví của bạn.
                </p>
                <div className="flex gap-2.5 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150 uppercase tracking-wider"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="px-4 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none transition duration-150 uppercase tracking-wider"
                    >
                        {busy ? 'Đang xóa…' : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
    label, value, icon: Icon, color, bg,
}: { label: string; value: string; icon: typeof TrendingUp; color: string; bg: string }) {
    return (
        <div className="glass-card px-5 py-4 hover-glow transition-all duration-200 flex items-center gap-4 hover:border-white/[0.1]">
            <div className={cn('rounded-xl p-2.5 border', bg)}>
                <Icon size={18} className={color} />
            </div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5 leading-none">{value}</p>
            </div>
        </div>
    )
}

// ── Sort header button ─────────────────────────────────────────────────────
function SortHeader({
    col, label, current, dir, onClick,
}: {
    col: SortCol; label: string; current: SortCol | null; dir: SortDir; onClick: (col: SortCol) => void
}) {
    const active = current === col
    return (
        <button
            onClick={() => onClick(col)}
            className={cn(
                'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-150',
                active ? 'text-accent-cyan' : 'text-gray-500 hover:text-gray-300',
            )}
        >
            {label}
            {active
                ? (dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)
                : <ArrowUpDown size={12} className="opacity-30" />}
        </button>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function TransactionsPage() {
    useDocumentTitle('Transactions')
    const [page, setPage] = useState(1)
    const [filter, setFilter] = useState<FilterType>('All')
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sortCol, setSortCol] = useState<SortCol | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const toast = useToast()
    const apiType = filter === 'All' ? undefined : filter as 'Buy' | 'Sell'

    const { data, isLoading, isFetching } = useAllTransactions({
        page,
        pageSize: PAGE_SIZE,
        type: apiType,
        search: debouncedSearch || undefined,
        sortBy: sortCol ?? undefined,
        sortDir: sortCol ? sortDir : undefined,
    })
    const deleteMut = useDeleteTransaction()

    const handleSearchChange = useCallback((val: string) => {
        setSearch(val)
        setPage(1)
        clearTimeout((window as unknown as Record<string, number>)['_searchTimer'])
        ;(window as unknown as Record<string, number>)['_searchTimer'] = window.setTimeout(() => {
            setDebouncedSearch(val)
        }, 400)
    }, [])

    const items = data?.items ?? []
    const totalCount = data?.totalCount ?? 0
    const totalPages = data?.totalPages ?? 1

    const buyTotal = items.filter(t => t.type === (1 as TransactionType)).reduce((s, t) => s + t.totalAmount, 0)
    const sellTotal = items.filter(t => t.type === (2 as TransactionType)).reduce((s, t) => s + t.totalAmount, 0)

    function handleDeleteConfirm() {
        if (!pendingDelete) return
        deleteMut.mutate(pendingDelete, {
            onSuccess: () => {
                toast.success('Đã xóa giao dịch')
                setPendingDelete(null)
            },
            onError: () => {
                toast.error('Xóa giao dịch thất bại')
                setPendingDelete(null)
            },
        })
    }

    function handleFilterChange(f: FilterType) {
        setFilter(f)
        setPage(1)
    }

    async function handleExportCsv() {
        setExporting(true)
        try {
            const params: Record<string, string> = {}
            if (apiType) params.type = apiType
            const { data } = await apiClient.get<string>('/Transaction/export', {
                params,
                responseType: 'blob',
            })
            const url = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: 'text/csv' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Đã xuất file CSV')
        } catch {
            toast.error('Xuất file CSV thất bại')
        } finally {
            setExporting(false)
        }
    }

    function handleSort(col: SortCol) {
        if (sortCol === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        } else {
            setSortCol(col)
            setSortDir('desc')
        }
        setPage(1)
    }

    return (
        <div className="space-y-6 max-w-7xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 rounded-xl flex items-center justify-center text-accent-cyan shrink-0 animate-pulse">
                    <ClipboardList size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Transactions</h1>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">
                        {totalCount > 0 ? `${totalCount} tổng giao dịch` : 'Lịch sử giao dịch mua & bán'}
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Tổng giao dịch" value={totalCount.toString()} icon={ClipboardList} color="text-accent-cyan" bg="bg-accent-cyan/10 border-accent-cyan/20" />
                    <StatCard label="Mua (Trang này)" value={`$${fmt(buyTotal)}`} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
                    <StatCard label="Bán (Trang này)" value={`$${fmt(sellTotal)}`} icon={TrendingDown} color="text-red-400" bg="bg-red-500/10 border-red-500/20" />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Tìm kiếm theo tên hoặc mã coin…"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-white/[0.08] bg-navy-950/60 text-white placeholder-gray-500 outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 hover:border-white/[0.12] transition duration-200 font-medium"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex gap-0.5 bg-navy-950 border border-white/[0.04] rounded-xl p-1 shrink-0">
                    {(['All', 'Buy', 'Sell'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={cn(
                                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 uppercase tracking-wider',
                                filter === f
                                    ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]',
                            )}
                        >
                            {f === 'All' ? 'Tất cả' : f === 'Buy' ? 'Mua' : 'Bán'}
                        </button>
                    ))}
                </div>

                {/* Export CSV */}
                <button
                    onClick={handleExportCsv}
                    disabled={exporting || totalCount === 0}
                    title="Xuất file CSV"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.03] disabled:opacity-40 disabled:cursor-not-allowed transition duration-150 uppercase tracking-wider shrink-0"
                >
                    <Download size={14} />
                    {exporting ? 'Đang xuất…' : 'Xuất CSV'}
                </button>
            </div>

            {/* Table */}
            <Card padding="none" className="overflow-hidden">
                {isLoading ? (
                    <div className="space-y-2.5 p-5">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={24} />}
                        title="Không tìm thấy giao dịch nào"
                        description={search ? 'Thử tìm kiếm với từ khóa khác' : 'Thêm giao dịch từ trang chi tiết ví của bạn'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-navy-950/20">
                                    <th className="text-left px-5 py-3.5">
                                        <SortHeader col="type" label="Loại" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-left px-5 py-3.5">
                                        <SortHeader col="coin" label="Coin" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-5 py-3.5">
                                        <SortHeader col="quantity" label="Số lượng" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-5 py-3.5">
                                        <SortHeader col="price" label="Giá" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-5 py-3.5">
                                        <SortHeader col="amount" label="Tổng tiền" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Ví</th>
                                    <th className="text-left px-5 py-3.5">
                                        <SortHeader col="date" label="Ngày" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="px-5 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {items.map(tx => {
                                    const isBuy = tx.type === 1
                                    return (
                                        <tr
                                            key={tx.id}
                                            className={cn(
                                                'transition-colors duration-150 hover:bg-white/[0.02]',
                                                isFetching ? 'opacity-60' : '',
                                            )}
                                        >
                                            {/* Type badge */}
                                            <td className="px-5 py-3.5">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border',
                                                    isBuy
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-red-500/10 border-red-500/20 text-red-400',
                                                )}>
                                                    {isBuy ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                    {tx.typeDisplay}
                                                </span>
                                            </td>

                                            {/* Coin */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] font-bold text-accent-cyan uppercase">
                                                            {tx.coinSymbol.slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white uppercase text-sm leading-tight">{tx.coinSymbol}</p>
                                                        <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5 leading-none">{tx.coinName}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 font-semibold text-xs">
                                                {tx.quantity.toFixed(6)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-500 text-xs">
                                                ${fmt(tx.pricePerCoin)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-bold text-white text-sm">
                                                ${fmt(tx.totalAmount)}
                                            </td>

                                            {/* Wallet */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                                                    {tx.walletName}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5 text-gray-500 font-medium font-mono text-xs whitespace-nowrap">
                                                {fmtDate(tx.transactionDate)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5">
                                                <button
                                                    onClick={() => setPendingDelete(tx.id)}
                                                    title="Xóa giao dịch"
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs flex-wrap gap-3">
                    <p className="text-gray-500 font-semibold uppercase tracking-wider">
                        Trang {page} / {totalPages} · {totalCount} giao dịch
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.03] disabled:opacity-40 disabled:pointer-events-none transition font-bold uppercase tracking-wider"
                        >
                            <ChevronLeft size={13} /> Trước
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isFetching}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.03] disabled:opacity-40 disabled:pointer-events-none transition font-bold uppercase tracking-wider"
                        >
                            Sau <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {pendingDelete && (
                <DeleteConfirm
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setPendingDelete(null)}
                    busy={deleteMut.isPending}
                />
            )}
        </div>
    )
}
