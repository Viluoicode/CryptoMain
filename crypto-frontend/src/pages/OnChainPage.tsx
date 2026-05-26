// src/pages/OnChainPage.tsx
import { useState } from 'react'
import { Wallet, Plus, RefreshCw, Trash2, Link, Unlink } from 'lucide-react'
import { useMetaMask } from '@/hooks/useMetaMask'
import { useOnChainWallets, useAddOnChainWallet, useSyncOnChainWallet, useRemoveOnChainWallet } from '@/hooks/useOnChain'
import { useToast } from '@/components/ui/Toast'
import type { AddOnChainWalletRequest } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const CHAINS = [
  { value: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
  { value: 'polygon',  label: 'Polygon',  symbol: 'MATIC' },
  { value: 'bsc',      label: 'BSC',      symbol: 'BNB' },
  { value: 'arbitrum', label: 'Arbitrum', symbol: 'ETH' },
]

export function OnChainPage() {
  const toast = toastFn()
  function toastFn() { return useToast() }

  const mm = useMetaMask()
  const { data: wallets, isLoading } = useOnChainWallets()
  const addWallet    = useAddOnChainWallet()
  const syncWallet   = useSyncOnChainWallet()
  const removeWallet = useRemoveOnChainWallet()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddOnChainWalletRequest>({ address: '', label: '', chain: 'ethereum' })

  async function handleConnect() {
    const account = await mm.connect()
    if (account) {
      setForm(f => ({ ...f, address: account, label: 'MetaMask Wallet' }))
      setShowForm(true)
    }
  }

  async function handleAdd() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.address)) {
      toast.error('Địa chỉ ví không hợp lệ', 'Định dạng EVM: 0x + 40 ký tự hex')
      return
    }
    if (!form.label.trim()) {
      toast.error('Nhập tên ví')
      return
    }
    try {
      await addWallet.mutateAsync(form)
      toast.success('Đã thêm ví on-chain')
      setShowForm(false)
      setForm({ address: '', label: '', chain: 'ethereum' })
    } catch (e: unknown) {
      toast.error('Lỗi thêm ví', (e as Error).message)
    }
  }

  async function handleSync(id: string) {
    try {
      await syncWallet.mutateAsync(id)
      toast.success('Đã đồng bộ số dư')
    } catch {
      toast.error('Không thể đồng bộ')
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Xoá ví khỏi danh sách?')) return
    await removeWallet.mutateAsync(id)
    toast.success('Đã xoá ví')
  }

  const selectCls = "w-full bg-navy-950/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/40 transition hover:border-white/[0.12] font-semibold appearance-none"
  const inputCls = "w-full bg-navy-950/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/40 transition hover:border-white/[0.12] placeholder-gray-600 font-bold"
  const labelCls = "text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider"

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 rounded-xl flex items-center justify-center text-accent-cyan shrink-0 animate-pulse">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight font-sans">On-Chain Wallets</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">Theo dõi ví blockchain thực tế</p>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {mm.isInstalled ? (
            mm.isConnected ? (
              <button
                onClick={() => mm.disconnect()}
                className="flex items-center gap-2 px-4 py-2 bg-navy-950 hover:bg-white/[0.03] text-gray-300 hover:text-white text-xs font-bold rounded-xl border border-white/[0.08] transition duration-150 uppercase tracking-wider"
              >
                <Unlink size={13} />
                {mm.account ? `${mm.account.slice(0, 6)}…${mm.account.slice(-4)}` : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={mm.isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold rounded-xl shadow-glow hover:brightness-110 disabled:opacity-40 transition duration-150 uppercase tracking-wider"
              >
                <Link size={13} />
                {mm.isLoading ? 'Đang kết nối…' : 'Kết kết MetaMask'}
              </button>
            )
          ) : (
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1 bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-xl uppercase tracking-wider">
              MetaMask chưa cài
            </span>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl shadow-glow hover:brightness-110 transition duration-150 uppercase tracking-wider"
          >
            <Plus size={16} />
            Thêm ví
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="p-5 space-y-4 border-accent-cyan/25 animate-scale-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Plus size={14} className="text-accent-cyan" /> Thêm ví on-chain
          </h3>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Địa chỉ ví (EVM)</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value.trim() }))}
                placeholder="0x..."
                className={cn(inputCls, 'font-mono')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tên ví</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="My ETH Wallet"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Chain</label>
                <select
                  value={form.chain}
                  onChange={e => setForm(f => ({ ...f, chain: e.target.value }))}
                  className={selectCls}
                >
                  {CHAINS.map(c => (
                    <option key={c.value} value={c.value} className="bg-navy-900">{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={addWallet.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow disabled:opacity-40 transition uppercase tracking-wider"
            >
              {addWallet.isPending ? 'Đang thêm…' : 'Thêm ví'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ address: '', label: '', chain: 'ethereum' }) }}
              className="px-5 py-2.5 bg-white/[0.04] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider"
            >
              Huỷ
            </button>
          </div>
        </Card>
      )}

      {/* Wallet list */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-44 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && (!wallets || wallets.length === 0) && (
        <EmptyState
          icon={<Wallet size={24} />}
          title="Chưa có ví on-chain nào"
          description="Kết nối MetaMask hoặc nhập địa chỉ ví thủ công để theo dõi số dư thực tế."
        />
      )}

      <div className="space-y-4">
        {wallets?.map(wallet => (
          <Card key={wallet.id} className="p-5 space-y-4 hover:border-white/[0.12] transition duration-200">
            {/* Wallet header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white text-base">{wallet.label}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan uppercase tracking-wider">
                    {wallet.chain}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono font-semibold mt-1">
                  {wallet.address.slice(0, 12)}…{wallet.address.slice(-10)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(wallet.id)}
                  disabled={syncWallet.isPending}
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-gray-400 hover:text-white transition"
                  title="Đồng bộ số dư"
                >
                  <RefreshCw size={14} className={syncWallet.isPending ? 'animate-spin text-accent-cyan' : ''} />
                </button>
                <button
                  onClick={() => handleRemove(wallet.id)}
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 transition"
                  title="Xóa ví"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Native balance */}
            <div className="flex items-center gap-3 bg-navy-950/60 border border-white/[0.04] rounded-xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 flex items-center justify-center text-accent-cyan text-[10px] font-bold uppercase shrink-0">
                {wallet.nativeSymbol}
              </div>
              <div>
                <p className="text-white font-mono font-bold text-sm">
                  {wallet.nativeBalance.toFixed(6)} {wallet.nativeSymbol}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                  {wallet.lastSyncedAt
                    ? `Cập nhật: ${new Date(wallet.lastSyncedAt).toLocaleString('vi-VN')}`
                    : 'Chưa đồng bộ'}
                </p>
              </div>
            </div>

            {/* Token balances */}
            {wallet.tokens.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">ERC-20 Tokens</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {wallet.tokens.slice(0, 6).map(token => (
                    <div key={token.contractAddress} className="flex items-center justify-between bg-navy-950/30 border border-white/[0.02] rounded-lg px-3 py-2 text-xs">
                      <span className="text-gray-500 font-bold uppercase">
                        {token.symbol || token.contractAddress.slice(0, 6) + '…'}
                      </span>
                      <span className="text-white font-mono font-bold">{token.balance.toFixed(4)}</span>
                    </div>
                  ))}
                  {wallet.tokens.length > 6 && (
                    <div className="flex items-center justify-center bg-navy-950/30 border border-white/[0.02] rounded-lg px-3 py-2 text-[10px] font-bold text-accent-cyan uppercase tracking-wider">
                      +{wallet.tokens.length - 6} Token khác
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
