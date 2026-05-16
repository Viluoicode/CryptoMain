import { useState } from 'react'
import { Wallet, Plus, RefreshCw, Trash2, Link, Unlink } from 'lucide-react'
import { useMetaMask } from '@/hooks/useMetaMask'
import { useOnChainWallets, useAddOnChainWallet, useSyncOnChainWallet, useRemoveOnChainWallet } from '@/hooks/useOnChain'
import { useToast } from '@/components/ui/Toast'
import type { AddOnChainWalletRequest } from '@/types'

const CHAINS = [
  { value: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
  { value: 'polygon',  label: 'Polygon',  symbol: 'MATIC' },
  { value: 'bsc',      label: 'BSC',      symbol: 'BNB' },
  { value: 'arbitrum', label: 'Arbitrum', symbol: 'ETH' },
]

export function OnChainPage() {
  const toast = useToast()
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="text-indigo-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">On-Chain Wallets</h1>
            <p className="text-sm text-gray-400">Theo dõi ví blockchain thực tế</p>
          </div>
        </div>
        <div className="flex gap-2">
          {mm.isInstalled ? (
            mm.isConnected ? (
              <button
                onClick={() => mm.disconnect()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl border border-gray-700 transition"
              >
                <Unlink size={14} />
                {mm.account ? `${mm.account.slice(0, 6)}…${mm.account.slice(-4)}` : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={mm.isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-xl transition"
              >
                <Link size={14} />
                {mm.isLoading ? 'Đang kết nối…' : 'Kết nối MetaMask'}
              </button>
            )
          ) : (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Wallet size={12} /> MetaMask chưa cài
            </span>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl transition"
          >
            <Plus size={16} />
            Thêm ví
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Thêm ví on-chain</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Địa chỉ ví (EVM)</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value.trim() }))}
                placeholder="0x..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tên ví</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="My ETH Wallet"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Chain</label>
                <select
                  value={form.chain}
                  onChange={e => setForm(f => ({ ...f, chain: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {CHAINS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={addWallet.isPending}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-xl transition"
            >
              {addWallet.isPending ? 'Đang thêm…' : 'Thêm ví'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ address: '', label: '', chain: 'ethereum' }) }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Wallet list */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (!wallets || wallets.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-500 bg-gray-900 rounded-2xl border border-gray-800">
          <Wallet size={40} className="opacity-20" />
          <p className="text-sm">Chưa có ví on-chain nào</p>
          <p className="text-xs text-gray-600">Kết nối MetaMask hoặc nhập địa chỉ ví thủ công</p>
        </div>
      )}

      <div className="space-y-4">
        {wallets?.map(wallet => (
          <div key={wallet.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
            {/* Wallet header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{wallet.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 uppercase">
                    {wallet.chain}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {wallet.address.slice(0, 10)}…{wallet.address.slice(-8)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(wallet.id)}
                  disabled={syncWallet.isPending}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-indigo-400 transition"
                  title="Sync balance"
                >
                  <RefreshCw size={14} className={syncWallet.isPending ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => handleRemove(wallet.id)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition"
                  title="Remove wallet"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Native balance */}
            <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                {wallet.nativeSymbol}
              </div>
              <div>
                <p className="text-white font-mono font-semibold">
                  {wallet.nativeBalance.toFixed(6)} {wallet.nativeSymbol}
                </p>
                <p className="text-xs text-gray-500">
                  {wallet.lastSyncedAt
                    ? `Cập nhật: ${new Date(wallet.lastSyncedAt).toLocaleString('vi-VN')}`
                    : 'Chưa đồng bộ'}
                </p>
              </div>
            </div>

            {/* Token balances */}
            {wallet.tokens.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">ERC-20 Tokens</p>
                <div className="space-y-2">
                  {wallet.tokens.slice(0, 5).map(token => (
                    <div key={token.contractAddress} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-mono text-xs">
                        {token.symbol || token.contractAddress.slice(0, 10) + '…'}
                      </span>
                      <span className="text-white font-mono">{token.balance.toFixed(4)}</span>
                    </div>
                  ))}
                  {wallet.tokens.length > 5 && (
                    <p className="text-xs text-gray-600">+{wallet.tokens.length - 5} token khác</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
