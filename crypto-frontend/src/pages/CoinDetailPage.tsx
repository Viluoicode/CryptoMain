// src/pages/CoinDetailPage.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { getCryptoById } from '@/api/crypto'
import { apiClient } from '@/api/client'
import type { ISeriesApi } from 'lightweight-charts'
import { useWallets, useWalletDetail } from '@/hooks/useWallet'
import { useCreateTransaction } from '@/hooks/useTransaction'
import { useAuth } from '@/hooks/useAuth'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/types'

interface OhlcPoint { timestamp: number; open: number; high: number; low: number; close: number }
type DayRange = 1 | 7 | 14 | 30 | 90

async function getCoinOhlc(coinId: string, days: DayRange): Promise<OhlcPoint[]> {
    const { data } = await apiClient.get<OhlcPoint[]>(`/Crypto/${coinId}/ohlc`, { params: { days } })
    return data
}

function formatLarge(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return formatUSD(value)
}

function StatItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    )
}

// ─── Candlestick Chart ─────────────────────────────────────────────────────────
function CandlestickChart({ coinId }: { coinId: string }) {
    const [days, setDays] = useState<DayRange>(7)
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const isDark = document.documentElement.classList.contains('dark')

    const { data: ohlcData, isLoading } = useQuery({
        queryKey: ['crypto', coinId, 'ohlc', days],
        queryFn: () => getCoinOhlc(coinId, days),
        staleTime: 1000 * 60 * 5,
    })

    const RANGES: { label: string; value: DayRange }[] = [
        { label: '1N', value: 1 }, { label: '7N', value: 7 },
        { label: '14N', value: 14 }, { label: '1T', value: 30 }, { label: '3T', value: 90 },
    ]

    useEffect(() => {
        if (!chartContainerRef.current) return
        const bgColor = isDark ? '#111827' : '#ffffff'
        const textColor = isDark ? '#9ca3af' : '#6b7280'
        const gridColor = isDark ? '#1f2937' : '#f3f4f6'

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: bgColor }, textColor },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            crosshair: { mode: 1 },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
            width: chartContainerRef.current.clientWidth,
            height: 320,
        })

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', downColor: '#ef4444',
            borderUpColor: '#10b981', borderDownColor: '#ef4444',
            wickUpColor: '#10b981', wickDownColor: '#ef4444',
        })

        chartRef.current = chart
        seriesRef.current = series

        const ro = new ResizeObserver((e) => chart.applyOptions({ width: e[0].contentRect.width }))
        ro.observe(chartContainerRef.current)
        return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null }
    }, [isDark])

    useEffect(() => {
        if (!seriesRef.current || !ohlcData?.length) return
        const data = ohlcData
            .map((p) => ({ time: Math.floor(p.timestamp / 1000) as number, open: p.open, high: p.high, low: p.low, close: p.close }))
            .sort((a, b) => a.time - b.time)
            .filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time)
        seriesRef.current.setData(data as Parameters<typeof seriesRef.current.setData>[0])
        chartRef.current?.timeScale().fitContent()
    }, [ohlcData])

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">Candlestick Chart</p>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {RANGES.map((r) => (
                        <button key={r.value} onClick={() => setDays(r.value)}
                            className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition',
                                days === r.value
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            )}>
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10 rounded-xl">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Đang tải dữ liệu...</span>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full" />
            </div>
        </div>
    )
}

// ─── Login CTA (hiển thị khi chưa login) ──────────────────────────────────────
function LoginCTA() {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Đăng nhập để giao dịch</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                    Tạo tài khoản miễn phí để theo dõi và ghi lại giao dịch của bạn
                </p>
            </div>
            <div className="space-y-2">
                <a href="/register"
                    className="block w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition text-center">
                    Tạo tài khoản miễn phí
                </a>
                <a href="/login"
                    className="block w-full py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center">
                    Đăng nhập
                </a>
            </div>
        </div>
    )
}

