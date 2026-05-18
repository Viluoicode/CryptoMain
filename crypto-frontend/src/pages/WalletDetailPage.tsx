// src/pages/WalletDetailPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Plus, Trash2, ArrowUpRight, ArrowDownRight,
    TrendingUp, TrendingDown, Layers, Pencil,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useWalletDetail, useDepositFiat } from '@/hooks/useWallet'
import { useWalletTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransaction'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { TransactionType, CryptoListResponse, TransactionResponse } from '@/types'

// ─── Add Transaction Modal ─────────────────────────────────────────────────────
function AddTransactionModal({ walletId, fiatBalance, onClose }: { walletId: string; fiatBalance: number; onClose: () => void }) {
    const { mutate, isPending } = useCreateTransaction()
    const toast = useToast()
    const [type, setType] = useState<TransactionType>(1)
    const [search, setSearch] = useState('')
    const [selectedCoin, setSelectedCoin] = useState<CryptoListResponse | null>(null)
    const [quantity, setQuantity] = useState('')
    const [pricePerCoin, setPricePerCoin] = useState('')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [notes, setNotes] = useState('')

    const { data: coins } = useQuery({
        queryKey: ['crypto', 'top', 50],
        queryFn: () => getTopCryptos(50),
        staleTime: 1000 * 60 * 5,
    })

    const filtered = search.trim()
        ? (coins ?? []).filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.symbol.toLowerCase().includes(search.toLowerCase())
        )
        : []

    const totalAmount = parseFloat(quantity || '0') * parseFloat(pricePerCoin || '0')
    const insufficientFiat = type === 1 && totalAmount > 0 && totalAmount > fiatBalance

    const handleSelectCoin = (coin: CryptoListResponse) => {
        setSelectedCoin(coin)
        // Round to 8 decimal places to stay within validator precision
        setPricePerCoin(parseFloat(coin.currentPrice.toFixed(8)).toString())
        setSearch('')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCoin || !quantity || !pricePerCoin) return

        // Client-side fiat balance guard
        if (insufficientFiat) {
            toast.error(
                'Không đủ số dư USD',
                `Cần ${formatUSD(totalAmount)} — Hiện có ${formatUSD(fiatBalance)}`
            )
            return
        }

        mutate(
            {
                walletId,
                coinId: selectedCoin.id,
                type,
                quantity: parseFloat(parseFloat(quantity).toFixed(8)),
                pricePerCoin: parseFloat(parseFloat(pricePerCoin).toFixed(8)),
                notes: notes || undefined,
                transactionDate: new Date(date).toISOString(),
            },
            {
                onSuccess: () => { toast.success('Transaction added'); onClose() },
                onError: (err: unknown) => {
                    // Extract server error message from Axios response
                    const axiosErr = err as { response?: { data?: { message?: string } | string } }
                    const data = axiosErr?.response?.data
                    const serverMsg = typeof data === 'object' && data !== null
                        ? data.message
                        : undefined
                    toast.error(serverMsg ?? 'Thêm giao dịch thất bại')
                },
            }
        )
    }

    const inputCls = "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
    const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Thêm giao dịch</h3>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Buy / Sell */}
                    <div className="flex gap-2">
                        {([1, 2] as TransactionType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    'flex-1 py-2 rounded-xl text-sm font-semibold transition',
                                    type === t
                                        ? t === 1 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                )}
                            >
                                {t === 1 ? '▲ Buy' : '▼ Sell'}
                            </button>
                        ))}
                    </div>

                    {/* Coin search */}
                    <div className="relative">
                        <label className={labelCls}>Coin</label>
                        {selectedCoin ? (
                            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5">
                                <img src={selectedCoin.image} alt={selectedCoin.name} className="w-5 h-5 rounded-full" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedCoin.name}</span>
                                <span className="text-xs text-gray-400 uppercase">{selectedCoin.symbol}</span>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedCoin(null); setPricePerCoin('') }}
                                    className="ml-auto text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 text-xs"
                                >✕</button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Tìm coin (vd: bitcoin, BTC)..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={inputCls}
                                />
                                {filtered.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {filtered.slice(0, 8).map((coin) => (
                                            <button
                                                key={coin.id}
                                                type="button"
                                                onClick={() => handleSelectCoin(coin)}
                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                                            >
                                                <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-5 h-5 rounded-full" />
                                                <span className="font-medium text-gray-900 dark:text-white">{coin.name}</span>
                                                <span className="text-gray-400 uppercase text-xs">{coin.symbol}</span>
                                                <span className="ml-auto text-gray-500 dark:text-gray-400 text-xs">{formatUSD(coin.currentPrice)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Quantity + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Số lượng</label>
                            <input type="number" step="any" min="0" placeholder="0.00" value={quantity}
                                onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Giá / coin (USD)</label>
                            <input type="number" step="any" min="0" placeholder="0.00" value={pricePerCoin}
                                onChange={(e) => setPricePerCoin(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    <div className={cn(
                        'rounded-xl px-4 py-3 space-y-1.5 transition-colors',
                        insufficientFiat
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-800'
                    )}>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Số dư USD</span>
                            <span className={cn(
                                'text-sm font-semibold',
                                insufficientFiat ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                            )}>
                                {formatUSD(fiatBalance)}
                            </span>
                        </div>
                        {totalAmount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Tổng giá trị</span>
                                <span className={cn(
                                    'text-sm font-bold',
                                    insufficientFiat ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                                )}>
                                    {formatUSD(totalAmount)}
                                </span>
                            </div>
                        )}
                        {insufficientFiat && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-red-500 text-sm">⚠</span>
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    Không đủ số dư — thiếu {formatUSD(totalAmount - fiatBalance)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>Ngày giao dịch</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>Ghi chú (tuỳ chọn)</label>
                        <input type="text" placeholder="Ghi chú..." value={notes}
                            onChange={(e) => setNotes(e.target.value)} className={inputCls} />
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                            Hủy
                        </button>
                        <button type="submit"
                            disabled={!selectedCoin || !quantity || !pricePerCoin || isPending || insufficientFiat}
                            className={cn(
                                'flex-1 py-2.5 text-sm font-semibold rounded-xl transition disabled:opacity-50',
                                insufficientFiat
                                    ? 'bg-red-500 text-white cursor-not-allowed'
                                    : 'bg-brand-600 text-white hover:bg-brand-700'
                            )}>
                            {isPending ? 'Đang lưu...' : insufficientFiat ? 'Không đủ số dư' : 'Thêm giao dịch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Delete Transaction Confirm ────────────────────────────────────────────────
function DeleteTxConfirm({ txId, walletId, onClose }: { txId: string; walletId: string; onClose: () => void }) {
    const { mutate, isPending } = useDeleteTransaction(walletId)
    const toast = useToast()
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <Trash2 size={18} className="text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Xóa giao dịch này?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Hành động này không thể hoàn tác.</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">Hủy</button>
                    <button
                        disabled={isPending}
                        onClick={() => mutate(txId, {
                            onSuccess: () => { toast.success('Transaction deleted'); onClose() },
                            onError: () => { toast.error('Failed to delete'); onClose() },
                        })}
                        className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition">
                        {isPending ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Edit Transaction Modal ────────────────────────────────────────────────────
function EditTransactionModal({
    tx, walletId, onClose,
}: {
    tx: { id: string; type: 1 | 2; quantity: number; pricePerCoin: number; notes: string | null; transactionDate: string }
    walletId: string
    onClose: () => void
}) {
    const { mutate, isPending } = useUpdateTransaction(walletId)
    const toast = useToast()
    const [type, setType] = useState<1 | 2>(tx.type)
    const [quantity, setQuantity] = useState(String(tx.quantity))
    const [price, setPrice] = useState(String(tx.pricePerCoin))
    const [date, setDate] = useState(tx.transactionDate.slice(0, 10))
    const [notes, setNotes] = useState(tx.notes ?? '')

    const total = parseFloat(quantity || '0') * parseFloat(price || '0')

    const inputCls = "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
    const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!quantity || !price) return
        mutate(
            {
                id: tx.id,
                req: {
                    type,
                    quantity: parseFloat(quantity),
                    pricePerCoin: parseFloat(price),
                    notes: notes || undefined,
                    transactionDate: new Date(date).toISOString(),
                },
            },
            {
                onSuccess: () => { toast.success('Transaction updated'); onClose() },
                onError: (err: unknown) => {
                    const axiosErr = err as { response?: { data?: { message?: string } | string } }
                    const data = axiosErr?.response?.data
                    const serverMsg = typeof data === 'object' && data !== null ? data.message : undefined
                    toast.error(serverMsg ?? 'Cập nhật giao dịch thất bại')
                },
            }
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Pencil size={15} className="text-brand-600 dark:text-brand-400" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Chỉnh sửa giao dịch</h3>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Buy / Sell toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        {([1, 2] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    'flex-1 py-2.5 text-sm font-semibold transition',
                                    type === t
                                        ? t === 1
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-red-500 text-white'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}
                            >
                                {t === 1 ? 'Buy' : 'Sell'}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Số lượng</label>
                            <input type="number" step="any" min="0" required value={quantity}
                                onChange={e => setQuantity(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Giá / coin (USD)</label>
                            <input type="number" step="any" min="0" required value={price}
                                onChange={e => setPrice(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Ngày giao dịch</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>Ghi chú</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Tùy chọn" className={inputCls} />
                    </div>

                    {total > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Tổng</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Hủy
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition">
                            {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function WalletDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const walletId = id!

    const { data: wallet, isLoading: loadingWallet } = useWalletDetail(walletId)
    const { data: transactions, isLoading: loadingTx } = useWalletTransactions(walletId)

    const [showAddTx, setShowAddTx] = useState(false)
    const [showDeposit, setShowDeposit] = useState(false)
    const [depositAmount, setDepositAmount] = useState('')
    const [deleteTxId, setDeleteTxId] = useState<string | null>(null)
    const [editTx, setEditTx] = useState<TransactionResponse | null>(null)
    const [txFilter, setTxFilter] = useState<'all' | 'buy' | 'sell'>('all')
    const toast = useToast()
    const depositMut = useDepositFiat(walletId)

    const filteredTx = (transactions ?? []).filter((tx) => {
        if (txFilter === 'buy') return tx.type === 1
        if (txFilter === 'sell') return tx.type === 2
        return true
    })

    const thCls = "px-5 py-3 font-medium text-xs text-gray-400 dark:text-gray-500"

    if (loadingWallet) {
        return (
            <div className="max-w-7xl space-y-4">
                <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
                <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
            </div>
        )
    }

    if (!wallet) {
        return (
            <div className="text-center py-16 text-gray-400 text-sm">
                Không tìm thấy ví.{' '}
                <button onClick={() => navigate('/wallets')} className="text-brand-600 underline">Quay lại</button>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/wallets')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{wallet.name}</h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{wallet.transactionCount} giao dịch</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddTx(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition"
                    >
                        <Plus size={16} /> Thêm giao dịch
                    </button>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl px-6 py-5 text-white">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-brand-200 text-xs mb-1">Tổng giá trị ví</p>
                            <p className="text-3xl font-bold">{formatUSD(wallet.totalValue)}</p>
                            <p className="text-brand-200 text-xs mt-1">{wallet.holdings?.length ?? 0} loại coin</p>
                        </div>
                        <div className="text-right">
                            <p className="text-brand-200 text-xs mb-1">Số dư USD (Paper Trade)</p>
                            <p className="text-2xl font-bold">{formatUSD(wallet.fiatBalance)}</p>
                            {showDeposit ? (
                                <div className="mt-2 flex gap-2 items-center">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000000"
                                        placeholder="Số tiền..."
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        className="w-28 px-2 py-1 text-sm rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 outline-none focus:border-white"
                                    />
                                    <button
                                        disabled={depositMut.isPending || !depositAmount}
                                        onClick={() => {
                                            const amt = parseFloat(depositAmount)
                                            if (!amt || amt <= 0) return
                                            depositMut.mutate(amt, {
                                                onSuccess: () => { toast.success(`Đã nạp ${formatUSD(amt)}`); setShowDeposit(false); setDepositAmount('') },
                                                onError: (err: unknown) => {
                                                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                                                    toast.error(msg ?? 'Lỗi nạp tiền')
                                                },
                                            })
                                        }}
                                        className="px-3 py-1 text-xs font-semibold bg-white text-brand-700 rounded-lg hover:bg-brand-50 disabled:opacity-50 transition"
                                    >
                                        {depositMut.isPending ? '...' : 'Nạp'}
                                    </button>
                                    <button onClick={() => setShowDeposit(false)} className="text-white/60 hover:text-white text-xs">✕</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeposit(true)}
                                    className="mt-2 text-xs text-white/70 hover:text-white underline transition"
                                >
                                    + Nạp tiền
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Holdings */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <Layers size={15} className="text-brand-600 dark:text-brand-400" />
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Holdings</h2>
                    </div>
                    {!wallet.holdings?.length ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                            Chưa có holdings. Thêm giao dịch Buy để bắt đầu.
                        </div>
                    ) : (
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {wallet.holdings.map((h) => (
                                        <tr key={h.coinId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                            <td className="px-5 py-3">
                                                <span className="font-semibold text-gray-900 dark:text-white uppercase">{h.coinSymbol}</span>
                                                <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">{h.coinName}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{h.quantity}</td>
                                            <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{formatUSD(h.averageBuyPrice)}</td>
                                            <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{formatUSD(h.currentPrice)}</td>
                                            <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatUSD(h.currentValue)}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className={cn('font-semibold', h.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {h.profitLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                        {h.profitLoss >= 0 ? '+' : ''}{formatUSD(h.profitLoss)}
                                                    </div>
                                                    <div className="text-xs font-normal">{formatPct(h.profitLossPercentage)}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Transactions */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Giao dịch</h2>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            {(['all', 'buy', 'sell'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setTxFilter(f)}
                                    className={cn(
                                        'px-3 py-1 text-xs font-medium rounded-md transition',
                                        txFilter === f
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    )}
                                >
                                    {f === 'all' ? 'Tất cả' : f === 'buy' ? 'Buy' : 'Sell'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingTx ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : filteredTx.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Không có giao dịch nào.</div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredTx.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group">
                                    <div className={cn('rounded-full p-1.5 shrink-0', tx.type === 1 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                                        {tx.type === 1
                                            ? <ArrowUpRight size={13} className="text-emerald-600 dark:text-emerald-400" />
                                            : <ArrowDownRight size={13} className="text-red-500 dark:text-red-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {tx.typeDisplay} <span className="uppercase">{tx.coinSymbol}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.transactionDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatUSD(tx.totalAmount)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{tx.quantity} coins</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => setEditTx(tx)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-500 transition"
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTxId(tx.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition"
                                            title="Xóa"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showAddTx && <AddTransactionModal walletId={walletId} fiatBalance={wallet.fiatBalance} onClose={() => setShowAddTx(false)} />}
            {deleteTxId && <DeleteTxConfirm txId={deleteTxId} walletId={walletId} onClose={() => setDeleteTxId(null)} />}
            {editTx && <EditTransactionModal tx={editTx} walletId={walletId} onClose={() => setEditTx(null)} />}
        </>
    )
}