// src/pages/WalletsPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Wallet, Plus, MoreHorizontal, Pencil, Trash2,
    ArrowRight, CreditCard, ArrowLeftRight, AlertTriangle,
} from 'lucide-react'
import { useWallets, useCreateWallet, useUpdateWallet, useDeleteWallet, useWalletDetail, useTransferWallet } from '@/hooks/useWallet'
import { useToast } from '@/components/ui/Toast'
import { formatUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { WalletResponse } from '@/types'

type ModalState =
    | { type: 'none' }
    | { type: 'create' }
    | { type: 'rename'; wallet: WalletResponse }
    | { type: 'delete'; wallet: WalletResponse }
    | { type: 'transfer'; wallet: WalletResponse }

// ─── Modal shell ───────────────────────────────────────────────────────────────
function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    )
}

function ModalInput({
    value, onChange, placeholder, autoFocus, maxLength,
}: {
    value: string; onChange: (v: string) => void
    placeholder?: string; autoFocus?: boolean; maxLength?: number
}) {
    return (
        <input
            autoFocus={autoFocus}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
        />
    )
}

function ModalActions({ onClose, submitLabel, isPending, disabled }: {
    onClose: () => void; submitLabel: string; isPending: boolean; disabled?: boolean
}) {
    return (
        <div className="flex gap-2 justify-end mt-4">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-xl transition"
            >
                Hủy
            </button>
            <button
                type="submit"
                disabled={disabled || isPending}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition"
            >
                {isPending ? 'Đang xử lý...' : submitLabel}
            </button>
        </div>
    )
}

// ─── Modals ────────────────────────────────────────────────────────────────────
function CreateWalletModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('')
    const { mutate, isPending } = useCreateWallet()
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        mutate({ name: name.trim() }, { onSuccess: onClose })
    }
    return (
        <ModalWrapper onClose={onClose}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Plus size={18} className="text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Tạo ví mới</h3>
            </div>
            <form onSubmit={handleSubmit}>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                    Tên ví
                </label>
                <ModalInput
                    value={name} onChange={setName}
                    placeholder="VD: Main Wallet, Trading..." autoFocus maxLength={50}
                />
                <p className="text-xs text-gray-600 mt-2">
                    Ví mới bắt đầu với <span className="text-emerald-400 font-medium">$10,000</span> paper money
                </p>
                <ModalActions onClose={onClose} submitLabel="Tạo ví" isPending={isPending} disabled={!name.trim()} />
            </form>
        </ModalWrapper>
    )
}

function RenameModal({ wallet, onClose }: { wallet: WalletResponse; onClose: () => void }) {
    const [name, setName] = useState(wallet.name)
    const { mutate, isPending } = useUpdateWallet(wallet.id)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        mutate({ name: name.trim() }, { onSuccess: onClose })
    }
    return (
        <ModalWrapper onClose={onClose}>
            <h3 className="text-base font-semibold text-white mb-4">Đổi tên ví</h3>
            <form onSubmit={handleSubmit}>
                <ModalInput value={name} onChange={setName} autoFocus maxLength={50} />
                <ModalActions onClose={onClose} submitLabel="Lưu" isPending={isPending} disabled={!name.trim()} />
            </form>
        </ModalWrapper>
    )
}

