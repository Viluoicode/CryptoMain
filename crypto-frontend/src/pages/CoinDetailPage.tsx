// src/pages/CoinDetailPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    createChart, CandlestickSeries, LineSeries, ColorType,
    CrosshairMode, LineStyle,
} from 'lightweight-charts'
import type { ISeriesApi, IChartApi, IPriceLine, Time, LineData } from 'lightweight-charts'
import { calcEMA, calcRSI, type OhlcBar, type RsiState } from '@/lib/indicators'
import {
    ArrowLeft, TrendingUp, TrendingDown, Wallet,
    Activity, BarChart3, DollarSign, ArrowUpDown, Bell,
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
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'


interface OhlcPoint { timestamp: number; open: number; high: number; low: number; close: number }
type DayRange = 1 | 7 | 14 | 30 | 90
interface OhlcDisplay { open: number; high: number; low: number; close: number; isUp: boolean }

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
    { label: '1D', value: 1 }, { label: '7D', value: 7 },
    { label: '14D', value: 14 }, { label: '1M', value: 30 }, { label: '3M', value: 90 },
]

function DetailStatCard({ label, value, icon: Icon, sub }: {
    label: string; value: string; icon: typeof Activity; sub?: string
}) {
    return (
        <Card className="p-4 hover-glow transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-bold text-white font-mono leading-none">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 mt-1 font-medium">{sub}</p>}
        </Card>
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

    useEffect(() => {
        if (!containerRef.current) return

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0b0e11' },
                textColor:  '#6b7280',
                fontFamily: "Inter, system-ui, sans-serif",
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.03)' },
                horzLines: { color: 'rgba(255,255,255,0.03)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: 'rgba(0,89,251,0.3)', style: LineStyle.Dashed, width: 1 },
                horzLine: { color: 'rgba(0,89,251,0.3)', style: LineStyle.Dashed, width: 1 },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins:  { top: 0.08, bottom: 0.26 },
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
            upColor:         '#03c076',
            downColor:       '#f6465d',
            borderUpColor:   '#03c076',
            borderDownColor: '#f6465d',
            wickUpColor:     '#03c076',
            wickDownColor:   '#f6465d',
        })

        const makeEma = (color: string) => chart.addSeries(LineSeries, {
            color, lineWidth: 1,
            priceLineVisible: false, lastValueVisible: false,
            crosshairMarkerVisible: false, visible: false,
        })
        const ema20  = makeEma('#eab308')
        const ema50  = makeEma('#3b82f6')
        const ema200 = makeEma('#ec4899')

        const rsi = chart.addSeries(LineSeries, {
            color: '#8b5cf6', lineWidth: 1,
            priceScaleId: 'rsi',
            priceLineVisible: false, lastValueVisible: true,
            crosshairMarkerVisible: false, visible: false,
        })
        const rsiOb = chart.addSeries(LineSeries, {
            color: 'rgba(239,68,68,0.25)', lineWidth: 1, lineStyle: LineStyle.Dashed,
            priceScaleId: 'rsi', priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: false, visible: false,
        })
        const rsiOs = chart.addSeries(LineSeries, {
            color: 'rgba(16,185,129,0.25)', lineWidth: 1, lineStyle: LineStyle.Dashed,
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

    useEffect(() => {
        ema20Ref.current?.applyOptions({ visible: emaVis.e20 })
        ema50Ref.current?.applyOptions({ visible: emaVis.e50 })
        ema200Ref.current?.applyOptions({ visible: emaVis.e200 })
    }, [emaVis])

    useEffect(() => {
        rsiRef.current?.applyOptions({ visible: showRSI })
        rsiObRef.current?.applyOptions({ visible: showRSI })
        rsiOsRef.current?.applyOptions({ visible: showRSI })
        chartRef.current?.priceScale('right').applyOptions({
            scaleMargins: showRSI ? { top: 0.08, bottom: 0.26 } : { top: 0.08, bottom: 0.08 },
        })
    }, [showRSI])

    useEffect(() => {
        if (!candleRef.current || !ohlcData?.length) return

        const bars: OhlcBar[] = ohlcData
            .map(p => ({
                time:  Math.floor(p.timestamp / 1000),
                open:  p.open, high: p.high, low: p.low, close: p.close,
            }))
            .sort((a, b) => a.time - b.time)
            .filter((item, i, arr) => i === 0 || item.time !== arr[i - 1].time)

        candleRef.current.setData(bars.map(b => ({
            time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close,
        })))
        chartRef.current?.timeScale().fitContent()

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

        ema20Ref.current?.applyOptions({ visible: emaVis.e20 })
        ema50Ref.current?.applyOptions({ visible: emaVis.e50 })
        ema200Ref.current?.applyOptions({ visible: emaVis.e200 })

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
    }, [ohlcData])

    useEffect(() => {
        if (!candleRef.current || !livePrice) return

        if (priceLineRef.current) {
            try { candleRef.current.removePriceLine(priceLineRef.current) } catch { /* */ }
        }
        priceLineRef.current = candleRef.current.createPriceLine({
            price: livePrice, color: '#0059FB',
            lineWidth: 1, lineStyle: LineStyle.Dashed,
            axisLabelVisible: true, title: '● LIVE',
        })

        prevLiveRef.current = livePrice
    }, [livePrice])

    const toggleEma = (key: keyof CdEmaVis) =>
        setEmaVis(prev => ({ ...prev, [key]: !prev[key] }))

    return (
        <div className="space-y-4">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* OHLC + indicator tooltip */}
                <div className="flex items-center gap-3 text-xs font-mono min-h-[20px] flex-wrap">
                    {ohlc ? (
                        <>
                            <span className="text-gray-500">O <span className="text-gray-300 font-semibold">{formatUSD(ohlc.open)}</span></span>
                            <span className="text-gray-500">H <span className="text-profit font-semibold">{formatUSD(ohlc.high)}</span></span>
                            <span className="text-gray-500">L <span className="text-loss font-semibold">{formatUSD(ohlc.low)}</span></span>
                            <span className="text-gray-500">C <span className={ohlc.isUp ? 'text-profit font-semibold' : 'text-loss font-semibold'}>{formatUSD(ohlc.close)}</span></span>
                            {emaTooltip?.e20  !== undefined && emaVis.e20  && <span className="text-yellow-400 font-semibold">EMA20 {formatUSD(emaTooltip.e20)}</span>}
                            {emaTooltip?.e50  !== undefined && emaVis.e50  && <span className="text-blue-400 font-semibold">EMA50 {formatUSD(emaTooltip.e50)}</span>}
                            {emaTooltip?.e200 !== undefined && emaVis.e200 && <span className="text-pink-400 font-semibold">EMA200 {formatUSD(emaTooltip.e200)}</span>}
                            {rsiTooltip !== null && showRSI && (
                                <span className={cn(
                                    'font-bold',
                                    rsiTooltip > 70 ? 'text-loss' :
                                    rsiTooltip < 30 ? 'text-profit' : 'text-purple-400',
                                )}>
                                    RSI {rsiTooltip.toFixed(1)}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-gray-500 font-semibold">Hover chart to inspect details</span>
                    )}
                </div>

                <div className="flex items-center gap-3.5 flex-wrap">
                    {/* EMA toggles */}
                    <div className="flex items-center gap-1.5 bg-navy-950/60 p-0.5 rounded-lg border border-white/[0.04]">
                        {(
                            [
                                { key: 'e20'  as const, label: 'EMA20',  cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                                { key: 'e50'  as const, label: 'EMA50',  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20'   },
                                { key: 'e200' as const, label: 'EMA200', cls: 'text-pink-400 bg-pink-500/10 border-pink-500/20'   },
                            ]
                        ).map(({ key, label, cls }) => (
                            <button
                                key={key}
                                onClick={() => toggleEma(key)}
                                className={cn(
                                    'px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all duration-200',
                                    emaVis[key] ? cls : 'text-gray-500 border-transparent hover:text-gray-300',
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
                            'px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all duration-200',
                            showRSI ? 'text-purple-450 bg-purple-500/10 border-purple-500/20 font-bold' : 'text-gray-500 border-transparent hover:text-gray-300 bg-navy-950/60 p-1 border border-white/[0.04]',
                        )}
                    >
                        RSI
                    </button>

                    {/* Timeframe */}
                    <div className="flex gap-0.5 bg-navy-950/60 p-1 rounded-lg border border-white/[0.04]">
                        {RANGES.map(r => (
                            <button key={r.value} onClick={() => setDays(r.value)}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200',
                                    days === r.value
                                        ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-white border border-white/[0.08] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-300',
                                )}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Chart container ── */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-navy-950">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-950/90 z-10">
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <svg className="h-4 w-4 animate-spin text-accent-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Loading Chart data...
                        </div>
                    </div>
                )}
                <div ref={containerRef} className="w-full" />
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 text-[10px] font-semibold text-gray-500 flex-wrap uppercase tracking-wider">
                {livePrice && (
                    <span className="flex items-center gap-1.5">
                        <span className="w-5 h-px border-t border-dashed border-accent-cyan" />
                        <span className="text-accent-cyan font-mono">● LIVE {formatUSD(livePrice)}</span>
                    </span>
                )}
                {emaVis.e20  && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-yellow-450 inline-block" />EMA 20</span>}
                {emaVis.e50  && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" />EMA 50</span>}
                {emaVis.e200 && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-pink-500 inline-block" />EMA 200</span>}
                {showRSI     && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-500 inline-block" />RSI(14) · OB 70 / OS 30</span>}
            </div>
        </div>
    )
}

function LoginCTA() {
    return (
        <Card className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-cyan/10 to-accent-purple/10 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto text-accent-cyan">
                <TrendingUp size={20} />
            </div>
            <div>
                <p className="font-bold text-white mb-1">Sign in to trade</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                    Create a free account to track and log your custom paper transactions.
                </p>
            </div>
            <div className="space-y-2">
                <Link to="/register" className="block w-full">
                    <Button variant="primary" size="md" className="w-full">
                        Create Free Account
                    </Button>
                </Link>
                <Link to="/login" className="block w-full">
                    <Button variant="outline" size="md" className="w-full">
                        Sign In
                    </Button>
                </Link>
            </div>
        </Card>
    )
}

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
            <Card className="p-6 text-center space-y-4">
                <div className="w-10 h-10 bg-accent-cyan/10 rounded-xl flex items-center justify-center mx-auto text-accent-cyan">
                    <Wallet size={18} />
                </div>
                <p className="text-xs text-gray-400">You don't have any wallets created.</p>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/wallets')}
                    className="w-full"
                >
                    Create Wallet
                </Button>
            </Card>
        )
    }

    const selectOptions = [
        { value: '', label: '-- Choose Wallet --' },
        ...(wallets?.map(w => ({ value: w.id, label: w.name })) ?? [])
    ]

    return (
        <Card className="p-0 overflow-hidden">
            {/* Buy / Sell tabs */}
            <div className="grid grid-cols-2 border-b border-white/[0.06] bg-navy-950/40">
                <button
                    type="button"
                    onClick={() => { setType(1); setQuantity('') }}
                    className={cn(
                        'py-3.5 text-xs font-bold transition-all duration-200',
                        type === 1
                            ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                            : 'text-gray-500 hover:text-gray-300',
                    )}
                >
                    ▲ BUY
                </button>
                <button
                    type="button"
                    onClick={() => { setType(2); setQuantity('') }}
                    className={cn(
                        'py-3.5 text-xs font-bold transition-all duration-200',
                        type === 2
                            ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                            : 'text-gray-500 hover:text-gray-300',
                    )}
                >
                    ▼ SELL
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Wallet select */}
                <Select
                    label="Wallet"
                    options={selectOptions}
                    value={walletId}
                    onChange={e => { setWalletId(e.target.value); setQuantity('') }}
                />

                {/* Cannot sell alert */}
                {cannotSell && (
                    <div className="bg-red-550/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-red-400 mb-0.5">Unavailable to Sell</p>
                        <p className="text-xs text-red-450/70">This wallet holds no <span className="uppercase font-semibold">{coinSymbol}</span>.</p>
                    </div>
                )}

                {/* Sell balance info */}
                {isSell && !!walletId && holdingQty > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-amber-400/80 font-medium">Available balance</span>
                        <div className="text-right">
                            <p className="text-xs font-bold text-amber-300 font-mono">
                                {holdingQty} <span className="uppercase">{coinSymbol}</span>
                            </p>
                            <button type="button" onClick={() => setQuantity(holdingQty.toString())}
                                className="text-[10px] font-bold text-amber-400 hover:underline uppercase tracking-wide mt-0.5">
                                Sell Max
                            </button>
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <Input
                    label={`Amount (${coinSymbol.toUpperCase()})`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={quantity}
                    disabled={cannotSell}
                    onChange={e => setQuantity(e.target.value)}
                    error={exceedsHolding ? `Exceeds wallet balance. Max: ${holdingQty}` : undefined}
                />

                {/* Price */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">Price Per Coin (USD)</label>
                        <button
                            type="button"
                            onClick={() => setPrice(currentPrice.toFixed(8))}
                            className="text-xs font-semibold text-accent-cyan hover:underline"
                        >
                            Use Live Price
                        </button>
                    </div>
                    <Input
                        type="number"
                        step="any"
                        min="0"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                </div>

                {/* Total */}
                {total > 0 && (
                    <div className="bg-navy-950/40 border border-white/[0.04] rounded-xl px-4 py-3.5 flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Value</span>
                        <span className="text-sm font-bold text-white font-mono">{formatUSD(total)}</span>
                    </div>
                )}

                {/* Notes */}
                <Input
                    label="Notes (Optional)"
                    type="text"
                    placeholder="Trade memo..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />

                {/* Success */}
                {success && (
                    <Badge variant="success" className="w-full justify-center py-2 text-xs font-semibold">
                        ✅ Transaction recorded successfully!
                    </Badge>
                )}

                <Button
                    type="submit"
                    disabled={!walletId || !quantity || !price || isPending || sellDisabled}
                    variant={type === 1 ? 'primary' : 'danger'}
                    className="w-full py-3"
                >
                    {isPending ? 'Processing...' : type === 1
                        ? `Buy ${coinSymbol.toUpperCase()}`
                        : `Sell ${coinSymbol.toUpperCase()}`}
                </Button>
            </form>
        </Card>
    )
}

function SetAlertModal({ coinId, coinSymbol, coinName, currentPrice, onClose }: {
    coinId: string; coinSymbol: string; coinName: string; currentPrice: number; onClose: () => void
}) {
    const [direction, setDirection] = useState<AlertDirection>(1)
    const [targetPrice, setTargetPrice] = useState(
        (currentPrice * (direction === 1 ? 1.05 : 0.95)).toFixed(2)
    )
    const createAlert = useCreateAlert()
    const toast = useToast()

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
                    toast.success(`Alert set!`, `${coinSymbol.toUpperCase()} ${direction === 1 ? '≥' : '≤'} $${price.toLocaleString()}`)
                    onClose()
                },
                onError: () => toast.error('Failed to set price alert'),
            }
        )
    }

    return (
        <Modal open={true} onClose={onClose} title="Set Price Alert">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Coin info */}
                <div className="bg-navy-950/40 border border-white/[0.04] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Asset</p>
                        <p className="text-sm font-bold text-white uppercase">{coinSymbol} · {coinName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Market Price</p>
                        <p className="text-sm font-bold font-mono text-white">{formatUSD(currentPrice)}</p>
                    </div>
                </div>

                {/* Direction */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Trigger Condition</label>
                    <div className="grid grid-cols-2 gap-3">
                        {([1, 2] as AlertDirection[]).map(d => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => handleDirectionChange(d)}
                                className={cn(
                                    'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border transition-all duration-200',
                                    direction === d
                                        ? d === 1
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                        : 'bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-gray-300',
                                )}
                            >
                                {d === 1
                                    ? <><TrendingUp size={14} /> ABOVE (≥)</>
                                    : <><TrendingDown size={14} /> BELOW (≤)</>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Target price */}
                <div className="space-y-1.5">
                    <Input
                        label="Target Price (USD)"
                        type="number"
                        step="any"
                        min="0"
                        value={targetPrice}
                        onChange={e => setTargetPrice(e.target.value)}
                        placeholder="0.00"
                    />
                    {parseFloat(targetPrice) > 0 && (
                        <p className="text-xs text-gray-500 font-semibold font-mono">
                            {(() => {
                                const pct = ((parseFloat(targetPrice) - currentPrice) / currentPrice) * 100
                                return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% difference from current price`
                            })()}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createAlert.isPending || !targetPrice || parseFloat(targetPrice) <= 0}
                        variant="primary"
                        size="md"
                        className="flex-1"
                    >
                        {createAlert.isPending ? 'Setting Alert...' : 'Set Alert'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

export function CoinDetailPage() {
    const { coinId } = useParams<{ coinId: string }>()
    const navigate   = useNavigate()
    const { isAuthenticated } = useAuth()

    const { data: coin, isLoading, isError } = useQuery({
        queryKey: ['crypto', coinId],
        queryFn: () => getCryptoById(coinId!),
        enabled: !!coinId,
        staleTime: 1000 * 60 * 2,
    })

    const symbol = coin?.symbol?.toLowerCase() ?? ''
    useBinanceWs(symbol ? [symbol] : [])
    const { ticks } = useLivePriceStore()
    const liveTick = symbol ? ticks[symbol] : undefined

    const livePrice  = liveTick?.price    ?? coin?.currentPrice
    const liveChange = liveTick?.change24h ?? coin?.priceChangePercentage24h ?? 0
    const liveHigh   = liveTick?.high24h
    const liveLow    = liveTick?.low24h

    const [alertOpen, setAlertOpen] = useState(false)
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

    if (isLoading) {
        return (
            <div className="max-w-7xl space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <Skeleton className="h-5 w-48 rounded" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        <Skeleton className="h-[520px] rounded-2xl" />
                        <div className="grid grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    </div>
                    <Skeleton className="h-96 rounded-2xl" />
                </div>
            </div>
        )
    }

    if (isError || !coin) {
        return (
            <div className="text-center py-20 text-gray-505">
                <p className="text-sm font-semibold text-gray-400 mb-3">Asset detail could not be retrieved.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/market')}>
                    Back to Market
                </Button>
            </div>
        )
    }

    const positive = liveChange >= 0

    return (
        <div className="space-y-6 max-w-7xl animate-fade-in">
            {/* ── Header ── */}
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={() => navigate('/market')}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/[0.08] text-gray-500 hover:bg-white/[0.05] hover:text-white transition shrink-0"
                >
                    <ArrowLeft size={16} />
                </button>

                <img src={coin.image} alt={coin.name} className="w-9 h-9 rounded-full shrink-0" />

                <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{coin.name}</h1>
                    <span className="text-xs text-gray-500 uppercase font-semibold">{coin.symbol}</span>
                </div>

                {/* Live price display */}
                <div className="flex items-center gap-3 ml-2">
                    <span className={cn(
                        'text-2xl font-bold font-mono transition-colors duration-500',
                        flash === 'up'   ? 'text-profit' :
                        flash === 'down' ? 'text-loss' : 'text-white',
                    )}>
                        {livePrice ? formatUSD(livePrice) : '—'}
                    </span>

                    <span className={cn(
                        'flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border border-current/10',
                        positive ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10',
                    )}>
                        {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPct(liveChange)}
                    </span>

                    {/* Live badge */}
                    {liveTick && (
                        <Badge variant="success" dot>LIVE</Badge>
                    )}
                </div>

                {/* Set Alert button */}
                {isAuthenticated && livePrice && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAlertOpen(true)}
                        className="ml-auto border-amber-500/25 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40"
                    >
                        <Bell size={14} className="mr-1" />
                        Set Alert
                    </Button>
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
                <div className="lg:col-span-2 space-y-6">
                    {/* Chart card */}
                    <Card className="p-5">
                        <CandlestickChart coinId={coinId!} livePrice={livePrice} />
                    </Card>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <DetailStatCard
                            label="Market Cap"
                            value={formatLarge(coin.marketCap)}
                            icon={BarChart3}
                        />
                        <DetailStatCard
                            label="Volume 24h"
                            value={formatLarge(coin.totalVolume)}
                            icon={Activity}
                        />
                        <DetailStatCard
                            label="24h High"
                            value={liveHigh ? formatUSD(liveHigh) : '—'}
                            icon={TrendingUp}
                            sub="Binance stream"
                        />
                        <DetailStatCard
                            label="24h Low"
                            value={liveLow ? formatUSD(liveLow) : '—'}
                            icon={TrendingDown}
                            sub="Binance stream"
                        />
                    </div>

                    {/* Extra info row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <DetailStatCard
                            label="24h Change"
                            value={formatPct(liveChange)}
                            icon={ArrowUpDown}
                        />
                        <DetailStatCard
                            label="Symbol"
                            value={coin.symbol.toUpperCase()}
                            icon={DollarSign}
                        />
                        <DetailStatCard
                            label="Price Feed"
                            value={liveTick ? 'Binance WS' : 'CoinGecko'}
                            icon={Activity}
                            sub={liveTick ? 'streaming active' : 'rest snapshot'}
                        />
                    </div>
                </div>

                {/* Right — Trading Panel / Login CTA */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {isAuthenticated ? 'Execute Transaction' : 'Get Started'}
                    </h2>

                    {isAuthenticated
                        ? <TradingPanel coinId={coinId!} coinSymbol={coin.symbol} currentPrice={livePrice ?? coin.currentPrice} />
                        : <LoginCTA />
                    }

                    {isAuthenticated && (
                        <p className="text-xs text-gray-600 text-center leading-relaxed font-semibold">
                            Transactions are recorded instantly into your chosen paper wallet.<br />
                            Prices are populated from the live stream.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
