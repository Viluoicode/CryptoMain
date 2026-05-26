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
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

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
        setPricePerCoin(parseFloat(coin.currentPrice.toFixed(8)).toString())
        setSearch('')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCoin || !quantity || !pricePerCoin) return

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
                onSuccess: () => { toast.success('Đã thêm giao dịch'); onClose() },
                onError: (err: unknown) => {
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

    const inputCls = "w-full bg-navy-950/60 border border-white/[0.08] text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 hover:border-white/[0.12] transition duration-200 font-medium"
    const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-navy-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-glass overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Thêm giao dịch</h3>
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
                                    'flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition duration-150',
                                    type === t
                                        ? t === 1
                                            ? 'bg-emerald-500 text-white shadow-glow'
                                            : 'bg-red-500 text-white shadow-glow'
                                        : 'bg-navy-950/60 border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.03]'
                                )}
                            >
                                {t === 1 ? '▲ Mua' : '▼ Bán'}
                            </button>
                        ))}
                    </div>

                    {/* Coin search */}
                    <div className="relative">
                        <label className={labelCls}>Coin</label>
                        {selectedCoin ? (
                            <div className="flex items-center gap-3 border border-white/[0.08] bg-navy-950/60 rounded-xl px-4 py-2.5">
                                <img src={selectedCoin.image} alt={selectedCoin.name} className="w-5 h-5 rounded-full" />
                                <span className="text-sm font-bold text-white">{selectedCoin.name}</span>
                                <span className="text-xs text-gray-500 font-bold uppercase">{selectedCoin.symbol}</span>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedCoin(null); setPricePerCoin('') }}
                                    className="ml-auto text-gray-400 hover:text-white text-xs"
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
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-navy-900 border border-white/[0.08] rounded-xl shadow-glass z-10 max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                                        {filtered.slice(0, 8).map((coin) => (
                                            <button
                                                key={coin.id}
                                                type="button"
                                                onClick={() => handleSelectCoin(coin)}
                                                className="flex items-center gap-3.5 w-full px-4 py-3 text-sm hover:bg-white/[0.04] transition text-left"
                                            >
                                                <img src={coin.image} alt={coin.name} loading="lazy" decoding="async" className="w-5 h-5 rounded-full shrink-0" />
                                                <div>
                                                    <p className="font-bold text-white leading-tight">{coin.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{coin.symbol}</p>
                                                </div>
                                                <span className="ml-auto font-mono text-gray-300 text-xs font-semibold">{formatUSD(coin.currentPrice)}</span>
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
                                onChange={(e) => setQuantity(e.target.value)} className={cn(inputCls, 'font-mono')} />
                        </div>
                        <div>
                            <label className={labelCls}>Giá / coin (USD)</label>
                            <input type="number" step="any" min="0" placeholder="0.00" value={pricePerCoin}
                                onChange={(e) => setPricePerCoin(e.target.value)} className={cn(inputCls, 'font-mono')} />
                        </div>
                    </div>

                    <div className={cn(
                        'rounded-xl px-4 py-3.5 space-y-2 border transition-colors duration-200',
                        insufficientFiat
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-navy-950/60 border-white/[0.04]'
                    )}>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-semibold uppercase tracking-wider">Số dư USD</span>
                            <span className={cn(
                                'font-mono font-bold text-sm',
                                insufficientFiat ? 'text-red-400' : 'text-white'
                            )}>
                                {formatUSD(fiatBalance)}
                            </span>
                        </div>
                        {totalAmount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-semibold uppercase tracking-wider">Tổng giá trị</span>
                                <span className={cn(
                                    'font-mono font-bold text-sm',
                                    insufficientFiat ? 'text-red-400' : 'text-white'
                                )}>
                                    {formatUSD(totalAmount)}
                                </span>
                            </div>
                        )}
                        {insufficientFiat && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-red-500/10">
                                <span className="text-red-400 text-sm">⚠</span>
                                <p className="text-xs font-bold text-red-400 leading-normal">
                                    Không đủ số dư — thiếu {formatUSD(totalAmount - fiatBalance)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Ngày giao dịch</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Ghi chú</label>
                            <input type="text" placeholder="Tùy chọn..." value={notes}
                                onChange={(e) => setNotes(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150 uppercase tracking-wider">
                            Hủy
                        </button>
                        <button type="submit"
                            disabled={!selectedCoin || !quantity || !pricePerCoin || isPending || insufficientFiat}
                            className={cn(
                                'flex-1 py-2.5 text-xs font-bold rounded-xl transition duration-150 uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none shadow-glow',
                                insufficientFiat
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white'
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-navy-900 border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-glass animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Trash2 size={18} className="text-red-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Xóa giao dịch này?</h3>
                <p className="text-xs text-gray-500 mb-5 font-semibold leading-relaxed">Hành động này không thể hoàn tác.</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150 uppercase tracking-wider">Hủy</button>
                    <button
                        disabled={isPending}
                        onClick={() => mutate(txId, {
                            onSuccess: () => { toast.success('Đã xóa giao dịch'); onClose() },
                            onError: () => { toast.error('Xóa thất bại'); onClose() },
                        })}
                        className="px-4 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none transition duration-150 uppercase tracking-wider">
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

    const inputCls = "w-full bg-navy-950/60 border border-white/[0.08] text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 hover:border-white/[0.12] transition duration-200 font-medium"
    const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"

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
                onSuccess: () => { toast.success('Đã cập nhật giao dịch'); onClose() },
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-navy-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-glass overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] flex items-center gap-2">
                    <Pencil size={15} className="text-accent-cyan" />
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Chỉnh sửa giao dịch</h3>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Buy / Sell toggle */}
                    <div className="flex border border-white/[0.08] bg-navy-950/60 rounded-xl overflow-hidden p-0.5">
                        {([1, 2] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    'flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition duration-150',
                                    type === t
                                        ? t === 1
                                            ? 'bg-emerald-500 text-white shadow-glow'
                                            : 'bg-red-500 text-white shadow-glow'
                                        : 'text-gray-400 hover:text-white'
                                    )}
                            >
                                {t === 1 ? 'Mua' : 'Bán'}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Số lượng</label>
                            <input type="number" step="any" min="0" required value={quantity}
                                onChange={e => setQuantity(e.target.value)} className={cn(inputCls, 'font-mono')} />
                        </div>
                        <div>
                            <label className={labelCls}>Giá / coin (USD)</label>
                            <input type="number" step="any" min="0" required value={price}
                                onChange={e => setPrice(e.target.value)} className={cn(inputCls, 'font-mono')} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Ngày giao dịch</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>Ghi chú</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Tùy chọn..." className={inputCls} />
                    </div>

                    {total > 0 && (
                        <div className="bg-navy-950/60 border border-white/[0.04] rounded-xl px-4 py-3 flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-semibold uppercase tracking-wider">Tổng</span>
                            <span className="font-mono font-bold text-white text-sm">
                                {formatUSD(total)}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2.5 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150 uppercase tracking-wider">
                            Hủy
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2.5 text-xs font-bold bg-gradient-to-r from-accent-cyan to-accent-purple text-white rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glow transition duration-150 uppercase tracking-wider">
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

    const thCls = "px-5 py-3.5 text-gray-500 text-xs font-bold uppercase tracking-wider"

    if (loadingWallet) {
        return (
            <div className="max-w-7xl space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <Skeleton className="h-8 w-48 rounded-xl" />
                </div>
                <Skeleton className="h-36 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
        )
    }

    if (!wallet) {
        return (
            <div className="text-center py-20 text-gray-500 text-sm font-semibold">
                Không tìm thấy ví.{' '}
                <button onClick={() => navigate('/wallets')} className="text-accent-cyan hover:underline ml-1">Quay lại</button>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6 max-w-7xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/wallets')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/[0.08] text-gray-400 hover:bg-white/[0.05] hover:text-white transition duration-200"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">{wallet.name}</h1>
                            <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">{wallet.transactionCount} giao dịch</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddTx(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-sm font-bold rounded-xl hover:brightness-110 shadow-glow transition duration-200"
                    >
                        <Plus size={16} /> Thêm giao dịch
                    </button>
                </div>

                {/* Summary Card */}
                <div className="relative bg-gradient-to-br from-accent-cyan/15 via-accent-purple/10 to-accent-pink/5 border border-accent-cyan/25 rounded-2xl px-6 py-6 text-white shadow-glow overflow-hidden">
                    <div className="absolute inset-0 bg-navy-950/30 backdrop-blur-[2px] pointer-events-none" />
                    <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
                        <div className="space-y-1">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Tổng giá trị ví</p>
                            <p className="text-3xl font-extrabold font-mono tracking-tight">{formatUSD(wallet.totalValue)}</p>
                            <p className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider pt-1">{wallet.holdings?.length ?? 0} loại coin</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Số dư USD (Paper Trade)</p>
                            <p className="text-2xl font-bold font-mono tracking-tight text-white/95">{formatUSD(wallet.fiatBalance)}</p>
                            {showDeposit ? (
                                <div className="mt-3.5 flex gap-2 items-center bg-navy-900/90 border border-white/[0.08] p-1.5 rounded-xl backdrop-blur-xl">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000000"
                                        placeholder="Số tiền..."
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        className="w-24 px-2.5 py-1 text-xs rounded-lg bg-navy-950 border border-white/[0.08] text-white placeholder-gray-500 font-mono font-bold outline-none focus:border-accent-cyan/40"
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
                                        className="px-3 py-1 text-[10px] font-extrabold bg-gradient-to-r from-accent-cyan to-accent-purple text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition uppercase tracking-wider"
                                    >
                                        {depositMut.isPending ? '...' : 'Nạp'}
                                    </button>
                                    <button onClick={() => setShowDeposit(false)} className="text-gray-400 hover:text-white text-xs px-1">✕</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeposit(true)}
                                    className="mt-2.5 text-xs font-bold text-accent-cyan hover:text-accent-cyan/80 underline underline-offset-4 transition"
                                >
                                    + Nạp tiền
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Holdings */}
                <Card padding="none" className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                        <Layers size={14} className="text-accent-cyan animate-pulse" />
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Holdings</h2>
                    </div>
                    {!wallet.holdings?.length ? (
                        <div className="py-16 text-center text-gray-500 text-sm font-semibold">
                            Chưa có holdings. Thêm giao dịch Buy để bắt đầu.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-white/[0.04]">
                                        <th className={thCls}>Coin</th>
                                        <th className={cn(thCls, 'text-right')}>Số lượng</th>
                                        <th className={cn(thCls, 'text-right')}>Giá TB mua</th>
                                        <th className={cn(thCls, 'text-right')}>Giá hiện tại</th>
                                        <th className={cn(thCls, 'text-right')}>Giá trị</th>
                                        <th className={cn(thCls, 'text-right')}>P&L</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {wallet.holdings.map((h) => (
                                        <tr key={h.coinId} className="hover:bg-white/[0.02] transition duration-150">
                                            <td className="px-5 py-3.5">
                                                <span className="font-bold text-white uppercase text-sm">{h.coinSymbol}</span>
                                                <span className="text-gray-500 font-semibold ml-1.5 text-xs">{h.coinName}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 font-semibold text-xs">{h.quantity}</td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-500 text-xs">{formatUSD(h.averageBuyPrice)}</td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">{formatUSD(h.currentPrice)}</td>
                                            <td className="px-5 py-3.5 text-right font-mono font-bold text-white">{formatUSD(h.currentValue)}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className={cn('font-bold font-mono text-xs', h.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {h.profitLoss >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                        {h.profitLoss >= 0 ? '+' : ''}{formatUSD(h.profitLoss)}
                                                    </div>
                                                    <div className="text-[10px] font-semibold text-gray-500/80 mt-0.5">{formatPct(h.profitLossPercentage)}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Transactions */}
                <Card padding="none" className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Giao dịch</h2>
                        <div className="flex gap-0.5 bg-navy-950 p-1 rounded-xl border border-white/[0.04]">
                            {(['all', 'buy', 'sell'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setTxFilter(f)}
                                    className={cn(
                                        'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-150',
                                        txFilter === f
                                            ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
                                            : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                                    )}
                                >
                                    {f === 'all' ? 'Tất cả' : f === 'buy' ? 'Mua' : 'Bán'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingTx ? (
                        <div className="space-y-2.5 p-5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 rounded-xl" />
                            ))}
                        </div>
                    ) : filteredTx.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 text-sm font-semibold">Không có giao dịch nào.</div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {filteredTx.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition duration-150 group">
                                    <div className={cn('rounded-xl p-2 border shrink-0', tx.type === 1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
                                        {tx.type === 1
                                            ? <ArrowUpRight size={14} />
                                            : <ArrowDownRight size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                            {tx.typeDisplay} <span className="uppercase text-gray-400 text-xs font-semibold">{tx.coinSymbol}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">{formatDate(tx.transactionDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white font-mono">{formatUSD(tx.totalAmount)}</p>
                                        <p className="text-xs text-gray-500 font-semibold font-mono mt-0.5">{tx.quantity} coins</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                                        <button
                                            onClick={() => setEditTx(tx)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/[0.05] hover:text-white transition duration-150"
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTxId(tx.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition duration-150"
                                            title="Xóa"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {showAddTx && <AddTransactionModal walletId={walletId} fiatBalance={wallet.fiatBalance} onClose={() => setShowAddTx(false)} />}
            {deleteTxId && <DeleteTxConfirm txId={deleteTxId} walletId={walletId} onClose={() => setDeleteTxId(null)} />}
            {editTx && <EditTransactionModal tx={editTx} walletId={walletId} onClose={() => setEditTx(null)} />}
        </>
    )
}