function DeleteModal({ wallet, onClose }: { wallet: WalletResponse; onClose: () => void }) {
    const navigate = useNavigate()
    const { mutate, isPending } = useDeleteWallet()
    const { data: detail, isLoading: detailLoading } = useWalletDetail(wallet.id)

    const hasHoldings = (detail?.holdings?.length ?? 0) > 0

    const handleDelete = () =>
        mutate(wallet.id, { onSuccess: () => { onClose(); navigate('/wallets') } })

    return (
        <ModalWrapper onClose={onClose}>
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                <Trash2 size={18} className="text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
                Xóa ví &quot;{wallet.name}&quot;?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                Tất cả giao dịch trong ví này cũng sẽ bị xóa vĩnh viễn.
            </p>

            {/* Holdings warning */}
            {detailLoading ? (
                <div className="h-10 bg-gray-800 animate-pulse rounded-xl mb-4" />
            ) : hasHoldings ? (
                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                    <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                        Ví này còn{' '}
                        <span className="font-semibold">{detail!.holdings.length} loại coin</span>
                        {' '}(trị giá {formatUSD(detail!.totalValue)}).
                        Xóa ví sẽ mất toàn bộ holdings và lịch sử giao dịch.
                    </p>
                </div>
            ) : null}

            <div className="flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-xl transition"
                >
                    Hủy
                </button>
                <button
                    disabled={isPending || detailLoading}
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition"
                >
                    {isPending ? 'Đang xóa...' : 'Xóa ví'}
                </button>
            </div>
        </ModalWrapper>
    )
}

