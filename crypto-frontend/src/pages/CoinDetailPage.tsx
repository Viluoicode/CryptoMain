// src/pages/CoinDetailPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    createChart, CandlestickSeries, LineSeries, ColorType,
    CrosshairMode, LineStyle,
} from 'lightweight-charts'
import type { ISeriesApi, IChartApi, IPriceLine, Time, LineData } from 'lightweight-charts'
import { calcEMA, calcRSI, type OhlcBar, type RsiState } from '@/lib/indicators'
import {
    ArrowLeft, TrendingUp, TrendingDown, Wallet,
    Activity, BarChart3, DollarSign, ArrowUpDown, Bell, X,
} from 'lucide-react'
import { getCryptoById } from '@/api/crypto'
import { apiClient } from '@/api/client'
import { useWallets, useWalletDetail } from '@/hooks/useWallet'
import { useCreateTransaction } from '@/hooks/useTransaction'
import { useAuth } from '@/hooks/useAuth'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useCreateAlert } from '@/hooks/usePriceAlert'
import { useToast } from '@/components/ui/Toast'
import type { AlertDirection } from '@/types'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/types'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface OhlcPoint { timestamp: number; open: number; high: number; low: number; close: number }
type DayRange = 1 | 7 | 14 | 30 | 90

interface OhlcDisplay { open: number; high: number; low: number; close: number; isUp: boolean }

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function getCoinOhlc(coinId: string, days: DayRange): Promise<OhlcPoint[]> {
    const { data } = await apiClient.get<OhlcPoint[]>(`/Crypto/${coinId}/ohlc`, { params: { days } })
    return data
}

function formatLarge(v: number): string {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
    if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
    return formatUSD(v)
}

const RANGES: { label: string; value: DayRange }[] = [
    { label: '1N', value: 1 }, { label: '7N', value: 7 },
    { label: '14N', value: 14 }, { label: '1T', value: 30 }, { label: '3T', value: 90 },
]

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub }: {
    label: string; value: string; icon: typeof Activity; sub?: string
}) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-semibold text-white font-mono">{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
        </div>
    )
}

// ─── Candlestick Chart ─────────────────────────────────────────────────────────
interface CdEmaVis { e20: boolean; e50: boolean; e200: boolean }

