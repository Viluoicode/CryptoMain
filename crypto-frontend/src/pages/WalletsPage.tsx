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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

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
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-navy-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-glass backdrop-blur-xl animate-scale-in"
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
            className="w-full bg-navy-950/60 border border-white/[0.08] text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 hover:border-white/[0.12] transition duration-200 font-sans"
        />
    )
}

function ModalActions({ onClose, submitLabel, isPending, disabled }: {
    onClose: () => void; submitLabel: string; isPending: boolean; disabled?: boolean
}) {
    return (
        <div className="flex gap-2 justify-end mt-5">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150"
            >
                Hủy
            </button>
            <button
                type="submit"
                disabled={disabled || isPending}
                className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-accent-cyan to-accent-purple text-white rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glow transition duration-150"
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
                <div className="w-10 h-10 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 rounded-xl flex items-center justify-center text-accent-cyan">
                    <Plus size={18} />
                </div>
                <h3 className="text-base font-bold text-white">Tạo ví mới</h3>
            </div>
            <form onSubmit={handleSubmit}>
                <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                    Tên ví
                </label>
                <ModalInput
                    value={name} onChange={setName}
                    placeholder="VD: Main Wallet, Trading..." autoFocus maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-3 font-medium leading-relaxed">
                    Ví mới bắt đầu với <span className="text-emerald-400 font-bold">$10,000</span> paper money.
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
            <h3 className="text-base font-bold text-white mb-4">Đổi tên ví</h3>
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
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
                <Trash2 size={18} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
                Xóa ví &quot;{wallet.name}&quot;?
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">
                Tất cả giao dịch trong ví này cũng sẽ bị xóa vĩnh viễn.
            </p>

            {/* Holdings warning */}
            {detailLoading ? (
                <div className="h-10 bg-navy-950/60 animate-pulse rounded-xl mb-4 border border-white/[0.04]" />
            ) : hasHoldings ? (
                <div className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/15 rounded-xl p-3.5 mb-4">
                    <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300 leading-relaxed font-semibold">
                        Ví này còn{' '}
                        <span>{detail!.holdings.length} loại coin</span>
                        {' '}(trị giá {formatUSD(detail!.totalValue)}).
                        Xóa ví sẽ mất toàn bộ holdings và lịch sử giao dịch.
                    </p>
                </div>
            ) : null}

            <div className="flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150"
                >
                    Hủy
                </button>
                <button
                    disabled={isPending || detailLoading}
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-40 disabled:pointer-events-none transition duration-150"
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
                <div className="w-10 h-10 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 rounded-xl flex items-center justify-center text-accent-cyan">
                    <ArrowLeftRight size={18} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-white leading-tight">Chuyển khoản</h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Từ: {wallet.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* To wallet */}
                <div className="space-y-1.5">
                    <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Đến ví
                    </label>
                    {otherWallets.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Không có ví nào khác để chuyển</p>
                    ) : (
                        <div className="relative">
                            <select
                                value={toWalletId}
                                onChange={(e) => setToWalletId(e.target.value)}
                                className="w-full bg-navy-950/60 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-cyan/40 transition appearance-none pr-10 font-medium"
                            >
                                <option value="" className="bg-navy-900">Chọn ví...</option>
                                {otherWallets.map((w) => (
                                    <option key={w.id} value={w.id} className="bg-navy-900">
                                        {w.name} — {formatUSD(w.fiatBalance)}
                                    </option>
                                ))}
                            </select>
                            <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 rotate-45 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                    <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider">
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
                            className="w-full bg-navy-950/60 border border-white/[0.08] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 pr-16 text-sm outline-none focus:border-accent-cyan/40 transition font-mono font-bold"
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(wallet.fiatBalance.toFixed(2))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-accent-cyan hover:text-accent-cyan/80 px-2.5 py-1 rounded-lg hover:bg-accent-cyan/10 transition duration-150"
                        >
                            MAX
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                        Khả dụng: <span className="text-gray-300 font-mono font-bold">{formatUSD(wallet.fiatBalance)}</span>
                    </p>
                    {numAmount > wallet.fiatBalance && (
                        <p className="text-xs text-red-400 font-semibold mt-1">Số tiền vượt quá số dư khả dụng</p>
                    )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition duration-150"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid || isPending || otherWallets.length === 0}
                        className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-accent-cyan to-accent-purple text-white rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition duration-150 shadow-glow"
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
    'from-accent-cyan/15 to-accent-purple/5 border-accent-cyan/20 hover:border-accent-cyan/40',
    'from-accent-purple/15 to-accent-pink/5 border-accent-purple/20 hover:border-accent-purple/40',
    'from-accent-blue/15 to-accent-cyan/5 border-accent-blue/20 hover:border-accent-blue/40',
    'from-emerald-500/15 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40',
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
    const cardStyle = WALLET_COLORS[index % WALLET_COLORS.length]
    const createdAt = new Date(wallet.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    return (
        <Card
            padding="none"
            className={cn(
                'relative border p-6 group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1',
                cardStyle,
            )}
            onClick={() => navigate(`/wallets/${wallet.id}`)}
        >
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center justify-center text-white/80">
                            <Wallet size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base leading-tight truncate max-w-[130px]">{wallet.name}</h3>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5 uppercase tracking-wide">Tạo {createdAt}</p>
                        </div>
                    </div>

                    {/* Context menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className={cn(
                                'w-7 h-7 flex items-center justify-center rounded-lg text-gray-400',
                                'hover:bg-white/10 hover:text-white transition duration-200',
                            )}
                        >
                            <MoreHorizontal size={15} />
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-8 bg-navy-900/95 border border-white/[0.08] rounded-xl shadow-glass z-20 overflow-hidden min-w-[160px] backdrop-blur-xl animate-scale-in">
                                    <button
                                        onClick={() => { setMenuOpen(false); onRename() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white transition duration-150 text-left font-medium"
                                    >
                                        <Pencil size={13} className="text-gray-400" /> Đổi tên
                                    </button>
                                    <button
                                        onClick={() => { setMenuOpen(false); onTransfer() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white transition duration-150 text-left font-medium"
                                    >
                                        <ArrowLeftRight size={13} className="text-gray-400" /> Chuyển khoản
                                    </button>
                                    <div className="border-t border-white/[0.06] my-1" />
                                    <button
                                        onClick={() => { setMenuOpen(false); onDelete() }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition duration-150 text-left font-semibold"
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <CreditCard size={11} />
                        Số dư khả dụng
                    </p>
                    <p className="text-2xl font-bold text-white font-mono leading-none mt-1">
                        {formatUSD(wallet.fiatBalance)}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] group-hover:border-white/[0.12] transition-colors">
                    <span className="text-xs text-gray-500 font-semibold group-hover:text-white transition duration-200">Xem chi tiết</span>
                    <ArrowRight
                        size={15}
                        className="text-gray-500 group-hover:text-accent-cyan group-hover:translate-x-1 transition-all duration-300"
                    />
                </div>
            </div>
        </Card>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function WalletsPage() {
    useDocumentTitle('Wallets')
    const { data: wallets, isLoading, isError } = useWallets()
    const [modal, setModal] = useState<ModalState>({ type: 'none' })
    const close = () => setModal({ type: 'none' })

    return (
        <>
            <div className="space-y-6 max-w-7xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">Ví của tôi</h1>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                            {wallets?.length
                                ? `${wallets.length} ví đang hoạt động`
                                : 'Quản lý danh mục đầu tư của bạn'}
                        </p>
                    </div>
                    <button
                        onClick={() => setModal({ type: 'create' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-sm font-bold rounded-xl hover:brightness-110 shadow-glow transition duration-200"
                    >
                        <Plus size={16} /> Tạo ví mới
                    </button>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-52 rounded-2xl" />
                        ))}
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-6 text-center animate-scale-in">
                        <p className="text-red-400 text-sm font-bold">Không thể tải danh sách ví. Vui lòng thử lại.</p>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && !isError && wallets?.length === 0 && (
                    <EmptyState
                        icon={<Wallet size={24} />}
                        title="Chưa có ví nào"
                        description="Tạo ví đầu tiên để bắt đầu theo dõi danh mục đầu tư của bạn"
                        action={{
                            label: 'Tạo ví ngay',
                            onClick: () => setModal({ type: 'create' }),
                        }}
                    />
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