function TransferModal({ wallet, onClose }: { wallet: WalletResponse; onClose: () => void }) {
    const { data: wallets = [] } = useWallets()
    const { mutate, isPending } = useTransferWallet()
    const toast = useToast()

    const [toWalletId, setToWalletId] = useState('')
    const [amount, setAmount]         = useState('')

    const otherWallets = wallets.filter((w) => w.id !== wallet.id)
    const numAmount    = parseFloat(amount || '0')
    const isValid      = !!toWalletId && numAmount > 0 && numAmount <= wallet.fiatBalance
    const toWallet     = wallets.find((w) => w.id === toWalletId)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isValid) return
        mutate(
            { fromWalletId: wallet.id, toWalletId, amount: numAmount },
            {
                onSuccess: () => {
                    toast.success(
                        'Chuyển khoản thành công',
                        `${formatUSD(numAmount)} → ${toWallet?.name ?? ''}`,
                    )
                    onClose()
                },
                onError: () => toast.error('Chuyển khoản thất bại', 'Vui lòng thử lại'),
            },
        )
    }

    return (
        <ModalWrapper onClose={onClose}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <ArrowLeftRight size={18} className="text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-white">Chuyển khoản</h3>
                    <p className="text-xs text-gray-500">Từ: {wallet.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* To wallet */}
                <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                        Đến ví
                    </label>
                    {otherWallets.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Không có ví nào khác để chuyển</p>
                    ) : (
                        <select
                            value={toWalletId}
                            onChange={(e) => setToWalletId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                        >
                            <option value="">Chọn ví...</option>
                            {otherWallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name} — {formatUSD(w.fiatBalance)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                        Số tiền (USD)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={wallet.fiatBalance}
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 pr-16 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(wallet.fiatBalance.toFixed(2))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                        >
                            MAX
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                        Khả dụng: <span className="text-gray-300 font-mono">{formatUSD(wallet.fiatBalance)}</span>
                    </p>
                    {numAmount > wallet.fiatBalance && (
                        <p className="text-xs text-red-400 mt-1">Số tiền vượt quá số dư khả dụng</p>
                    )}
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-xl transition"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid || isPending || otherWallets.length === 0}
                        className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition"
                    >
                        {isPending ? 'Đang chuyển...' : 'Chuyển khoản'}
                    </button>
                </div>
            </form>
        </ModalWrapper>
    )
}

// ─── Wallet Card ───────────────────────────────────────────────────────────────
const WALLET_COLORS = [
    'from-indigo-600/20 to-indigo-800/10',
    'from-violet-600/20 to-violet-800/10',
    'from-sky-600/20 to-sky-800/10',
    'from-emerald-600/20 to-emerald-800/10',
]

function WalletCard({ wallet, index, onRename, onDelete, onTransfer }: {
    wallet: WalletResponse
    index: number
    onRename: () => void
    onDelete: () => void
    onTransfer: () => void
}) {
    const navigate  = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const gradient  = WALLET_COLORS[index % WALLET_COLORS.length]
    const createdAt = new Date(wallet.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    return (
        <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer group relative overflow-hidden"
            onClick={() => navigate(`/wallets/${wallet.id}`)}
        >
            {/* Subtle gradient overlay */}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none', gradient)} />

            {/* Content */}
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
                            <Wallet size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white leading-tight">{wallet.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Tạo {createdAt}</p>
                        </div>
                    </div>

                    {/* Context menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className={cn(
                                'w-7 h-7 flex items-center justify-center rounded-lg text-gray-600',
                                'hover:bg-gray-700 hover:text-gray-300 transition opacity-0 group-hover:opacity-100',
                            )}
                        >
                            <MoreHorizontal size={15} />
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[160px]">
                                    <button
                                        onClick={() => { setMenuOpen(false); onRename() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                                    >
                                        <Pencil size={13} /> Đổi tên
                                    </button>
                                    <button
                                        onClick={() => { setMenuOpen(false); onTransfer() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                                    >
                                        <ArrowLeftRight size={13} /> Chuyển khoản
                                    </button>
                                    <div className="border-t border-gray-700/50 my-0.5" />
                                    <button
                                        onClick={() => { setMenuOpen(false); onDelete() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
                                    >
                                        <Trash2 size={13} /> Xóa ví
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Fiat Balance */}
                <div className="mb-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <CreditCard size={11} />
                        Số dư khả dụng
                    </p>
                    <p className="text-2xl font-bold text-white font-mono">
                        {formatUSD(wallet.fiatBalance)}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800 group-hover:border-gray-700 transition-colors">
                    <span className="text-xs text-gray-500">Xem chi tiết</span>
                    <ArrowRight
                        size={15}
                        className="text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-200"
                    />
                </div>
            </div>
        </div>
    )
}

// ─── Empty Wallet State ────────────────────────────────────────────────────────
function EmptyWallets({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center mb-5">
                <Wallet size={32} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Chưa có ví nào</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-xs">
                Tạo ví đầu tiên để bắt đầu theo dõi danh mục đầu tư của bạn
            </p>
            <button
                onClick={onCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition"
            >
                <Plus size={16} /> Tạo ví ngay
            </button>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function WalletsPage() {
    const { data: wallets, isLoading, isError } = useWallets()
    const [modal, setModal] = useState<ModalState>({ type: 'none' })
    const close = () => setModal({ type: 'none' })

    return (
        <>
            <div className="space-y-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Ví của tôi</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {wallets?.length
                                ? `${wallets.length} ví đang hoạt động`
                                : 'Quản lý danh mục đầu tư của bạn'}
                        </p>
                    </div>
                    <button
                        onClick={() => setModal({ type: 'create' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition"
                    >
                        <Plus size={16} /> Tạo ví mới
                    </button>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-gray-900 border border-gray-800 animate-pulse rounded-2xl h-52" />
                        ))}
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                        <p className="text-red-400 text-sm">Không thể tải danh sách ví. Vui lòng thử lại.</p>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && !isError && wallets?.length === 0 && (
                    <EmptyWallets onCreate={() => setModal({ type: 'create' })} />
                )}

                {/* Grid */}
                {!isLoading && !isError && (wallets?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {wallets!.map((wallet, idx) => (
                            <WalletCard
                                key={wallet.id}
                                wallet={wallet}
                                index={idx}
                                onRename={() => setModal({ type: 'rename', wallet })}
                                onDelete={() => setModal({ type: 'delete', wallet })}
                                onTransfer={() => setModal({ type: 'transfer', wallet })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {modal.type === 'create'   && <CreateWalletModal onClose={close} />}
            {modal.type === 'rename'   && <RenameModal wallet={modal.wallet} onClose={close} />}
            {modal.type === 'delete'   && <DeleteModal wallet={modal.wallet} onClose={close} />}
            {modal.type === 'transfer' && <TransferModal wallet={modal.wallet} onClose={close} />}
        </>
    )
}
