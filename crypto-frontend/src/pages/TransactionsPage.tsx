// src/pages/TransactionsPage.tsx
import { useState, useCallback } from 'react'
import {
    ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
    Search, Trash2, TrendingDown, TrendingUp, ClipboardList,
    ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useAllTransactions, useDeleteTransaction } from '@/hooks/useTransaction'
import { useToast } from '@/components/ui/Toast'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    Delete Transaction
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    This action cannot be undone. The transaction will be permanently removed.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
            <div className={cn('rounded-lg p-2.5', color)}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
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
                active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
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
                <div className="bg-brand-600 rounded-lg p-2">
                    <ClipboardList size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {totalCount > 0 ? `${totalCount} total transactions` : 'All your buy & sell history'}
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Total Transactions" value={totalCount.toString()} icon={ClipboardList} color="bg-brand-600" />
                    <StatCard label="Buy Volume (page)" value={`$${fmt(buyTotal)}`} icon={TrendingUp} color="bg-emerald-600" />
                    <StatCard label="Sell Volume (page)" value={`$${fmt(sellTotal)}`} icon={TrendingDown} color="bg-red-500" />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Search coin name or symbol…"
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shrink-0">
                    {(['All', 'Buy', 'Sell'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                                filter === f
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3" />
                            <p className="text-sm">Loading transactions…</p>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <ClipboardList size={48} className="mb-4 opacity-30" />
                        <p className="text-sm font-medium">No transactions found</p>
                        <p className="text-xs mt-1">
                            {search ? 'Try a different search term' : 'Add transactions from your wallet page'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
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
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet</th>
                                    <th className="text-left px-4 py-3">
                                        <SortHeader col="date" label="Date" current={sortCol} dir={sortDir} onClick={handleSort} />
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {items.map(tx => {
                                    const isBuy = tx.type === 1
                                    return (
                                        <tr
                                            key={tx.id}
                                            className={cn(
                                                'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                                isFetching ? 'opacity-60' : '',
                                            )}
                                        >
                                            {/* Type badge */}
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                                                    isBuy
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                                                )}>
                                                    {isBuy ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                                    {tx.typeDisplay}
                                                </span>
                                            </td>

                                            {/* Coin */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                            {tx.coinSymbol.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{tx.coinSymbol.toUpperCase()}</p>
                                                        <p className="text-xs text-gray-400">{tx.coinName}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                                {tx.quantity.toFixed(6)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                                ${fmt(tx.pricePerCoin)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                                                ${fmt(tx.totalAmount)}
                                            </td>

                                            {/* Wallet */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400 font-medium">
                                                    {tx.walletName}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {fmtDate(tx.transactionDate)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setPendingDelete(tx.id)}
                                                    title="Delete transaction"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                    <p className="text-gray-500 dark:text-gray-400">
                        Page {page} of {totalPages} · {totalCount} total
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