function CandlestickChart({ coinId, livePrice }: { coinId: string; livePrice?: number }) {
    const [days, setDays]       = useState<DayRange>(7)
    const [ohlc, setOhlc]       = useState<OhlcDisplay | null>(null)
    const [emaVis, setEmaVis]   = useState<CdEmaVis>({ e20: true, e50: true, e200: false })
    const [showRSI, setShowRSI] = useState(false)
    const [emaTooltip, setEmaTooltip] = useState<Partial<Record<'e20'|'e50'|'e200', number>> | null>(null)
    const [rsiTooltip, setRsiTooltip] = useState<number | null>(null)

    const containerRef  = useRef<HTMLDivElement>(null)
    const chartRef      = useRef<IChartApi | null>(null)
    const candleRef     = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const priceLineRef  = useRef<IPriceLine | null>(null)
    const ema20Ref      = useRef<ISeriesApi<'Line'> | null>(null)
    const ema50Ref      = useRef<ISeriesApi<'Line'> | null>(null)
    const ema200Ref     = useRef<ISeriesApi<'Line'> | null>(null)
    const rsiRef        = useRef<ISeriesApi<'Line'> | null>(null)
    const rsiObRef      = useRef<ISeriesApi<'Line'> | null>(null)
    const rsiOsRef      = useRef<ISeriesApi<'Line'> | null>(null)
    const lastEMARef    = useRef<{ e20: number; e50: number; e200: number } | null>(null)
    const rsiStateRef   = useRef<RsiState | null>(null)
    const prevLiveRef   = useRef<number | null>(null)

    const { data: ohlcData, isLoading } = useQuery({
        queryKey: ['crypto', coinId, 'ohlc', days],
        queryFn: () => getCoinOhlc(coinId, days),
        staleTime: 1000 * 60 * 5,
    })

    // ── Create chart once ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#111827' },
                textColor:  '#6b7280',
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: '#1f2937' },
                horzLines: { color: '#1f2937' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#4b5563', style: LineStyle.Dashed, width: 1 },
                horzLine: { color: '#4b5563', style: LineStyle.Dashed, width: 1 },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins:  { top: 0.06, bottom: 0.26 },
                textColor:     '#6b7280',
            },
            timeScale: {
                borderVisible: false,
                timeVisible:   true,
                secondsVisible: false,
                fixLeftEdge:   true,
                fixRightEdge:  true,
            },
            width:  containerRef.current.clientWidth,
            height: 460,
        })

        const candle = chart.addSeries(CandlestickSeries, {
            upColor:         '#10b981',
            downColor:       '#ef4444',
            borderUpColor:   '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor:     '#10b981',
            wickDownColor:   '#ef4444',
        })

        const makeEma = (color: string) => chart.addSeries(LineSeries, {
            color, lineWidth: 1,
            priceLineVisible: false, lastValueVisible: false,
            crosshairMarkerVisible: false, visible: false,
        })
        const ema20  = makeEma('#facc15')
        const ema50  = makeEma('#60a5fa')
        const ema200 = makeEma('#f472b6')

        const rsi = chart.addSeries(LineSeries, {
            color: '#a78bfa', lineWidth: 1,
            priceScaleId: 'rsi',
            priceLineVisible: false, lastValueVisible: true,
            crosshairMarkerVisible: false, visible: false,
        })
        const rsiOb = chart.addSeries(LineSeries, {
            color: '#ef444450', lineWidth: 1, lineStyle: LineStyle.Dashed,
            priceScaleId: 'rsi', priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: false, visible: false,
        })
        const rsiOs = chart.addSeries(LineSeries, {
            color: '#10b98150', lineWidth: 1, lineStyle: LineStyle.Dashed,
            priceScaleId: 'rsi', priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: false, visible: false,
        })
        chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.88, bottom: 0 },
        })

        chart.subscribeCrosshairMove((param) => {
            if (!param.seriesData.size || !candle) {
                setOhlc(null); setEmaTooltip(null); setRsiTooltip(null)
                return
            }
            const d   = param.seriesData.get(candle) as { open:number; high:number; low:number; close:number } | undefined
            const e20 = param.seriesData.get(ema20)  as LineData | undefined
            const e50 = param.seriesData.get(ema50)  as LineData | undefined
            const e200= param.seriesData.get(ema200) as LineData | undefined
            const r   = param.seriesData.get(rsi)    as LineData | undefined
            if (d) setOhlc({ ...d, isUp: d.close >= d.open })
            setEmaTooltip({ e20: e20?.value, e50: e50?.value, e200: e200?.value })
            setRsiTooltip(r?.value ?? null)
        })

        const ro = new ResizeObserver(entries => {
            chart.applyOptions({ width: entries[0].contentRect.width })
        })
        ro.observe(containerRef.current!)

        chartRef.current  = chart
        candleRef.current = candle
        ema20Ref.current  = ema20
        ema50Ref.current  = ema50
        ema200Ref.current = ema200
        rsiRef.current    = rsi
        rsiObRef.current  = rsiOb
        rsiOsRef.current  = rsiOs

        return () => {
            ro.disconnect()
            chart.remove()
            chartRef.current = candleRef.current = null
            ema20Ref.current = ema50Ref.current = ema200Ref.current = null
            rsiRef.current = rsiObRef.current = rsiOsRef.current = null
            priceLineRef.current = null
        }
    }, [])

    // ── Sync EMA visibility ────────────────────────────────────────────────────
    useEffect(() => {
        ema20Ref.current?.applyOptions({ visible: emaVis.e20 })
        ema50Ref.current?.applyOptions({ visible: emaVis.e50 })
        ema200Ref.current?.applyOptions({ visible: emaVis.e200 })
    }, [emaVis])

    // ── Sync RSI visibility + margins ─────────────────────────────────────────
    useEffect(() => {
        rsiRef.current?.applyOptions({ visible: showRSI })
        rsiObRef.current?.applyOptions({ visible: showRSI })
        rsiOsRef.current?.applyOptions({ visible: showRSI })
        chartRef.current?.priceScale('right').applyOptions({
            scaleMargins: showRSI ? { top: 0.06, bottom: 0.26 } : { top: 0.06, bottom: 0.08 },
        })
    }, [showRSI])

    // ── Feed OHLC data + indicators ───────────────────────────────────────────
    useEffect(() => {
        if (!candleRef.current || !ohlcData?.length) return

        const bars: OhlcBar[] = ohlcData
            .map(p => ({
                time:  Math.floor(p.timestamp / 1000),
                open:  p.open, high: p.high, low: p.low, close: p.close,
            }))
            .sort((a, b) => a.time - b.time)
            .filter((item, i, arr) => i === 0 || item.time !== arr[i - 1].time)

        // Candles
        candleRef.current.setData(bars.map(b => ({
            time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close,
        })))
        chartRef.current?.timeScale().fitContent()

        // EMA
        const computeAndSet = (ref: React.RefObject<ISeriesApi<'Line'> | null>, period: number) => {
            const vals = calcEMA(bars, period)
            ref.current?.setData(
                bars.map((b, i) => ({ time: b.time as Time, value: vals[i]! }))
                    .filter(d => d.value !== null)
            )
            return vals[bars.length - 1] ?? 0
        }
        const lastE20  = computeAndSet(ema20Ref,  20)
        const lastE50  = computeAndSet(ema50Ref,  50)
        const lastE200 = computeAndSet(ema200Ref, 200)
        lastEMARef.current = { e20: lastE20, e50: lastE50, e200: lastE200 }

        // Make EMA visible per toggle state
        ema20Ref.current?.applyOptions({ visible: emaVis.e20 })
        ema50Ref.current?.applyOptions({ visible: emaVis.e50 })
        ema200Ref.current?.applyOptions({ visible: emaVis.e200 })

        // RSI
        const { values: rsiVals, state } = calcRSI(bars)
        rsiRef.current?.setData(
            bars.map((b, i) => ({ time: b.time as Time, value: rsiVals[i]! }))
                .filter(d => d.value !== null)
        )
        rsiObRef.current?.setData(bars.map(b => ({ time: b.time as Time, value: 70 })))
        rsiOsRef.current?.setData(bars.map(b => ({ time: b.time as Time, value: 30 })))
        rsiRef.current?.applyOptions({ visible: showRSI })
        rsiObRef.current?.applyOptions({ visible: showRSI })
        rsiOsRef.current?.applyOptions({ visible: showRSI })
        rsiStateRef.current = state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ohlcData])

    // ── Live price line + incremental indicator update ────────────────────────
    useEffect(() => {
        if (!candleRef.current || !livePrice) return

        // Update live price line
        if (priceLineRef.current) {
            try { candleRef.current.removePriceLine(priceLineRef.current) } catch { /* */ }
        }
        priceLineRef.current = candleRef.current.createPriceLine({
            price: livePrice, color: '#6366f1',
            lineWidth: 1, lineStyle: LineStyle.Dashed,
            axisLabelVisible: true, title: '● LIVE',
        })

        // EMA live update deferred — CoinDetail uses backend OHLC (not kline WS),
        // so EMA reflects last closed bar. No incremental tick needed here.

        prevLiveRef.current = livePrice
    }, [livePrice])

    const toggleEma = (key: keyof CdEmaVis) =>
        setEmaVis(prev => ({ ...prev, [key]: !prev[key] }))

    return (
        <div className="space-y-3">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* OHLC + indicator tooltip */}
                <div className="flex items-center gap-2 text-xs font-mono min-h-[20px] flex-wrap">
                    {ohlc ? (
                        <>
                            <span className="text-gray-500">O <span className="text-gray-300">{formatUSD(ohlc.open)}</span></span>
                            <span className="text-gray-500">H <span className="text-emerald-400">{formatUSD(ohlc.high)}</span></span>
                            <span className="text-gray-500">L <span className="text-red-400">{formatUSD(ohlc.low)}</span></span>
                            <span className="text-gray-500">C <span className={ohlc.isUp ? 'text-emerald-400' : 'text-red-400'}>{formatUSD(ohlc.close)}</span></span>
                            {emaTooltip?.e20  !== undefined && emaVis.e20  && <span className="text-yellow-400">EMA20 {formatUSD(emaTooltip.e20)}</span>}
                            {emaTooltip?.e50  !== undefined && emaVis.e50  && <span className="text-blue-400">EMA50 {formatUSD(emaTooltip.e50)}</span>}
                            {emaTooltip?.e200 !== undefined && emaVis.e200 && <span className="text-pink-400">EMA200 {formatUSD(emaTooltip.e200)}</span>}
                            {rsiTooltip !== null && showRSI && (
                                <span className={cn(
                                    'font-semibold',
                                    rsiTooltip > 70 ? 'text-red-400' :
                                    rsiTooltip < 30 ? 'text-emerald-400' : 'text-violet-400',
                                )}>
                                    RSI {rsiTooltip.toFixed(1)}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-gray-700">Hover chart để xem OHLC</span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* EMA toggles */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">EMA</span>
                        {(
                            [
                                { key: 'e20'  as const, label: '20',  cls: 'text-yellow-400 border-yellow-400/40' },
                                { key: 'e50'  as const, label: '50',  cls: 'text-blue-400 border-blue-400/40'   },
                                { key: 'e200' as const, label: '200', cls: 'text-pink-400 border-pink-400/40'   },
                            ]
                        ).map(({ key, label, cls }) => (
                            <button
                                key={key}
                                onClick={() => toggleEma(key)}
                                className={cn(
                                    'px-2 py-0.5 text-[11px] font-mono rounded border transition',
                                    emaVis[key] ? cls : 'text-gray-600 border-gray-800 hover:border-gray-700',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* RSI toggle */}
                    <button
                        onClick={() => setShowRSI(v => !v)}
                        className={cn(
                            'px-2 py-0.5 text-[11px] font-mono rounded border transition',
                            showRSI ? 'text-violet-400 border-violet-400/40' : 'text-gray-600 border-gray-800 hover:border-gray-700',
                        )}
                    >
                        RSI
                    </button>

                    {/* Timeframe */}
                    <div className="flex gap-0.5 bg-gray-800 p-1 rounded-lg">
                        {RANGES.map(r => (
                            <button key={r.value} onClick={() => setDays(r.value)}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                                    days === r.value
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700',
                                )}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Chart container ── */}
            <div className="relative rounded-xl overflow-hidden border border-gray-800">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Đang tải OHLC...
                        </div>
                    </div>
                )}
                <div ref={containerRef} className="w-full" />
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 text-[11px] flex-wrap">
                {livePrice && (
                    <span className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-5 h-px border-t border-dashed border-indigo-500" />
                        <span className="text-indigo-400 font-mono">● LIVE {formatUSD(livePrice)}</span>
                    </span>
                )}
                {emaVis.e20  && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-yellow-400 inline-block" />EMA 20</span>}
                {emaVis.e50  && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-400 inline-block" />EMA 50</span>}
                {emaVis.e200 && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-pink-400 inline-block" />EMA 200</span>}
                {showRSI     && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-violet-400 inline-block" />RSI(14) · OB 70 / OS 30</span>}
            </div>
        </div>
    )
}

// ─── Login CTA ─────────────────────────────────────────────────────────────────
function LoginCTA() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp size={20} className="text-indigo-400" />
            </div>
            <div>
                <p className="font-semibold text-white mb-1">Đăng nhập để giao dịch</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                    Tạo tài khoản miễn phí để theo dõi và ghi lại giao dịch của bạn
                </p>
            </div>
            <div className="space-y-2">
                <a href="/register"
                    className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition text-center">
                    Tạo tài khoản miễn phí
                </a>
                <a href="/login"
                    className="block w-full py-2.5 border border-gray-700 text-gray-400 text-sm font-medium rounded-xl hover:bg-gray-800 transition text-center">
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
    const [type, setType]         = useState<TransactionType>(1)
    const [walletId, setWalletId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [price, setPrice]       = useState(currentPrice.toFixed(8))
    const [notes, setNotes]       = useState('')
    const [success, setSuccess]   = useState(false)

    // Sync price input when live price changes
    useEffect(() => {
        setPrice(currentPrice.toFixed(8))
    }, [currentPrice])

    const { data: walletDetail } = useWalletDetail(walletId)
    const holdingQty: number = walletId
        ? (walletDetail?.holdings ?? []).find(h => h.coinId === coinId)?.quantity ?? 0
        : 0

    const isSell         = type === 2
    const cannotSell     = isSell && !!walletId && !!walletDetail && holdingQty === 0
    const exceedsHolding = isSell && parseFloat(quantity || '0') > holdingQty && holdingQty > 0
    const sellDisabled   = isSell && (cannotSell || exceedsHolding)
    const total          = parseFloat(quantity || '0') * parseFloat(price || '0')

    const inputCls = "w-full border border-gray-700 bg-gray-800 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
    const labelCls = "block text-xs font-medium text-gray-500 mb-1.5"

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!walletId || !quantity || !price || sellDisabled) return
        mutate(
            {
                walletId, coinId, type,
                quantity: parseFloat(quantity),
                pricePerCoin: parseFloat(price),
                notes: notes || undefined,
                transactionDate: new Date().toISOString(),
            },
            {
                onSuccess: () => {
                    setSuccess(true)
                    setQuantity('')
                    setNotes('')
                    setTimeout(() => setSuccess(false), 3000)
                },
            },
        )
    }, [walletId, coinId, type, quantity, price, notes, sellDisabled, mutate])

    if (wallets !== undefined && wallets.length === 0) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-3">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center mx-auto">
                    <Wallet size={18} className="text-indigo-400" />
                </div>
                <p className="text-sm text-gray-500">Bạn chưa có ví nào.</p>
                <button
                    onClick={() => navigate('/wallets')}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                    Tạo ví ngay
                </button>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {/* Buy / Sell tabs */}
            <div className="grid grid-cols-2 border-b border-gray-800">
                {([1, 2] as TransactionType[]).map(t => (
                    <button key={t} type="button"
                        onClick={() => { setType(t); setQuantity('') }}
                        className={cn(
                            'py-3 text-sm font-semibold transition',
                            type === t
                                ? t === 1 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300',
                        )}>
                        {t === 1 ? '▲ Buy' : '▼ Sell'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Wallet select */}
                <div>
                    <label className={labelCls}>Ví</label>
                    <select
                        value={walletId}
                        onChange={e => { setWalletId(e.target.value); setQuantity('') }}
                        className={cn(inputCls, 'bg-gray-800')}
                    >
                        <option value="">-- Chọn ví --</option>
                        {wallets?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>

                {/* Cannot sell alert */}
                {cannotSell && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-red-400 mb-0.5">Không thể bán</p>
                        <p className="text-xs text-red-400/70">Ví này không có <span className="uppercase font-medium">{coinSymbol}</span> nào.</p>
                    </div>
                )}

                {/* Sell balance info */}
                {isSell && !!walletId && holdingQty > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 flex justify-between items-center">
                        <span className="text-xs text-amber-400/70">Số dư trong ví</span>
                        <div className="text-right">
                            <p className="text-xs font-bold text-amber-300 font-mono">
                                {holdingQty} <span className="uppercase">{coinSymbol}</span>
                            </p>
                            <button type="button" onClick={() => setQuantity(holdingQty.toString())}
                                className="text-xs text-amber-500 hover:underline">
                                Bán tất cả
                            </button>
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div>
                    <label className={labelCls}>Số lượng <span className="uppercase">{coinSymbol}</span></label>
                    <input
                        type="number" step="any" min="0"
                        max={isSell && holdingQty > 0 ? holdingQty : undefined}
                        placeholder="0.00" value={quantity} disabled={cannotSell}
                        onChange={e => setQuantity(e.target.value)}
                        className={cn(inputCls, exceedsHolding && 'border-red-500/50', cannotSell && 'opacity-50 cursor-not-allowed')}
                    />
                    {exceedsHolding && (
                        <p className="text-xs text-red-400 mt-1">
                            Vượt quá số dư. Tối đa: {holdingQty} <span className="uppercase">{coinSymbol}</span>
                        </p>
                    )}
                </div>

                {/* Price */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-500">Giá / coin (USD)</label>
                        <button type="button"
                            onClick={() => setPrice(currentPrice.toFixed(8))}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                            Dùng giá live
                        </button>
                    </div>
                    <input type="number" step="any" min="0"
                        value={price} onChange={e => setPrice(e.target.value)}
                        className={inputCls} />
                </div>

                {/* Total */}
                {total > 0 && (
                    <div className="bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Tổng giá trị</span>
                        <span className="text-sm font-bold text-white font-mono">{formatUSD(total)}</span>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className={labelCls}>Ghi chú (tuỳ chọn)</label>
                    <input type="text" placeholder="Ghi chú..." value={notes}
                        onChange={e => setNotes(e.target.value)} className={inputCls} />
                </div>

                {/* Success */}
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl px-4 py-2.5 text-center font-medium">
                        ✅ Giao dịch đã được ghi lại!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!walletId || !quantity || !price || isPending || sellDisabled}
                    className={cn(
                        'w-full py-3 text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed',
                        type === 1
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white',
                    )}
                >
                    {isPending ? 'Đang xử lý...' : type === 1
                        ? `Mua ${coinSymbol.toUpperCase()}`
                        : `Bán ${coinSymbol.toUpperCase()}`}
                </button>
            </form>
        </div>
    )
}

// ─── Set Alert Modal ───────────────────────────────────────────────────────────
function SetAlertModal({ coinId, coinSymbol, coinName, currentPrice, onClose }: {
    coinId: string; coinSymbol: string; coinName: string; currentPrice: number; onClose: () => void
}) {
    const [direction, setDirection] = useState<AlertDirection>(1)
    const [targetPrice, setTargetPrice] = useState(
        (currentPrice * (direction === 1 ? 1.05 : 0.95)).toFixed(2)
    )
    const createAlert = useCreateAlert()
    const toast = useToast()

    // Suggest price when direction changes
    const handleDirectionChange = (d: AlertDirection) => {
        setDirection(d)
        setTargetPrice((currentPrice * (d === 1 ? 1.05 : 0.95)).toFixed(2))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const price = parseFloat(targetPrice)
        if (!price || price <= 0) return

        createAlert.mutate(
            { coinId, coinSymbol, coinName, targetPrice: price, direction },
            {
                onSuccess: () => {
                    toast.success(`Alert đã đặt!`, `${coinSymbol.toUpperCase()} ${direction === 1 ? '≥' : '≤'} $${price.toLocaleString()}`)
                    onClose()
                },
                onError: () => toast.error('Không thể tạo alert'),
            }
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Bell size={16} className="text-amber-400" />
                        <span className="font-semibold text-white text-sm">Đặt Price Alert</span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Coin info */}
                    <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Coin</p>
                            <p className="text-sm font-semibold text-white uppercase">{coinSymbol} · {coinName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 mb-0.5">Giá hiện tại</p>
                            <p className="text-sm font-mono text-white">{formatUSD(currentPrice)}</p>
                        </div>
                    </div>

                    {/* Direction */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Điều kiện trigger</label>
                        <div className="grid grid-cols-2 gap-2">
                            {([1, 2] as AlertDirection[]).map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => handleDirectionChange(d)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition',
                                        direction === d
                                            ? d === 1
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                : 'bg-red-500/20 border-red-500/40 text-red-400'
                                            : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600',
                                    )}
                                >
                                    {d === 1
                                        ? <><TrendingUp size={14} /> Trên (≥)</>
                                        : <><TrendingDown size={14} /> Dưới (≤)</>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target price */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Giá mục tiêu (USD)
                        </label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={targetPrice}
                            onChange={e => setTargetPrice(e.target.value)}
                            className="w-full border border-gray-700 bg-gray-800 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                            placeholder="0.00"
                        />
                        {/* Percent difference hint */}
                        {parseFloat(targetPrice) > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                                {(() => {
                                    const pct = ((parseFloat(targetPrice) - currentPrice) / currentPrice) * 100
                                    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% so với giá hiện tại`
                                })()}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition"
                        >
                            Huỷ
                        </button>
                        <button
                            type="submit"
                            disabled={createAlert.isPending || !targetPrice || parseFloat(targetPrice) <= 0}
                            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition"
                        >
                            {createAlert.isPending ? 'Đang tạo...' : '🔔 Đặt Alert'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function CoinDetailPage() {
    const { coinId } = useParams<{ coinId: string }>()
    const navigate   = useNavigate()
    const { isAuthenticated } = useAuth()

    // CoinGecko snapshot
    const { data: coin, isLoading, isError } = useQuery({
        queryKey: ['crypto', coinId],
        queryFn: () => getCryptoById(coinId!),
        enabled: !!coinId,
        staleTime: 1000 * 60 * 2,
    })

    // Binance WebSocket — live price for this coin
    const symbol = coin?.symbol?.toLowerCase() ?? ''
    useBinanceWs(symbol ? [symbol] : [])
    const { ticks } = useLivePriceStore()
    const liveTick = symbol ? ticks[symbol] : undefined

    // Resolved price (live takes priority)
    const livePrice  = liveTick?.price    ?? coin?.currentPrice
    const liveChange = liveTick?.change24h ?? coin?.priceChangePercentage24h ?? 0
    const liveHigh   = liveTick?.high24h
    const liveLow    = liveTick?.low24h

    const [alertOpen, setAlertOpen] = useState(false)

    // ── Price flash in header ──────────────────────────────────────────────────
    const prevPriceRef = useRef<number>(livePrice ?? 0)
    const [flash, setFlash] = useState<'up' | 'down' | null>(null)

    useEffect(() => {
        if (!liveTick?.price) return
        const prev = prevPriceRef.current
        if (liveTick.price === prev) return
        setFlash(liveTick.price > prev ? 'up' : 'down')
        prevPriceRef.current = liveTick.price
        const t = setTimeout(() => setFlash(null), 700)
        return () => clearTimeout(t)
    }, [liveTick?.price])

    // ── Loading ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="max-w-7xl space-y-5">
                <div className="h-10 w-64 bg-gray-800 animate-pulse rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="h-[520px] bg-gray-900 border border-gray-800 animate-pulse rounded-2xl" />
                        <div className="grid grid-cols-4 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 bg-gray-900 border border-gray-800 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    </div>
                    <div className="h-96 bg-gray-900 border border-gray-800 animate-pulse rounded-2xl" />
                </div>
            </div>
        )
    }

    if (isError || !coin) {
        return (
            <div className="text-center py-20 text-gray-500 text-sm">
                Không tìm thấy coin.{' '}
                <button onClick={() => navigate('/market')} className="text-indigo-400 hover:underline">
                    Quay lại Market
                </button>
            </div>
        )
    }

    const positive = liveChange >= 0

    return (
        <div className="space-y-6 max-w-7xl">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={() => navigate('/market')}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-800 text-gray-500 hover:bg-gray-800 hover:text-white transition shrink-0"
                >
                    <ArrowLeft size={16} />
                </button>

                <img src={coin.image} alt={coin.name} className="w-9 h-9 rounded-full shrink-0" />

                <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{coin.name}</h1>
                    <span className="text-xs text-gray-500 uppercase">{coin.symbol}</span>
                </div>

                {/* Live price display */}
                <div className="flex items-center gap-3 ml-1">
                    <span className={cn(
                        'text-2xl font-bold font-mono transition-colors duration-500',
                        flash === 'up'   ? 'text-emerald-400' :
                        flash === 'down' ? 'text-red-400' : 'text-white',
                    )}>
                        {livePrice ? formatUSD(livePrice) : '—'}
                    </span>

                    <span className={cn(
                        'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                        positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                    )}>
                        {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPct(liveChange)}
                    </span>

                    {/* Live badge */}
                    {liveTick && (
                        <span className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                        </span>
                    )}
                </div>

                {/* Set Alert button */}
                {isAuthenticated && livePrice && (
                    <button
                        onClick={() => setAlertOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition ml-auto"
                    >
                        <Bell size={14} />
                        Set Alert
                    </button>
                )}
            </div>

            {/* Set Alert Modal */}
            {alertOpen && livePrice && (
                <SetAlertModal
                    coinId={coinId!}
                    coinSymbol={coin.symbol}
                    coinName={coin.name}
                    currentPrice={livePrice}
                    onClose={() => setAlertOpen(false)}
                />
            )}

            {/* ── Body ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left — Chart + Stats */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Chart card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <CandlestickChart coinId={coinId!} livePrice={livePrice} />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard
                            label="Market Cap"
                            value={formatLarge(coin.marketCap)}
                            icon={BarChart3}
                        />
                        <StatCard
                            label="Volume 24h"
                            value={formatLarge(coin.totalVolume)}
                            icon={Activity}
                        />
                        <StatCard
                            label="24h High"
                            value={liveHigh ? formatUSD(liveHigh) : '—'}
                            icon={TrendingUp}
                            sub="từ Binance"
                        />
                        <StatCard
                            label="24h Low"
                            value={liveLow ? formatUSD(liveLow) : '—'}
                            icon={TrendingDown}
                            sub="từ Binance"
                        />
                    </div>

                    {/* Extra info row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard
                            label="Biến động 24h"
                            value={formatPct(liveChange)}
                            icon={ArrowUpDown}
                        />
                        <StatCard
                            label="Symbol"
                            value={coin.symbol.toUpperCase()}
                            icon={DollarSign}
                        />
                        <StatCard
                            label="Nguồn giá"
                            value={liveTick ? 'Binance WS' : 'CoinGecko'}
                            icon={Activity}
                            sub={liveTick ? 'realtime' : 'snapshot'}
                        />
                    </div>
                </div>

                {/* Right — Trading Panel / Login CTA */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-400">
                        {isAuthenticated ? 'Ghi lại giao dịch' : 'Bắt đầu đầu tư'}
                    </h2>

                    {isAuthenticated
                        ? <TradingPanel coinId={coinId!} coinSymbol={coin.symbol} currentPrice={livePrice ?? coin.currentPrice} />
                        : <LoginCTA />
                    }

                    {isAuthenticated && (
                        <p className="text-xs text-gray-600 text-center leading-relaxed">
                            Giao dịch được lưu vào ví bạn chọn.<br />
                            Giá tự động điền từ Binance realtime.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