// ─── Trading Panel ─────────────────────────────────────────────────────────────
function TradingPanel({ coinId, coinSymbol, currentPrice }: {
    coinId: string; coinSymbol: string; currentPrice: number
}) {
    const navigate = useNavigate()
    const { data: wallets } = useWallets()
    const { mutate, isPending } = useCreateTransaction()
    const [type, setType] = useState<TransactionType>(1)
    const [walletId, setWalletId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [price, setPrice] = useState(currentPrice.toString())
    const [notes, setNotes] = useState('')
    const [success, setSuccess] = useState(false)

    const { data: walletDetail } = useWalletDetail(walletId)
    const holdingQty: number = walletId
        ? (walletDetail?.holdings ?? []).find((h) => h.coinId === coinId)?.quantity ?? 0
        : 0
    const isSell = type === 2
    const cannotSell = isSell && !!walletId && !!walletDetail && holdingQty === 0
    const exceedsHolding = isSell && parseFloat(quantity || '0') > holdingQty && holdingQty > 0
    const sellDisabled = isSell && (cannotSell || exceedsHolding)
    const total = parseFloat(quantity || '0') * parseFloat(price || '0')

    const inputCls = "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
    const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!walletId || !quantity || !price || sellDisabled) return
        mutate(
            { walletId, coinId, type, quantity: parseFloat(quantity), pricePerCoin: parseFloat(price), notes: notes || undefined, transactionDate: new Date().toISOString() },
            { onSuccess: () => { setSuccess(true); setQuantity(''); setNotes(''); setTimeout(() => setSuccess(false), 3000) } }
        )
    }

    if (wallets !== undefined && wallets.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center space-y-3">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mx-auto">
                    <Wallet size={18} className="text-brand-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bạn chưa có ví nào.</p>
                <button onClick={() => navigate('/wallets')} className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition">
                    Tạo ví ngay
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 border-b border-gray-100 dark:border-gray-800">
                {([1, 2] as TransactionType[]).map((t) => (
                    <button key={t} type="button" onClick={() => { setType(t); setQuantity('') }}
                        className={cn('py-3 text-sm font-semibold transition',
                            type === t
                                ? t === 1 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}>
                        {t === 1 ? '▲ Buy' : '▼ Sell'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                    <label className={labelCls}>Ví</label>
                    <select value={walletId} onChange={(e) => { setWalletId(e.target.value); setQuantity('') }}
                        className={cn(inputCls, 'bg-white dark:bg-gray-800')}>
                        <option value="">-- Chọn ví --</option>
                        {wallets?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>

                {cannotSell && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Không thể bán</p>
                        <p className="text-xs text-red-500 dark:text-red-400">Ví này không có <span className="uppercase font-medium">{coinSymbol}</span> nào.</p>
                    </div>
                )}

                {isSell && !!walletId && holdingQty > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 flex justify-between items-center">
                        <span className="text-xs text-amber-700 dark:text-amber-400">Số dư trong ví</span>
                        <div className="text-right">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{holdingQty} <span className="uppercase">{coinSymbol}</span></p>
                            <button type="button" onClick={() => setQuantity(holdingQty.toString())} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Bán tất cả</button>
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelCls}>Số lượng <span className="uppercase">{coinSymbol}</span></label>
                    <input type="number" step="any" min="0" max={isSell && holdingQty > 0 ? holdingQty : undefined}
                        placeholder="0.00" value={quantity} disabled={cannotSell}
                        onChange={(e) => setQuantity(e.target.value)}
                        className={cn(inputCls, exceedsHolding && 'border-red-300 dark:border-red-700', cannotSell && 'opacity-50 cursor-not-allowed')} />
                    {exceedsHolding && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Vượt quá số dư. Tối đa: {holdingQty} <span className="uppercase">{coinSymbol}</span></p>}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Giá / coin (USD)</label>
                        <button type="button" onClick={() => setPrice(currentPrice.toString())} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Dùng giá hiện tại</button>
                    </div>
                    <input type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                </div>

                {total > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tổng giá trị</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatUSD(total)}</span>
                    </div>
                )}

                <div>
                    <label className={labelCls}>Ghi chú (tuỳ chọn)</label>
                    <input type="text" placeholder="Ghi chú..." value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
                </div>

                {success && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl px-4 py-2.5 text-center font-medium">
                        ✅ Giao dịch đã được ghi lại!
                    </div>
                )}

                <button type="submit" disabled={!walletId || !quantity || !price || isPending || sellDisabled}
                    className={cn('w-full py-3 text-sm font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed',
                        type === 1 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                    )}>
                    {isPending ? 'Đang xử lý...' : type === 1 ? `Mua ${coinSymbol.toUpperCase()}` : `Bán ${coinSymbol.toUpperCase()}`}
                </button>
            </form>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function CoinDetailPage() {
    const { coinId } = useParams<{ coinId: string }>()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    const { data: coin, isLoading, isError } = useQuery({
        queryKey: ['crypto', coinId],
        queryFn: () => getCryptoById(coinId!),
        enabled: !!coinId,
        staleTime: 1000 * 60 * 2,
    })

    if (isLoading) {
        return (
            <div className="max-w-7xl space-y-5 p-6">
                <div className="h-8 w-56 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="h-96 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
                        <div className="grid grid-cols-4 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />)}
                        </div>
                    </div>
                    <div className="h-80 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
                </div>
            </div>
        )
    }

    if (isError || !coin) {
        return (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
                Không tìm thấy coin.{' '}
                <button onClick={() => navigate('/market')} className="text-brand-600 dark:text-brand-400 underline">Quay lại Market</button>
            </div>
        )
    }

    const positive = coin.priceChangePercentage24h >= 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/market')}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-white transition">
                    <ArrowLeft size={16} />
                </button>
                <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{coin.name}</h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{coin.symbol}</p>
                </div>
                <div className="ml-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatUSD(coin.currentPrice)}</span>
                    <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                        positive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    )}>
                        {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPct(coin.priceChangePercentage24h)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <CandlestickChart coinId={coinId!} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatItem label="Market Cap" value={formatLarge(coin.marketCap)} />
                        <StatItem label="Volume 24h" value={formatLarge(coin.totalVolume)} />
                        <StatItem label="Biến động 24h" value={formatPct(coin.priceChangePercentage24h)} />
                        <StatItem label="Symbol" value={coin.symbol.toUpperCase()} />
                    </div>
                </div>

                {/* Right — Trading Panel hoặc Login CTA */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {isAuthenticated ? 'Ghi lại giao dịch' : 'Bắt đầu đầu tư'}
                    </h2>
                    {isAuthenticated
                        ? <TradingPanel coinId={coinId!} coinSymbol={coin.symbol} currentPrice={coin.currentPrice} />
                        : <LoginCTA />
                    }
                    {isAuthenticated && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                            Giao dịch sẽ được lưu vào ví bạn chọn.<br />
                            Giá tự động điền từ giá thị trường hiện tại.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}