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

// ── Helpers ────────────────────────────────────────────────────────────────
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-base font-semibold text-white mb-2">
                    Delete Transaction
                </h3>
                <p className="text-sm text-gray-400 mb-5">
                    This action cannot be undone. The transaction will be permanently removed.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {busy ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
    label, value, icon: Icon, color,
}: { label: string; value: string; icon: typeof TrendingUp; color: string }) {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-4">
            <div className={cn('rounded-lg p-2.5', color)}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-white font-mono">{value}</p>
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
                'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors',
                active ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-200',
            )}
        >
            {label}
            {active
                ? (dir === 'desc' ? <ArrowDown size={11} /> : <ArrowUp size={11} />)
                : <ArrowUpDown size={11} className="opacity-40" />}
        </button>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function TransactionsPage() {
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

    // Debounce search input
    const handleSearchChange = useCallback((val: string) => {
        setSearch(val)
        setPage(1)
        clearTimeout((window as unknown as Record<string, number>)['_searchTimer'])
        ;(window as unknown as Record<string, number>)['_searchTimer'] = window.setTimeout(() => {
            setDebouncedSearch(val)
        }, 400)
    }, [])

    // ── Derived ────────────────────────────────────────────────────────────
    const items = data?.items ?? []
    const totalCount = data?.totalCount ?? 0
    const totalPages = data?.totalPages ?? 1

    const buyTotal = items.filter(t => t.type === (1 as TransactionType)).reduce((s, t) => s + t.totalAmount, 0)
    const sellTotal = items.filter(t => t.type === (2 as TransactionType)).reduce((s, t) => s + t.totalAmount, 0)

    // ── Handlers ───────────────────────────────────────────────────────────
    function handleDeleteConfirm() {
        if (!pendingDelete) return
        deleteMut.mutate(pendingDelete, {
            onSuccess: () => {
                toast.success('Transaction deleted')
                setPendingDelete(null)
            },
            onError: () => {
                toast.error('Failed to delete transaction')
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
            toast.success('CSV exported successfully')
        } catch {
            toast.error('Failed to export CSV')
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

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 rounded-lg p-2">
                    <ClipboardList size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-sm text-gray-500">
                        {totalCount > 0 ? `${totalCount} total transactions` : 'All your buy & sell history'}
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Total Transactions" value={totalCount.toString()} icon={ClipboardList} color="bg-indigo-600" />
                    <StatCard label="Buy Volume (page)" value={`$${fmt(buyTotal)}`} icon={TrendingUp} color="bg-emerald-600" />
                    <StatCard label="Sell Volume (page)" value={`$${fmt(sellTotal)}`} icon={TrendingDown} color="bg-red-500" />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Search coin name or symbol…"
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 shrink-0">
                    {(['All', 'Buy', 'Sell'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                                filter === f
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Export CSV */}
                <button
                    onClick={handleExportCsv}
                    disabled={exporting || totalCount === 0}
                    title="Export to CSV"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                    <Download size={15} />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="space-y-0 divide-y divide-gray-800/50">
                        {/* Skeleton header */}
                        <div className="px-4 py-3 bg-gray-800/40 flex gap-6">
                            {[80, 140, 90, 90, 90, 80, 80].map((w, i) => (
                                <div key={i} className="h-3 bg-gray-700 animate-pulse rounded" style={{ width: w }} />
                            ))}
                        </div>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-4 py-4 flex items-center gap-4">
                                <div className="w-16 h-6 bg-gray-800 animate-pulse rounded-full" />
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gray-800 animate-pulse rounded-full" />
                                    <div className="w-24 h-4 bg-gray-800 animate-pulse rounded" />
                                </div>
                                <div className="ml-auto flex gap-8">
                                    {[64, 80, 80, 60, 72].map((w, j) => (
                                        <div key={j} className="h-3 bg-gray-800 animate-pulse rounded" style={{ width: w }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <ClipboardList size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium text-gray-400">No transactions found</p>
                        <p className="text-xs mt-1">
                            {search ? 'Try a different search term' : 'Add transactions from your wallet page'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 bg-gray-800/40">
                                    <th className="text-left px-4 py-3">
                                        <SortHeader col="type" label="Type" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        <SortHeader col="coin" label="Coin" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-4 py-3">
                                        <SortHeader col="quantity" label="Quantity" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-4 py-3">
                                        <SortHeader col="price" label="Price" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-right px-4 py-3">
                                        <SortHeader col="amount" label="Total" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
                                    <th className="text-left px-4 py-3">
                                        <SortHeader col="date" label="Date" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {items.map(tx => {
                                    const isBuy = tx.type === 1
                                    return (
                                        <tr
                                            key={tx.id}
                                            className={cn(
                                                'transition-colors hover:bg-gray-800/30',
                                                isFetching ? 'opacity-60' : '',
                                            )}
                                        >
                                            {/* Type badge */}
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                                                    isBuy
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-red-500/10 text-red-400',
                                                )}>
                                                    {isBuy ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                                    {tx.typeDisplay}
                                                </span>
                                            </td>

                                            {/* Coin */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-gray-300">
                                                            {tx.coinSymbol.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{tx.coinSymbol.toUpperCase()}</p>
                                                        <p className="text-xs text-gray-500">{tx.coinName}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                                                {tx.quantity.toFixed(6)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                                                ${fmt(tx.pricePerCoin)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                                                ${fmt(tx.totalAmount)}
                                            </td>

                                            {/* Wallet */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 font-medium border border-indigo-500/20">
                                                    {tx.walletName}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {fmtDate(tx.transactionDate)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setPendingDelete(tx.id)}
                                                    title="Delete transaction"
                                                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-500">
                        Page {page} of {totalPages} · {totalCount} total
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next <ChevronRight size={14} />
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
