// src/pages/FuturesOrdersPage.tsx
import { useState } from 'react'
import { BarChart3, Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useOrders, useCreateOrder, useCancelOrder } from '@/hooks/useOrder'
import { usePositions, useOpenPosition, useClosePosition } from '@/hooks/usePosition'
import { useWallets } from '@/hooks/useWallet'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { CreateOrderRequest, OpenPositionRequest, OrderSide, OrderType, PositionSide } from '@/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const ORDER_TYPE_LABELS: Record<number, string> = { 1: 'Stop Loss', 2: 'Take Profit', 3: 'Limit' }
const ORDER_STATUS_LABELS: Record<number, string> = { 1: 'Chờ', 2: 'Đã khớp', 3: 'Đã huỷ', 4: 'Lỗi' }
const ORDER_STATUS_COLORS: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  2: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
  3: 'text-gray-500 bg-white/[0.03] border border-white/[0.06]',
  4: 'text-red-400 bg-red-400/10 border border-red-400/20',
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

  // Confirmation dialogs for destructive actions
  const [confirmClosePos, setConfirmClosePos]   = useState<string | null>(null)
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<string | null>(null)

  const { data: orders, isLoading: loadingOrders } = useOrders()
  const { data: positions, isLoading: loadingPositions } = usePositions()
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

  const selectCls = "w-full bg-navy-950/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/40 transition hover:border-white/[0.12] font-semibold appearance-none"
  const inputCls = "w-full bg-navy-950/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-accent-cyan/40 transition hover:border-white/[0.12] placeholder-gray-600 font-bold"
  const labelCls = "text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider"

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 rounded-xl flex items-center justify-center text-accent-cyan shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Lệnh & Vị thế</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">Stop-loss, Take-profit, Margin Trading</p>
          </div>
        </div>
        <button
          onClick={() => tab === 'orders' ? setShowOrderForm(s => !s) : setShowPositionForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow transition duration-200 uppercase tracking-wider"
        >
          <Plus size={16} />
          {tab === 'orders' ? 'Tạo lệnh' : 'Mở vị thế'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-navy-950 p-1 rounded-xl w-fit border border-white/[0.04]">
        <button
          onClick={() => setTab('orders')}
          className={cn(
            'px-5 py-2 text-xs font-bold rounded-lg transition-all duration-150 uppercase tracking-wider flex items-center gap-1.5',
            tab === 'orders'
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
          )}
        >
          Lệnh điều kiện
          {orders && orders.filter(o => o.status === 1).length > 0 && (
            <span className="ml-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {orders.filter(o => o.status === 1).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('positions')}
          className={cn(
            'px-5 py-2 text-xs font-bold rounded-lg transition-all duration-150 uppercase tracking-wider flex items-center gap-1.5',
            tab === 'positions'
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
          )}
        >
          Vị thế ký quỹ
          {positions && positions.filter(p => p.status === 1).length > 0 && (
            <span className="ml-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {positions.filter(p => p.status === 1).length}
            </span>
          )}
        </button>
      </div>

      {/* ── Create Order Form ── */}
      {tab === 'orders' && showOrderForm && (
        <Card className="p-5 space-y-4 border-accent-cyan/25 animate-scale-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Plus size={14} className="text-accent-cyan" /> Tạo lệnh điều kiện
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Ví</label>
              <select
                value={orderForm.walletId}
                onChange={e => setOrderForm(f => ({ ...f, walletId: e.target.value }))}
                className={selectCls}
              >
                <option value="" className="bg-navy-900">-- Chọn ví --</option>
                {wallets?.map(w => <option key={w.id} value={w.id} className="bg-navy-900">{w.name} (${w.fiatBalance.toFixed(0)})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Coin</label>
              <select
                value={orderForm.coinId}
                onChange={e => setOrderForm(f => ({ ...f, coinId: e.target.value }))}
                className={selectCls}
              >
                {POPULAR_COINS.map(c => <option key={c.id} value={c.id} className="bg-navy-900">{c.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Loại lệnh</label>
              <select
                value={orderForm.type}
                onChange={e => setOrderForm(f => ({ ...f, type: Number(e.target.value) as OrderType }))}
                className={selectCls}
              >
                <option value={1} className="bg-navy-900">Stop Loss</option>
                <option value={2} className="bg-navy-900">Take Profit</option>
                <option value={3} className="bg-navy-900">Limit</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Side</label>
              <select
                value={orderForm.side}
                onChange={e => setOrderForm(f => ({ ...f, side: Number(e.target.value) as OrderSide }))}
                className={selectCls}
              >
                <option value={1} className="bg-navy-900">Mua (Long)</option>
                <option value={2} className="bg-navy-900">Bán (Short)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Giá trigger ($)</label>
              <input
                type="number" min="0" step="any"
                value={orderForm.triggerPrice || ''}
                onChange={e => setOrderForm(f => ({ ...f, triggerPrice: parseFloat(e.target.value) || 0 }))}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>Số lượng</label>
              <input
                type="number" min="0" step="any"
                value={orderForm.quantity || ''}
                onChange={e => setOrderForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className={inputCls}
                placeholder="0.00000001"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreateOrder} disabled={createOrder.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow disabled:opacity-40 transition uppercase tracking-wider">
              {createOrder.isPending ? 'Đang tạo…' : 'Tạo lệnh'}
            </button>
            <button onClick={() => setShowOrderForm(false)}
              className="px-5 py-2.5 bg-white/[0.04] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider">Huỷ</button>
          </div>
        </Card>
      )}

      {/* ── Create Position Form ── */}
      {tab === 'positions' && showPositionForm && (
        <Card className="p-5 space-y-4 border-accent-cyan/25 animate-scale-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Plus size={14} className="text-accent-cyan" /> Mở vị thế ký quỹ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Ví</label>
                <select
                  value={posForm.walletId}
                  onChange={e => setPosForm(f => ({ ...f, walletId: e.target.value }))}
                  className={selectCls}
                >
                  <option value="" className="bg-navy-900">-- Chọn ví --</option>
                  {wallets?.map(w => <option key={w.id} value={w.id} className="bg-navy-900">{w.name} (${w.fiatBalance.toFixed(0)})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Coin</label>
                <select
                  value={posForm.coinId}
                  onChange={e => setPosForm(f => ({ ...f, coinId: e.target.value }))}
                  className={selectCls}
                >
                  {POPULAR_COINS.map(c => <option key={c.id} value={c.id} className="bg-navy-900">{c.symbol}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Hướng</label>
                <select
                  value={posForm.side}
                  onChange={e => setPosForm(f => ({ ...f, side: Number(e.target.value) as PositionSide }))}
                  className={selectCls}
                >
                  <option value={1} className="bg-navy-900">Long (Mua lên)</option>
                  <option value={2} className="bg-navy-900">Short (Bán xuống)</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Đòn bẩy: <span className="text-accent-cyan font-bold font-mono">{posForm.leverage}x</span></label>
                <input
                  type="range" min={1} max={100} step={1}
                  value={posForm.leverage}
                  onChange={e => setPosForm(f => ({ ...f, leverage: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-navy-950 rounded-lg appearance-none cursor-pointer accent-accent-cyan border border-white/[0.04]"
                />
                <div className="flex justify-between text-[9px] text-gray-500 mt-1.5 font-bold font-mono">
                  <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Số lượng coin</label>
                <input
                  type="number" min="0" step="any"
                  value={posForm.quantity || ''}
                  onChange={e => setPosForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                  placeholder="0.001"
                />
                <p className="text-[10px] text-gray-500 font-medium mt-2 leading-relaxed">
                  Ký quỹ cần: <span className="text-yellow-400 font-bold font-mono">giá thị trường × số lượng ÷ {posForm.leverage}x</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleOpenPosition} disabled={openPosition.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-glow disabled:opacity-40 transition uppercase tracking-wider">
              {openPosition.isPending ? 'Đang mở…' : 'Mở vị thế'}
            </button>
            <button onClick={() => setShowPositionForm(false)}
              className="px-5 py-2.5 bg-white/[0.04] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider">Huỷ</button>
          </div>
        </Card>
      )}

      {/* ── Orders Table ── */}
      {tab === 'orders' && (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[110px_1fr_80px_130px_120px_110px_50px] gap-4 px-6 py-4 text-xs text-gray-500 uppercase tracking-wider font-bold border-b border-white/[0.06] bg-navy-950/20">
            <span>Loại</span>
            <span>Ví / Coin</span>
            <span>Side</span>
            <span className="text-right">Trigger</span>
            <span className="text-right">Số lượng</span>
            <span className="text-center">Trạng thái</span>
            <span></span>
          </div>

          {loadingOrders ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : !orders || orders.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={24} />}
              title="Chưa có lệnh điều kiện nào"
              description="Tạo lệnh điều kiện đầu tiên của bạn để tự động hóa giao dịch"
            />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {orders.map(order => (
                <div key={order.id} className="grid grid-cols-2 md:grid-cols-[110px_1fr_80px_130px_120px_110px_50px] gap-2 md:gap-4 px-6 py-4 hover:bg-white/[0.01] transition items-center text-sm">
                  {/* Type */}
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      {ORDER_TYPE_LABELS[order.type]}
                    </span>
                  </div>

                  {/* Coin / Wallet */}
                  <div className="col-span-1 md:col-span-1">
                    <span className="text-white font-bold uppercase">{order.coinSymbol}</span>
                    <p className="text-xs text-gray-500 font-semibold">{order.walletName}</p>
                  </div>

                  {/* Side */}
                  <div className="md:text-left">
                    <span className={cn('text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md', order.side === 1 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10')}>
                      {order.side === 1 ? 'BUY' : 'SELL'}
                    </span>
                  </div>

                  {/* Trigger Price */}
                  <div className="text-left md:text-right font-mono font-semibold text-gray-300">
                    ${order.triggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>

                  {/* Quantity */}
                  <div className="text-left md:text-right font-mono text-gray-400 font-medium">
                    {order.quantity}
                  </div>

                  {/* Status */}
                  <div className="flex justify-start md:justify-center">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', ORDER_STATUS_COLORS[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end col-span-2 md:col-span-1">
                    {order.status === 1 && (
                      <button
                        onClick={() => setConfirmCancelOrder(order.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Positions Table ── */}
      {tab === 'positions' && (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px_150px_120px_90px] gap-4 px-6 py-4 text-xs text-gray-500 uppercase tracking-wider font-bold border-b border-white/[0.06] bg-navy-950/20">
            <span>Coin / Ví</span>
            <span>Side</span>
            <span className="text-right">Entry</span>
            <span className="text-right">Đòn bẩy</span>
            <span className="text-right">PnL</span>
            <span className="text-center">Trạng thái</span>
            <span></span>
          </div>

          {loadingPositions ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : !positions || positions.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={24} />}
              title="Chưa có vị thế ký quỹ nào"
              description="Mở vị thế Long hoặc Short để bắt đầu giao dịch đòn bẩy"
            />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {positions.map(pos => {
                const isOpen = pos.status === 1
                const pnl = isOpen ? pos.unrealizedPnL : pos.realizedPnL
                const pnlPct = isOpen ? pos.unrealizedPnLPercentage : null
                const pnlPositive = (pnl ?? 0) >= 0
                return (
                  <div key={pos.id} className="grid grid-cols-2 md:grid-cols-[1fr_100px_120px_100px_150px_120px_90px] gap-2 md:gap-4 px-6 py-4 hover:bg-white/[0.01] transition items-center text-sm">
                    {/* Coin / Wallet */}
                    <div>
                      <span className="text-white font-bold uppercase">{pos.coinSymbol}</span>
                      <p className="text-xs text-gray-500 font-semibold">{pos.walletName}</p>
                      {isOpen && pos.currentPrice && (
                        <p className="text-[10px] text-gray-500 font-semibold font-mono mt-0.5">${pos.currentPrice.toLocaleString()}</p>
                      )}
                    </div>

                    {/* Side */}
                    <div className="flex items-center gap-1">
                      {pos.side === 1
                        ? <TrendingUp size={14} className="text-emerald-400 animate-pulse" />
                        : <TrendingDown size={14} className="text-red-400 animate-pulse" />}
                      <span className={cn('text-xs font-bold uppercase tracking-wider', pos.side === 1 ? 'text-emerald-400' : 'text-red-400')}>
                        {pos.side === 1 ? 'LONG' : 'SHORT'}
                      </span>
                    </div>

                    {/* Entry price + Liquidation (risk info) */}
                    <div className="text-left md:text-right">
                      <p className="text-gray-300 font-mono font-semibold">${pos.entryPrice.toLocaleString()}</p>
                      {isOpen && (
                        <p
                          className="text-[10px] text-red-400/80 font-mono mt-0.5"
                          title="Liquidation price — collateral fully lost if reached"
                        >
                          Liq ${pos.liquidationPrice.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Leverage + Collateral */}
                    <div className="text-left md:text-right">
                      <p className="text-accent-cyan font-bold font-mono">{pos.leverage}x</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        ${pos.collateralAmount.toFixed(2)}
                      </p>
                    </div>

                    {/* PnL */}
                    <div className="text-left md:text-right">
                      {pnl !== null && pnl !== undefined ? (
                        <>
                          <p className={cn('font-mono text-sm font-bold', pnlPositive ? 'text-emerald-400' : 'text-red-400')}>
                            {pnlPositive ? '+' : ''}${pnl.toFixed(2)}
                          </p>
                          {pnlPct !== null && pnlPct !== undefined && (
                            <p className={cn('text-[10px] font-mono font-bold mt-0.5', pnlPositive ? 'text-emerald-500' : 'text-red-500')}>
                              {pnlPositive ? '+' : ''}{pnlPct.toFixed(2)}%
                            </p>
                          )}
                        </>
                      ) : <span className="text-gray-600 font-semibold">—</span>}
                    </div>

                    {/* Status */}
                    <div className="flex justify-start md:justify-center">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full',
                        pos.status === 1 ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' :
                        pos.status === 3 ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
                        'text-gray-500 bg-white/[0.03] border border-white/[0.06]')}>
                        {POSITION_STATUS_LABELS[pos.status]}
                      </span>
                    </div>

                    {/* Close Action */}
                    <div className="flex justify-end col-span-2 md:col-span-1">
                      {isOpen ? (
                        <button
                          onClick={() => setConfirmClosePos(pos.id)}
                          disabled={closePosition.isPending}
                          className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 transition disabled:opacity-40 uppercase tracking-wider"
                        >
                          Đóng
                        </button>
                      ) : <span />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Confirmation dialogs ── */}
      <ConfirmDialog
        open={confirmClosePos !== null}
        onClose={() => setConfirmClosePos(null)}
        onConfirm={() => {
          if (!confirmClosePos) return
          closePosition.mutate(confirmClosePos, {
            onSuccess: () => { setConfirmClosePos(null); toast.success('Đã đóng vị thế') },
            onError:   () => { toast.error('Đóng vị thế thất bại') },
          })
        }}
        title="Đóng vị thế?"
        message="Vị thế sẽ được đóng theo giá thị trường hiện tại. Collateral + PnL (nếu lời) sẽ trả về ví. Hành động này không thể hoàn tác."
        confirmLabel="Đóng vị thế"
        loading={closePosition.isPending}
      />

      <ConfirmDialog
        open={confirmCancelOrder !== null}
        onClose={() => setConfirmCancelOrder(null)}
        onConfirm={() => {
          if (!confirmCancelOrder) return
          cancelOrder.mutate(confirmCancelOrder, {
            onSuccess: () => { setConfirmCancelOrder(null); toast.success('Đã huỷ lệnh') },
            onError:   () => { toast.error('Huỷ lệnh thất bại') },
          })
        }}
        title="Huỷ lệnh?"
        message="Lệnh đang chờ này sẽ bị huỷ và không thể khôi phục."
        confirmLabel="Huỷ lệnh"
        loading={cancelOrder.isPending}
      />
    </div>
  )
}
