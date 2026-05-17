import { useState } from 'react'
import { BarChart3, Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useOrders, useCreateOrder, useCancelOrder } from '@/hooks/useOrder'
import { usePositions, useOpenPosition, useClosePosition } from '@/hooks/usePosition'
import { useWallets } from '@/hooks/useWallet'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { CreateOrderRequest, OpenPositionRequest, OrderSide, OrderType, PositionSide } from '@/types'

const ORDER_TYPE_LABELS: Record<number, string> = { 1: 'Stop Loss', 2: 'Take Profit', 3: 'Limit' }
const ORDER_STATUS_LABELS: Record<number, string> = { 1: 'Chờ', 2: 'Đã khớp', 3: 'Đã huỷ', 4: 'Lỗi' }
const ORDER_STATUS_COLORS: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10',
  2: 'text-emerald-400 bg-emerald-400/10',
  3: 'text-gray-500 bg-gray-700/50',
  4: 'text-red-400 bg-red-400/10',
}
const POSITION_STATUS_LABELS: Record<number, string> = { 1: 'Đang mở', 2: 'Đã đóng', 3: 'Liquidated' }

const POPULAR_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'ripple', symbol: 'XRP' },
]

export function FuturesOrdersPage() {
  const toast = useToast()
  const [tab, setTab] = useState<'orders' | 'positions'>('orders')
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showPositionForm, setShowPositionForm] = useState(false)

  const { data: orders }    = useOrders()
  const { data: positions } = usePositions()
  const { data: wallets }   = useWallets()

  const createOrder   = useCreateOrder()
  const cancelOrder   = useCancelOrder()
  const openPosition  = useOpenPosition()
  const closePosition = useClosePosition()

  // Order form state
  const [orderForm, setOrderForm] = useState<CreateOrderRequest>({
    walletId: '', coinId: 'bitcoin', side: 1, type: 1, triggerPrice: 0, quantity: 0,
  })

  // Position form state
  const [posForm, setPosForm] = useState<OpenPositionRequest>({
    walletId: '', coinId: 'bitcoin', side: 1, quantity: 0, leverage: 5,
  })

  async function handleCreateOrder() {
    if (!orderForm.walletId) { toast.error('Chọn ví'); return }
    if (orderForm.triggerPrice <= 0) { toast.error('Nhập giá trigger > 0'); return }
    if (orderForm.quantity <= 0) { toast.error('Nhập số lượng > 0'); return }
    try {
      await createOrder.mutateAsync(orderForm)
      toast.success('Đã tạo lệnh conditional')
      setShowOrderForm(false)
    } catch (e: unknown) { toast.error('Lỗi', (e as Error).message) }
  }

  async function handleOpenPosition() {
    if (!posForm.walletId) { toast.error('Chọn ví'); return }
    if (posForm.quantity <= 0) { toast.error('Nhập số lượng > 0'); return }
    try {
      await openPosition.mutateAsync(posForm)
      toast.success('Đã mở vị thế ký quỹ')
      setShowPositionForm(false)
    } catch (e: unknown) { toast.error('Lỗi', (e as Error).message) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-indigo-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Lệnh & Vị thế</h1>
            <p className="text-sm text-gray-400">Stop-loss, Take-profit, Margin Trading</p>
          </div>
        </div>
        <button
          onClick={() => tab === 'orders' ? setShowOrderForm(s => !s) : setShowPositionForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl transition"
        >
          <Plus size={16} />
          {tab === 'orders' ? 'Tạo lệnh' : 'Mở vị thế'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('orders')}
          className={cn('px-5 py-2 text-sm font-medium rounded-lg transition', tab === 'orders' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          Lệnh điều kiện
          {orders && orders.filter(o => o.status === 1).length > 0 && (
            <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 1).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('positions')}
          className={cn('px-5 py-2 text-sm font-medium rounded-lg transition', tab === 'positions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          Vị thế ký quỹ
          {positions && positions.filter(p => p.status === 1).length > 0 && (
            <span className="ml-2 bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">
              {positions.filter(p => p.status === 1).length}
            </span>
          )}
        </button>
      </div>

      {/* ── Create Order Form ── */}
      {tab === 'orders' && showOrderForm && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Tạo lệnh điều kiện</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ví</label>
              <select
                value={orderForm.walletId}
                onChange={e => setOrderForm(f => ({ ...f, walletId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Chọn ví --</option>
                {wallets?.map(w => <option key={w.id} value={w.id}>{w.name} (${w.fiatBalance.toFixed(0)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coin</label>
              <select
                value={orderForm.coinId}
                onChange={e => setOrderForm(f => ({ ...f, coinId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {POPULAR_COINS.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loại lệnh</label>
              <select
                value={orderForm.type}
                onChange={e => setOrderForm(f => ({ ...f, type: Number(e.target.value) as OrderType }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Stop Loss</option>
                <option value={2}>Take Profit</option>
                <option value={3}>Limit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Side</label>
              <select
                value={orderForm.side}
                onChange={e => setOrderForm(f => ({ ...f, side: Number(e.target.value) as OrderSide }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Buy</option>
                <option value={2}>Sell</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Giá trigger ($)</label>
              <input
                type="number" min="0" step="any"
                value={orderForm.triggerPrice || ''}
                onChange={e => setOrderForm(f => ({ ...f, triggerPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Số lượng</label>
              <input
                type="number" min="0" step="any"
                value={orderForm.quantity || ''}
                onChange={e => setOrderForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                placeholder="0.00000001"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateOrder} disabled={createOrder.isPending}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-xl transition">
              {createOrder.isPending ? 'Đang tạo…' : 'Tạo lệnh'}
            </button>
            <button onClick={() => setShowOrderForm(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition">Huỷ</button>
          </div>
        </div>
      )}

      {/* ── Create Position Form ── */}
      {tab === 'positions' && showPositionForm && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Mở vị thế ký quỹ</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ví</label>
              <select
                value={posForm.walletId}
                onChange={e => setPosForm(f => ({ ...f, walletId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Chọn ví --</option>
                {wallets?.map(w => <option key={w.id} value={w.id}>{w.name} (${w.fiatBalance.toFixed(0)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coin</label>
              <select
                value={posForm.coinId}
                onChange={e => setPosForm(f => ({ ...f, coinId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {POPULAR_COINS.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hướng</label>
              <select
                value={posForm.side}
                onChange={e => setPosForm(f => ({ ...f, side: Number(e.target.value) as PositionSide }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Long (Mua lên)</option>
                <option value={2}>Short (Bán xuống)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Đòn bẩy: {posForm.leverage}x</label>
              <input
                type="range" min={1} max={100} step={1}
                value={posForm.leverage}
                onChange={e => setPosForm(f => ({ ...f, leverage: Number(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Số lượng coin</label>
              <input
                type="number" min="0" step="any"
                value={posForm.quantity || ''}
                onChange={e => setPosForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                placeholder="0.001"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ký quỹ cần: <span className="text-yellow-400">giá thị trường × số lượng ÷ {posForm.leverage}x</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleOpenPosition} disabled={openPosition.isPending}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-xl transition">
              {openPosition.isPending ? 'Đang mở…' : 'Mở vị thế'}
            </button>
            <button onClick={() => setShowPositionForm(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition">Huỷ</button>
          </div>
        </div>
      )}

      {/* ── Orders Table ── */}
      {tab === 'orders' && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <span>Loại</span><span>Coin / Ví</span><span>Side</span>
            <span className="text-right">Trigger</span><span className="text-right">Qty</span>
            <span className="text-center">Trạng thái</span><span></span>
          </div>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Chưa có lệnh điều kiện nào</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-4 border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors items-center">
                <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                  {ORDER_TYPE_LABELS[order.type]}
                </span>
                <div>
                  <span className="text-white text-sm font-semibold">{order.coinSymbol}</span>
                  <p className="text-xs text-gray-500">{order.walletName}</p>
                </div>
                <span className={cn('text-xs font-bold', order.side === 1 ? 'text-emerald-400' : 'text-red-400')}>
                  {order.side === 1 ? 'BUY' : 'SELL'}
                </span>
                <span className="text-right text-gray-300 font-mono text-sm">${order.triggerPrice.toLocaleString()}</span>
                <span className="text-right text-gray-400 font-mono text-sm">{order.quantity}</span>
                <span className={cn('text-center text-xs px-2 py-0.5 rounded-full', ORDER_STATUS_COLORS[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                {order.status === 1 && (
                  <button
                    onClick={() => cancelOrder.mutate(order.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-500 hover:text-red-400 transition"
                  >
                    <X size={14} />
                  </button>
                )}
                {order.status !== 1 && <span />}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Positions Table ── */}
      {tab === 'positions' && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <span>Coin / Ví</span><span>Side</span>
            <span className="text-right">Entry</span><span className="text-right">Đòn bẩy</span>
            <span className="text-right">PnL</span><span className="text-center">Trạng thái</span><span></span>
          </div>
          {!positions || positions.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Chưa có vị thế ký quỹ nào</div>
          ) : (
            positions.map(pos => {
              const isOpen = pos.status === 1
              const pnl = isOpen ? pos.unrealizedPnL : pos.realizedPnL
              const pnlPct = isOpen ? pos.unrealizedPnLPercentage : null
              const pnlPositive = (pnl ?? 0) >= 0
              return (
                <div key={pos.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-4 border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors items-center">
                  <div>
                    <span className="text-white text-sm font-semibold">{pos.coinSymbol}</span>
                    <p className="text-xs text-gray-500">{pos.walletName}</p>
                    {isOpen && pos.currentPrice && (
                      <p className="text-xs text-gray-500 font-mono">${pos.currentPrice.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {pos.side === 1
                      ? <TrendingUp size={14} className="text-emerald-400" />
                      : <TrendingDown size={14} className="text-red-400" />}
                    <span className={cn('text-xs font-bold', pos.side === 1 ? 'text-emerald-400' : 'text-red-400')}>
                      {pos.side === 1 ? 'LONG' : 'SHORT'}
                    </span>
                  </div>
                  <span className="text-right text-gray-300 font-mono text-sm">${pos.entryPrice.toLocaleString()}</span>
                  <span className="text-right text-indigo-400 font-bold text-sm">{pos.leverage}x</span>
                  <div className="text-right">
                    {pnl !== null && pnl !== undefined ? (
                      <>
                        <p className={cn('font-mono text-sm font-bold', pnlPositive ? 'text-emerald-400' : 'text-red-400')}>
                          {pnlPositive ? '+' : ''}${pnl.toFixed(2)}
                        </p>
                        {pnlPct !== null && pnlPct !== undefined && (
                          <p className={cn('text-xs font-mono', pnlPositive ? 'text-emerald-500' : 'text-red-500')}>
                            {pnlPositive ? '+' : ''}{pnlPct.toFixed(2)}%
                          </p>
                        )}
                      </>
                    ) : <span className="text-gray-600 text-sm">—</span>}
                  </div>
                  <span className={cn('text-center text-xs px-2 py-0.5 rounded-full',
                    pos.status === 1 ? 'text-emerald-400 bg-emerald-400/10' :
                    pos.status === 3 ? 'text-red-400 bg-red-400/10' :
                    'text-gray-500 bg-gray-700/50')}>
                    {POSITION_STATUS_LABELS[pos.status]}
                  </span>
                  {isOpen ? (
                    <button
                      onClick={() => closePosition.mutate(pos.id)}
                      disabled={closePosition.isPending}
                      className="text-xs px-3 py-1 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition disabled:opacity-50"
                    >
                      Đóng
                    </button>
                  ) : <span />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
