// src/pages/WalletsPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Plus, MoreHorizontal, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { useWallets, useCreateWallet, useUpdateWallet, useDeleteWallet } from '@/hooks/useWallet'
import type { WalletResponse } from '@/types'

type ModalState =
    | { type: 'none' }
    | { type: 'create' }
    | { type: 'rename'; wallet: WalletResponse }
    | { type: 'delete'; wallet: WalletResponse }

// ─── Modals ────────────────────────────────────────────────────────────────────
function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    )
}

function InputField({
    value,
    onChange,
    placeholder,
    autoFocus,
    maxLength,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    autoFocus?: boolean
    maxLength?: number
}) {
    return (
        <input
            autoFocus={autoFocus}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
        />
    )
}

function ModalActions({ onClose, submitLabel, isPending, disabled }: {
    onClose: () => void
    submitLabel: string
    isPending: boolean
    disabled?: boolean
}) {
    return (
        <div className="flex gap-2 justify-end mt-4">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
                Hủy
            </button>
            <button
                type="submit"
                disabled={disabled || isPending}
                className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition"
            >
                {isPending ? 'Đang xử lý...' : submitLabel}
            </button>
        </div>
    )
}

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
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tạo ví mới</h3>
            <form onSubmit={handleSubmit}>
                <InputField value={name} onChange={setName} placeholder="Tên ví (vd: Main Wallet)" autoFocus maxLength={50} />
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
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Đổi tên ví</h3>
            <form onSubmit={handleSubmit}>
                <InputField value={name} onChange={setName} autoFocus maxLength={50} />
                <ModalActions onClose={onClose} submitLabel="Lưu" isPending={isPending} disabled={!name.trim()} />
            </form>
        </ModalWrapper>
    )
}

function DeleteModal({ wallet, onClose }: { wallet: WalletResponse; onClose: () => void }) {
    const navigate = useNavigate()
    const { mutate, isPending } = useDeleteWallet()
    const handleDelete = () => {
        mutate(wallet.id, { onSuccess: () => { onClose(); navigate('/wallets') } })
    }
    return (
        <ModalWrapper onClose={onClose}>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={18} className="text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Xóa ví "{wallet.name}"?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tất cả giao dịch trong ví này cũng sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                >
                    Hủy
                </button>
                <button
                    disabled={isPending}
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition"
                >
                    {isPending ? 'Đang xóa...' : 'Xóa ví'}
                </button>
            </div>
        </ModalWrapper>
    )
}

// ─── Wallet Card ───────────────────────────────────────────────────────────────
function WalletCard({ wallet, onRename, onDelete }: {
    wallet: WalletResponse
    onRename: () => void
    onDelete: () => void
}) {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-gray-900 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative"
            onClick={() => navigate(`/wallets/${wallet.id}`)}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                    <Wallet size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition opacity-0 group-hover:opacity-100"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-9 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
                                <button
                                    onClick={() => { setMenuOpen(false); onRename() }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <Pencil size={14} /> Đổi tên
                                </button>
                                <button
                                    onClick={() => { setMenuOpen(false); onDelete() }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                >
                                    <Trash2 size={14} /> Xóa ví
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{wallet.name}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Tạo {new Date(wallet.createdAt).toLocaleDateString('vi-VN')}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 dark:text-gray-500">Xem chi tiết</span>
                <ArrowRight size={14} className="text-brand-500 group-hover:translate-x-1 transition-transform" />
            </div>
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ví của tôi</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {wallets?.length ?? 0} ví đang hoạt động
                        </p>
                    </div>
                    <button
                        onClick={() => setModal({ type: 'create' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition"
                    >
                        <Plus size={16} /> Tạo ví mới
                    </button>
                </div>

                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl h-44" />
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="text-center py-16 text-red-500 text-sm">
                        Không thể tải danh sách ví. Vui lòng thử lại.
                    </div>
                )}

                {!isLoading && !isError && wallets?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-4">
                            <Wallet size={28} className="text-brand-400" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Chưa có ví nào</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                            Tạo ví đầu tiên để bắt đầu theo dõi danh mục đầu tư
                        </p>
                        <button
                            onClick={() => setModal({ type: 'create' })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition"
                        >
                            <Plus size={16} /> Tạo ví ngay
                        </button>
                    </div>
                )}

                {!isLoading && !isError && (wallets?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {wallets!.map((wallet) => (
                            <WalletCard
                                key={wallet.id}
                                wallet={wallet}
                                onRename={() => setModal({ type: 'rename', wallet })}
                                onDelete={() => setModal({ type: 'delete', wallet })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {modal.type === 'create' && <CreateWalletModal onClose={close} />}
            {modal.type === 'rename' && <RenameModal wallet={modal.wallet} onClose={close} />}
            {modal.type === 'delete' && <DeleteModal wallet={modal.wallet} onClose={close} />}
        </>
    )
}