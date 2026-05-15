// src/pages/FuturesPage.tsx
// ─── Full trading terminal — KLineChart edition ───────────────────────────────
// Layout:
//   SymbolHeader  (full width, live price + 24h stats)
//   ┌───┬──────────────────────────┬────────────┬──────────────┐
//   │ D │  FuturesChart (flex-1)   │  OrderBook │  TradingPanel│
//   │ r │  [Drawing toolbar left]  │  (fixed w) │  (fixed w)   │
//   │ a ├──────────────────────────│            │              │
//   │ w │  Trades | Depth tab      │            │              │
//   └───┴──────────────────────────┴────────────┴──────────────┘

import { useEffect, useRef, useState, useCallback } from 'react'
import { init, dispose, type Chart } from 'klinecharts'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useBinanceStream } from '@/hooks/useBinanceStream'
import { cn } from '@/lib/utils'
import { formatUSD } from '@/lib/format'
import {
    TrendingUp, ChevronDown, RefreshCw,
    Activity, BarChart3, Layers,
    MousePointer2, Minus, ArrowUpRight, ArrowRight,
    Square, GitBranch, AlignJustify, Trash2,
} from 'lucide-react'
import { buildDepthPoints, type DepthPoint } from '@/lib/indicators'
import { useCreateTransaction, useWalletTransactions } from '@/hooks/useTransaction'
import { useWallets, useWalletDetail } from '@/hooks/useWallet'
import { useToast } from '@/components/ui/Toast'

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAIRS = [
    { symbol: 'BTCUSDT',  base: 'BTC',  quote: 'USDT', label: 'BTC/USDT',  geckoId: 'bitcoin'     },
    { symbol: 'ETHUSDT',  base: 'ETH',  quote: 'USDT', label: 'ETH/USDT',  geckoId: 'ethereum'    },
    { symbol: 'BNBUSDT',  base: 'BNB',  quote: 'USDT', label: 'BNB/USDT',  geckoId: 'binancecoin' },
    { symbol: 'SOLUSDT',  base: 'SOL',  quote: 'USDT', label: 'SOL/USDT',  geckoId: 'solana'      },
    { symbol: 'XRPUSDT',  base: 'XRP',  quote: 'USDT', label: 'XRP/USDT',  geckoId: 'ripple'      },
    { symbol: 'ADAUSDT',  base: 'ADA',  quote: 'USDT', label: 'ADA/USDT',  geckoId: 'cardano'     },
    { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', label: 'DOGE/USDT', geckoId: 'dogecoin'    },
]

const INTERVALS = [
    { key: '1m',  label: '1m' },
    { key: '5m',  label: '5m' },
    { key: '15m', label: '15m' },
    { key: '1h',  label: '1H' },
    { key: '4h',  label: '4H' },
    { key: '1d',  label: '1D' },
]

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MiniTicker {
    e: string; s: string; c: string; o: string
    h: string; l: string; v: string; q: string
}

interface KlineMsg {
    e: string
    k: { t: number; o: string; h: string; l: string; c: string; v: string; x: boolean }
}

interface DepthMsg {
    lastUpdateId: number
    bids: [string, string][]
    asks: [string, string][]
}

interface TradeMsg { e: string; T: number; p: string; q: string; m: boolean }

interface Tick24h {
    price: number; open: number; high: number; low: number
    volume: number; quoteVolume: number; change: number
}

interface DepthLevel { price: number; qty: number; total: number }
interface RecentTrade { id: number; price: number; qty: number; isSell: boolean; time: number }

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000)         return `${(n / 1_000).toFixed(2)}K`
    return n.toFixed(decimals)
}

function fmtPrice(p: number, symbol: string): string {
    if (symbol.startsWith('DOGE') || symbol.startsWith('ADA')) return p.toFixed(5)
    if (p >= 1000) return p.toFixed(2)
    if (p >= 1)    return p.toFixed(4)
    return p.toFixed(6)
}

// ─── SymbolHeader ──────────────────────────────────────────────────────────────
interface SymbolHeaderProps {
    pair: typeof PAIRS[0]
    tick: Tick24h | null
    flash: 'up' | 'down' | null
    onSelectPair: (p: typeof PAIRS[0]) => void
}
function SymbolHeader({ pair, tick, flash, onSelectPair }: SymbolHeaderProps) {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex items-center gap-6 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-wrap">
            {/* Pair selector */}
            <div className="relative">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-2 transition"
                >
                    <div className="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                        <TrendingUp size={12} className="text-indigo-400" />
                    </div>
                    <span className="font-bold text-white text-sm">{pair.label}</span>
                    <ChevronDown size={14} className="text-gray-400" />
                </button>
                {open && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl min-w-[160px]">
                        {PAIRS.map(p => (
                            <button
                                key={p.symbol}
                                onClick={() => { onSelectPair(p); setOpen(false) }}
                                className={cn(
                                    'flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-700 transition text-left',
                                    p.symbol === pair.symbol ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300',
                                )}
                            >
                                <span className="font-semibold">{p.base}</span>
                                <span className="text-gray-500 text-xs">/ {p.quote}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Live price */}
            <div className={cn(
                'text-2xl font-bold font-mono transition-colors duration-300',
                flash === 'up'   ? 'text-emerald-400' :
                flash === 'down' ? 'text-red-400' :
                tick && tick.change >= 0 ? 'text-emerald-400' : 'text-red-400',
            )}>
                {tick ? fmtPrice(tick.price, pair.symbol) : '—'}
            </div>

            {/* 24h stats */}
            {tick && (
                <>
                    <StatPill
                        label="24h Change"
                        value={`${tick.change >= 0 ? '+' : ''}${tick.change.toFixed(2)}%`}
                        color={tick.change >= 0 ? 'emerald' : 'red'}
                    />
                    <StatPill label="24h High"  value={fmtPrice(tick.high, pair.symbol)} />
                    <StatPill label="24h Low"   value={fmtPrice(tick.low, pair.symbol)} />
                    <StatPill label="Volume"    value={`${fmt(tick.volume)} ${pair.base}`} />
                    <StatPill label="Quote Vol" value={`$${fmt(tick.quoteVolume)}`} />
                </>
            )}

            <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">LIVE</span>
            </div>
        </div>
    )
}

function StatPill({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'red' }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
            <span className={cn(
                'text-sm font-mono font-semibold',
                color === 'emerald' ? 'text-emerald-400' :
                color === 'red'     ? 'text-red-400' : 'text-gray-200',
            )}>
                {value}
            </span>
        </div>
    )
}

// ─── KLineChart dark theme ─────────────────────────────────────────────────────
const KLINE_DARK_STYLES = {
    grid: {
        horizontal: { color: '#1f2937' },
        vertical:   { color: '#1f2937' },
    },
    candle: {
        bar: {
            upColor:             '#10b981',
            downColor:           '#ef4444',
            noChangeColor:       '#6b7280',
            upBorderColor:       '#10b981',
            downBorderColor:     '#ef4444',
            noChangeBorderColor: '#6b7280',
            upWickColor:         '#10b981',
            downWickColor:       '#ef4444',
            noChangeWickColor:   '#6b7280',
        },
        priceMark: {
            last: {
                upColor:     '#10b981',
                downColor:   '#ef4444',
                noChangeColor: '#6b7280',
                line:  { show: true,  style: 'dashed' },
                text:  { show: true,  color: '#fff', backgroundColor: '#374151', borderColor: '#4b5563' },
            },
        },
        tooltip: {
            rect: { color: '#111827', borderColor: '#374151', borderRadius: 4 },
            text: { color: '#9ca3af' },
        },
    },
    indicator: {
        lines: [
            { color: '#facc15' }, // yellow  — 1st calc param
            { color: '#60a5fa' }, // blue    — 2nd
            { color: '#f472b6' }, // pink    — 3rd
            { color: '#a78bfa' }, // violet  — 4th
            { color: '#34d399' }, // green   — 5th
        ],
        bars: [
            {
                style: 'fill',
                upColor:      'rgba(16,185,129,.5)',
                downColor:    'rgba(239,68,68,.5)',
                noChangeColor:'rgba(107,114,128,.5)',
            },
        ],
        tooltip: { text: { color: '#9ca3af' } },
    },
    xAxis: {
        axisLine: { color: '#374151' },
        tickLine: { color: '#374151' },
        tickText: { color: '#6b7280', size: 11 },
    },
    yAxis: {
        axisLine: { color: '#374151' },
        tickLine: { color: '#374151' },
        tickText: { color: '#6b7280', size: 11 },
    },
    crosshair: {
        horizontal: {
            line: { style: 'dashed', color: '#6b7280' },
            text: { color: '#fff', backgroundColor: '#374151', borderColor: '#4b5563', borderRadius: 3 },
        },
        vertical: {
            line: { style: 'dashed', color: '#6b7280' },
            text: { color: '#fff', backgroundColor: '#374151', borderColor: '#4b5563', borderRadius: 3 },
        },
    },
    overlay: {
        point: {
            color:             '#6366f1',
            borderColor:       'rgba(99,102,241,.4)',
            activeColor:       '#818cf8',
            activeBorderColor: 'rgba(129,140,248,.4)',
            activeBorderSize:  3,
        },
        line:    { style: 'solid', color: '#6366f1', size: 1.5 },
        rect:    { style: 'fill', color: 'rgba(99,102,241,.12)', borderColor: '#6366f1', borderSize: 1 },
        polygon: { style: 'fill', color: 'rgba(99,102,241,.12)', borderColor: '#6366f1', borderSize: 1 },
        circle:  { style: 'fill', color: 'rgba(99,102,241,.12)', borderColor: '#6366f1', borderSize: 1 },
        text:    { style: 'fill', color: '#818cf8', size: 13, borderColor: '#6366f1', backgroundColor: 'transparent' },
    },
}

// ─── Drawing tools definition ──────────────────────────────────────────────────
type DrawTool = {
    id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>
    label: string
    overlay: string | null
    group: string
}

const DRAWING_TOOLS: DrawTool[] = [
    { id: 'cursor',               icon: MousePointer2, label: 'Cursor (Esc)',         overlay: null,                   group: 'cursor'  },
    { id: 'segment',              icon: Minus,         label: 'Trend Line',            overlay: 'segment',              group: 'line'    },
    { id: 'rayLine',              icon: ArrowUpRight,  label: 'Ray',                   overlay: 'rayLine',              group: 'line'    },
    { id: 'horizontalRayLine',    icon: ArrowRight,    label: 'Horizontal Ray',        overlay: 'horizontalRayLine',    group: 'line'    },
    { id: 'horizontalStraightLine',icon: Minus,        label: 'Horizontal Line',       overlay: 'horizontalStraightLine',group:'line'   },
    { id: 'parallelStraightLine', icon: AlignJustify,  label: 'Parallel Channel',      overlay: 'parallelStraightLine', group: 'channel' },
    { id: 'priceChannelLine',     icon: AlignJustify,  label: 'Price Channel',         overlay: 'priceChannelLine',     group: 'channel' },
    { id: 'rect',                 icon: Square,        label: 'Rectangle',             overlay: 'rect',                 group: 'shape'   },
    { id: 'fibonacciLine',        icon: GitBranch,     label: 'Fibonacci Retracement', overlay: 'fibonacciLine',        group: 'fib'     },
]

// ─── DrawingToolbar ────────────────────────────────────────────────────────────
function DrawingToolbar({
    activeTool,
    onSelect,
    onClearAll,
}: {
    activeTool: string
    onSelect: (id: string, overlay: string | null) => void
    onClearAll: () => void
}) {
    return (
        <div className="flex flex-col items-center gap-0.5 py-2 px-1 bg-gray-900 border-r border-gray-800 w-9 shrink-0">
            {DRAWING_TOOLS.map((tool, i) => {
                const Icon = tool.icon
                const prevGroup = i > 0 ? DRAWING_TOOLS[i - 1].group : null
                const showSep = prevGroup && prevGroup !== tool.group

                return (
                    <div key={tool.id} className="flex flex-col items-center w-full">
                        {showSep && <div className="w-5 h-px bg-gray-700/60 my-1" />}
                        <button
                            title={tool.label}
                            onClick={() => onSelect(tool.id, tool.overlay)}
                            className={cn(
                                'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
                                activeTool === tool.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800',
                            )}
                        >
                            {/* Horizontal lines share the Minus icon — rotate for H-line vs H-ray visual diff */}
                            {tool.id === 'horizontalStraightLine'
                                ? <Icon size={13} className="opacity-80" />
                                : <Icon size={13} />
                            }
                        </button>
                    </div>
                )
            })}

            {/* Clear all drawings */}
            <div className="w-5 h-px bg-gray-700/60 my-1" />
            <button
                title="Clear all drawings"
                onClick={onClearAll}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
                <Trash2 size={13} />
            </button>
        </div>
    )
}

// ─── Indicator toggle button ───────────────────────────────────────────────────
function IndBtn({ label, active, color, onClick }: {
    label: string; active: boolean; color: string; onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2 py-0.5 text-[11px] font-mono rounded border transition',
                active ? color : 'text-gray-600 border-gray-800 hover:border-gray-700 hover:text-gray-500',
            )}
        >
            {label}
        </button>
    )
}

// ─── FuturesChart (KLineChart) ─────────────────────────────────────────────────
interface FuturesChartProps {
    pair:             typeof PAIRS[0]
    interval:         string
    onIntervalChange: (i: string) => void
    liveKline:        KlineMsg['k'] | null
}

function FuturesChart({ pair, interval, onIntervalChange, liveKline }: FuturesChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef     = useRef<Chart | null>(null)

    const [loading,    setLoading]    = useState(true)
    const [activeTool, setActiveTool] = useState('cursor')
    const [showRSI,    setShowRSI]    = useState(false)
    const [showMACD,   setShowMACD]   = useState(false)
    const [showBOLL,   setShowBOLL]   = useState(false)
    const [showKDJ,    setShowKDJ]    = useState(false)

    // Track dynamic pane IDs so we can removeIndicator later
    const paneIds = useRef<{
        rsi: string | null; macd: string | null
        boll: string | null; kdj: string | null
    }>({ rsi: null, macd: null, boll: null, kdj: null })

    // ── Mount: init chart + permanent indicators ─────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chart = init(containerRef.current, { styles: KLINE_DARK_STYLES as any })
        if (!chart) return
        chartRef.current = chart

        // EMA 7 / 25 / 99 on main candle pane (yellow / blue / pink from styles)
        chart.createIndicator(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { name: 'EMA', calcParams: [7, 25, 99] } as any,
            false,
            { id: 'candle_pane' },
        )

        // Volume pane (always shown)
        chart.createIndicator('VOL', false, { height: 56, gap: { top: 0.2, bottom: 0.1 } })

        // Resize observer
        const ro = new ResizeObserver(() => chart.resize())
        ro.observe(containerRef.current!)

        // Escape → back to cursor
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveTool('cursor')
        }
        window.addEventListener('keydown', handleKey)

        return () => {
            ro.disconnect()
            window.removeEventListener('keydown', handleKey)
            dispose(containerRef.current!)
            chartRef.current = null
        }
    }, []) // mount only

    // ── Fetch klines (on pair / interval change) ──────────────────────────────
    useEffect(() => {
        const chart = chartRef.current
        if (!chart) return
        setLoading(true)

        const url = `https://api.binance.com/api/v3/klines?symbol=${pair.symbol}&interval=${interval}&limit=500`
        fetch(url)
            .then(r => r.json())
            .then((rows: [number, string, string, string, string, string][]) => {
                const data = rows.map(r => ({
                    timestamp: r[0],
                    open:      parseFloat(r[1]),
                    high:      parseFloat(r[2]),
                    low:       parseFloat(r[3]),
                    close:     parseFloat(r[4]),
                    volume:    parseFloat(r[5]),
                }))
                chart.applyNewData(data, false)
                setTimeout(() => chart.scrollToRealTime(), 60)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [pair.symbol, interval])

    // ── Live kline update ─────────────────────────────────────────────────────
    useEffect(() => {
        const chart = chartRef.current
        if (!chart || !liveKline) return
        const k = liveKline
        chart.updateData({
            timestamp: k.t,
            open:      parseFloat(k.o),
            high:      parseFloat(k.h),
            low:       parseFloat(k.l),
            close:     parseFloat(k.c),
            volume:    parseFloat(k.v),
        })
    }, [liveKline])

    // ── Generic toggleable indicator helper (new pane, not candle pane) ────────
    function toggleIndicator(
        name: string,
        show: boolean,
        key: 'rsi' | 'macd' | 'kdj',
        height = 80,
    ) {
        const chart = chartRef.current
        if (!chart) return
        if (show) {
            const id = chart.createIndicator(name, false, { height, gap: { top: 0.2, bottom: 0.1 } })
            paneIds.current[key] = id ?? null
        } else {
            const id = paneIds.current[key]
            if (id) { chart.removeIndicator(id, name); paneIds.current[key] = null }
        }
    }

    useEffect(() => { toggleIndicator('RSI',  showRSI,  'rsi') },  [showRSI])   // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { toggleIndicator('MACD', showMACD, 'macd') }, [showMACD]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { toggleIndicator('KDJ',  showKDJ,  'kdj') },  [showKDJ])  // eslint-disable-line react-hooks/exhaustive-deps

    // BOLL lives on the main candle pane — no separate pane needed
    useEffect(() => {
        const chart = chartRef.current
        if (!chart) return
        if (showBOLL) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chart.createIndicator({ name: 'BOLL' } as any, false, { id: 'candle_pane' })
        } else {
            chart.removeIndicator('candle_pane', 'BOLL')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showBOLL])

    // ── Drawing tool selection ────────────────────────────────────────────────
    function handleToolSelect(id: string, overlay: string | null) {
        setActiveTool(id)
        if (overlay) chartRef.current?.createOverlay(overlay)
    }

    function handleClearAll() {
        chartRef.current?.removeOverlay()
        setActiveTool('cursor')
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-gray-950">

            {/* ── Top toolbar ── */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900 flex-wrap shrink-0">
                {/* Interval */}
                <div className="flex items-center gap-0.5">
                    <BarChart3 size={11} className="text-gray-600 mr-1" />
                    {INTERVALS.map(iv => (
                        <button
                            key={iv.key}
                            onClick={() => onIntervalChange(iv.key)}
                            className={cn(
                                'px-2.5 py-1 text-xs rounded-lg font-medium transition',
                                iv.key === interval
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
                            )}
                        >
                            {iv.label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-4 bg-gray-800" />

                {/* Indicator toggles */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-0.5">Ind</span>
                    <IndBtn label="RSI"  active={showRSI}  color="text-violet-400 border-violet-400/40" onClick={() => setShowRSI(v  => !v)} />
                    <IndBtn label="MACD" active={showMACD} color="text-blue-400   border-blue-400/40"   onClick={() => setShowMACD(v => !v)} />
                    <IndBtn label="BOLL" active={showBOLL} color="text-orange-400 border-orange-400/40" onClick={() => setShowBOLL(v => !v)} />
                    <IndBtn label="KDJ"  active={showKDJ}  color="text-pink-400   border-pink-400/40"   onClick={() => setShowKDJ(v  => !v)} />
                </div>

                {/* EMA legend */}
                <div className="ml-auto flex items-center gap-2.5 text-[10px] font-mono">
                    <span><span className="text-yellow-400">■</span> EMA7</span>
                    <span><span className="text-blue-400">■</span> EMA25</span>
                    <span><span className="text-pink-400">■</span> EMA99</span>
                </div>
            </div>

            {/* ── Chart area: drawing toolbar + chart ── */}
            <div className="flex flex-1 min-h-0">
                <DrawingToolbar
                    activeTool={activeTool}
                    onSelect={handleToolSelect}
                    onClearAll={handleClearAll}
                />
                <div className="relative flex-1 min-w-0">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-950/80">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <RefreshCw size={16} className="animate-spin" />
                                Loading chart…
                            </div>
                        </div>
                    )}
                    <div ref={containerRef} className="w-full h-full" />

                    {/* Active tool badge */}
                    {activeTool !== 'cursor' && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-indigo-600/90 text-white text-[11px] font-medium px-2 py-1 rounded-lg backdrop-blur-sm">
                            <span>
                                {DRAWING_TOOLS.find(t => t.id === activeTool)?.label}
                            </span>
                            <button
                                onClick={() => setActiveTool('cursor')}
                                className="ml-0.5 opacity-70 hover:opacity-100 text-[10px]"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── DepthChart ────────────────────────────────────────────────────────────────
interface DepthChartProps { symbol: string }

function DepthChart({ symbol }: DepthChartProps) {
    const rawRef  = useRef<{ bids: [string,string][]; asks: [string,string][] }>({ bids: [], asks: [] })
    const [data, setData] = useState<DepthPoint[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useBinanceStream<DepthMsg>(`${symbol.toLowerCase()}@depth20@100ms`, (d) => {
        rawRef.current = { bids: d.bids, asks: d.asks }
    })

    useEffect(() => {
        timerRef.current = setInterval(() => {
            const { bids, asks } = rawRef.current
            if (!bids.length && !asks.length) return
            setData(buildDepthPoints(bids, asks, 20))
        }, 300)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [])

    const midPrice = data.find(d => d.ask !== undefined && d.bid === undefined)?.price

    return (
        <div className="flex flex-col h-full bg-gray-900 border-t border-gray-800">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Depth Chart</span>
                {midPrice && (
                    <span className="text-[10px] font-mono text-gray-400">
                        Mid <span className="text-white">{fmtPrice(midPrice, symbol)}</span>
                    </span>
                )}
            </div>
            <div className="flex-1 min-h-0 px-1 py-1">
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-gray-600">Connecting…</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="price" type="number" domain={['auto','auto']}
                                tickFormatter={v => fmtPrice(Number(v), symbol)}
                                tick={{ fontSize: 9, fill: '#6b7280' }}
                                tickLine={false} axisLine={false} scale="linear"
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false}
                                axisLine={false} tickFormatter={v => fmt(Number(v))} width={40}
                            />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                                labelStyle={{ color: '#9ca3af' }}
                                labelFormatter={v => `Price: ${fmtPrice(Number(v), symbol)}`}
                                formatter={(value, name) => [fmt(Number(value)), name === 'bid' ? 'Cum. Bid' : 'Cum. Ask']}
                            />
                            <Area type="stepAfter" dataKey="bid" stroke="#10b981" strokeWidth={1.5}
                                fill="url(#bidGrad)" connectNulls={false} dot={false}
                                activeDot={{ r: 3, fill: '#10b981' }} />
                            <Area type="stepBefore" dataKey="ask" stroke="#ef4444" strokeWidth={1.5}
                                fill="url(#askGrad)" connectNulls={false} dot={false}
                                activeDot={{ r: 3, fill: '#ef4444' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}

// ─── OrderBook ─────────────────────────────────────────────────────────────────
function OrderBook({ symbol }: { symbol: string }) {
    const rawRef   = useRef<{ bids: [string,string][]; asks: [string,string][] }>({ bids: [], asks: [] })
    const [bids, setBids] = useState<DepthLevel[]>([])
    const [asks, setAsks] = useState<DepthLevel[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useBinanceStream<DepthMsg>(`${symbol.toLowerCase()}@depth20@100ms`, (data) => {
        rawRef.current = { bids: data.bids, asks: data.asks }
    })

    useEffect(() => {
        timerRef.current = setInterval(() => {
            const { bids: rawBids, asks: rawAsks } = rawRef.current
            if (!rawBids.length && !rawAsks.length) return
            const processLevels = (levels: [string, string][], maxRows = 14): DepthLevel[] => {
                let running = 0
                return levels.slice(0, maxRows).map(([p, q]) => {
                    running += parseFloat(q)
                    return { price: parseFloat(p), qty: parseFloat(q), total: running }
                })
            }
            setBids(processLevels(rawBids))
            setAsks(processLevels([...rawAsks].reverse()).reverse())
        }, 150)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [])

    const maxTotal = Math.max(bids[bids.length - 1]?.total ?? 0, asks[asks.length - 1]?.total ?? 0)
    const midPrice = bids[0] && asks[asks.length - 1]
        ? ((bids[0].price + asks[asks.length - 1].price) / 2) : null

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
                <Layers size={13} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Book</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-gray-600 uppercase tracking-wider">
                <span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col-reverse">
                {asks.map((a, i) => (
                    <OrderRow key={i} level={a} side="ask" maxTotal={maxTotal} symbol={symbol} />
                ))}
            </div>
            {midPrice && (
                <div className="px-3 py-1.5 bg-gray-800/50 border-y border-gray-700/50 text-center">
                    <span className="text-xs font-mono font-bold text-white">{fmtPrice(midPrice, symbol)}</span>
                    <span className="text-[10px] text-gray-500 ml-1.5">Mid</span>
                </div>
            )}
            <div className="flex-1 overflow-hidden flex flex-col">
                {bids.map((b, i) => (
                    <OrderRow key={i} level={b} side="bid" maxTotal={maxTotal} symbol={symbol} />
                ))}
            </div>
        </div>
    )
}

function OrderRow({ level, side, maxTotal, symbol }: { level: DepthLevel; side: 'bid'|'ask'; maxTotal: number; symbol: string }) {
    const pct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0
    return (
        <div className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-gray-800/40 transition-colors text-[11px] font-mono cursor-pointer">
            <div className={cn('absolute inset-y-0 right-0 opacity-20', side === 'bid' ? 'bg-emerald-500' : 'bg-red-500')}
                style={{ width: `${pct}%` }} />
            <span className={cn('relative z-10 font-semibold', side === 'bid' ? 'text-emerald-400' : 'text-red-400')}>
                {fmtPrice(level.price, symbol)}
            </span>
            <span className="relative z-10 text-right text-gray-300">{level.qty.toFixed(4)}</span>
            <span className="relative z-10 text-right text-gray-500">{level.total.toFixed(2)}</span>
        </div>
    )
}

// ─── RecentTrades ──────────────────────────────────────────────────────────────
function RecentTrades({ symbol }: { symbol: string }) {
    const bufferRef = useRef<RecentTrade[]>([])
    const [trades, setTrades] = useState<RecentTrade[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useBinanceStream<TradeMsg>(`${symbol.toLowerCase()}@trade`, (data) => {
        const trade: RecentTrade = {
            id: data.T, price: parseFloat(data.p), qty: parseFloat(data.q),
            isSell: data.m, time: data.T,
        }
        bufferRef.current = [trade, ...bufferRef.current].slice(0, 60)
    })

    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (bufferRef.current.length > 0) setTrades([...bufferRef.current].slice(0, 40))
        }, 300)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [])

    return (
        <div className="flex flex-col bg-gray-900 border-t border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
                <Activity size={13} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Trades</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-gray-600 uppercase tracking-wider">
                <span>Price</span><span className="text-right">Amount</span><span className="text-right">Time</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                {trades.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-xs text-gray-600">Waiting for trades…</div>
                ) : (
                    trades.map(t => <TradeRow key={t.id} trade={t} symbol={symbol} />)
                )}
            </div>
        </div>
    )
}

function TradeRow({ trade, symbol }: { trade: RecentTrade; symbol: string }) {
    const time = new Date(trade.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return (
        <div className={cn('grid grid-cols-3 px-3 py-[3px] text-[11px] font-mono hover:bg-gray-800/30 transition-colors')}>
            <span className={trade.isSell ? 'text-red-400' : 'text-emerald-400'}>{fmtPrice(trade.price, symbol)}</span>
            <span className="text-right text-gray-400">{trade.qty.toFixed(4)}</span>
            <span className="text-right text-gray-600">{time}</span>
        </div>
    )
}

// ─── TradingPanel ──────────────────────────────────────────────────────────────
interface TradingPanelProps {
    pair:      typeof PAIRS[0]
    livePrice: number | null
}

function TradingPanel({ pair, livePrice }: TradingPanelProps) {
    const [panelTab,   setPanelTab]   = useState<'order' | 'history'>('order')
    const [side,       setSide]       = useState<'buy' | 'sell'>('buy')
    const [orderType,  setOrderType]  = useState<'market' | 'limit'>('market')
    const [amount,     setAmount]     = useState('')
    const [limitPrice, setLimitPrice] = useState('')
    const [walletId,   setWalletId]   = useState('')
    const [submitting, setSubmitting] = useState(false)

    const { data: wallets }      = useWallets()
    const { data: walletDetail } = useWalletDetail(walletId)
    const createTx = useCreateTransaction()
    const toast    = useToast()

    useEffect(() => {
        if (wallets?.length && !walletId) setWalletId(wallets[0].id)
    }, [wallets, walletId])

    const execPrice = orderType === 'market' ? (livePrice ?? 0) : parseFloat(limitPrice || '0')
    const qty       = parseFloat(amount || '0')
    const total     = execPrice * qty

    const availableFiat = walletDetail?.fiatBalance ?? 0
    const coinHolding   = walletDetail?.holdings.find(h => h.coinId === pair.geckoId)
    const availableCoin = coinHolding?.quantity ?? 0

    const insufficientBuy  = side === 'buy'  && qty > 0 && execPrice > 0 && total > availableFiat
    const insufficientSell = side === 'sell' && qty > 0 && qty > availableCoin

    async function handleSubmit() {
        if (!qty || qty <= 0)       { toast.error('Nhập số lượng hợp lệ'); return }
        if (!walletId)              { toast.error('Chọn ví để giao dịch'); return }
        if (orderType === 'limit' && (!execPrice || execPrice <= 0)) { toast.error('Nhập limit price hợp lệ'); return }
        if (!livePrice && orderType === 'market') { toast.error('Chưa có giá live'); return }

        if (side === 'buy') {
            if (availableFiat <= 0) { toast.error('Số dư ví không đủ', 'Ví không có USDT. Hãy nạp tiền trước.'); return }
            if (total > availableFiat) {
                toast.error('Số dư không đủ để mua', `Cần ${formatUSD(total)} — Có ${formatUSD(availableFiat)}`); return
            }
        } else {
            if (availableCoin <= 0) {
                toast.error(`Không có ${pair.base} để bán`, `Ví không có ${pair.base}. Hãy mua trước.`); return
            }
            if (qty > availableCoin) {
                toast.error('Số lượng vượt quá số dư', `Muốn bán ${qty} ${pair.base} — Có ${availableCoin.toFixed(6)} ${pair.base}`); return
            }
        }

        setSubmitting(true)
        try {
            await createTx.mutateAsync({
                walletId,
                coinId:          pair.geckoId,
                type:            side === 'buy' ? 1 : 2,
                quantity:        qty,
                pricePerCoin:    execPrice,
                notes:           `${orderType === 'market' ? 'Market' : 'Limit'} order via Trading Terminal`,
                transactionDate: new Date().toISOString(),
            })
            toast.success(
                `${side === 'buy' ? '🟢 Mua' : '🔴 Bán'} ${qty} ${pair.base} @ ${formatUSD(execPrice)}`,
                `Tổng: ${formatUSD(total)}`,
            )
            setAmount('')
            setLimitPrice('')
        } catch (e: unknown) {
            toast.error('Lỗi giao dịch', (e as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    function fillPercent(pct: number) {
        if (side === 'buy') {
            if (execPrice > 0 && availableFiat > 0)
                setAmount(((availableFiat * pct / 100) / execPrice).toFixed(6))
        } else {
            if (availableCoin > 0) setAmount((availableCoin * pct / 100).toFixed(6))
        }
    }

    const { data: walletTxs } = useWalletTransactions(walletId)
    const recentOrders = (walletTxs ?? [])
        .filter(tx => tx.coinSymbol.toUpperCase() === pair.base.toUpperCase())
        .slice(0, 20)

    const canSubmit = !submitting && qty > 0 && !insufficientBuy && !insufficientSell

    return (
        <div className="flex flex-col bg-gray-900 border-l border-gray-800 h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                {(['order', 'Orders'] as const).map((_, i) => {
                    const key   = i === 0 ? 'order' : 'history' as const
                    const label = i === 0 ? 'Place Order' : 'Orders'
                    return (
                        <button
                            key={key}
                            onClick={() => setPanelTab(key)}
                            className={cn(
                                'flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition',
                                panelTab === key
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-300',
                            )}
                        >
                            {label}
                            {key === 'history' && recentOrders.length > 0 && (
                                <span className="ml-1 bg-gray-700 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">
                                    {recentOrders.length}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Order History */}
            {panelTab === 'history' && (
                <div className="flex-1 overflow-y-auto">
                    {!walletId ? (
                        <p className="text-center text-xs text-gray-600 py-10">Chọn ví để xem lịch sử</p>
                    ) : recentOrders.length === 0 ? (
                        <p className="text-center text-xs text-gray-600 py-10">Chưa có lệnh {pair.base}</p>
                    ) : (
                        <div className="divide-y divide-gray-800/60">
                            <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider">
                                <span>Side / Price</span><span className="text-right">Qty</span><span className="text-right">Total</span>
                            </div>
                            {recentOrders.map(tx => {
                                const isBuy = tx.type === 1
                                return (
                                    <div key={tx.id} className="grid grid-cols-3 px-3 py-2 text-[11px] font-mono hover:bg-gray-800/30 transition-colors">
                                        <div>
                                            <span className={cn('font-semibold', isBuy ? 'text-emerald-400' : 'text-red-400')}>
                                                {isBuy ? 'BUY' : 'SELL'}
                                            </span>
                                            <p className="text-gray-500 text-[10px]">{formatUSD(tx.pricePerCoin)}</p>
                                        </div>
                                        <span className="text-right text-gray-300 self-center">{tx.quantity.toFixed(4)}</span>
                                        <span className="text-right text-gray-400 self-center">{formatUSD(tx.totalAmount)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Place Order */}
            {panelTab === 'order' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Buy / Sell */}
                    <div className="grid grid-cols-2 gap-1 bg-gray-800 p-1 rounded-xl">
                        {(['buy', 'sell'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => { setSide(s); setAmount('') }}
                                className={cn(
                                    'py-2 text-sm font-bold rounded-lg transition',
                                    side === s
                                        ? s === 'buy' ? 'bg-emerald-600 text-white shadow' : 'bg-red-600 text-white shadow'
                                        : 'text-gray-400 hover:text-gray-200',
                                )}
                            >
                                {s === 'buy' ? 'Long / Buy' : 'Short / Sell'}
                            </button>
                        ))}
                    </div>

                    {/* Order type */}
                    <div className="grid grid-cols-2 gap-1">
                        {(['market', 'limit'] as const).map(t => (
                            <button key={t} onClick={() => setOrderType(t)}
                                className={cn(
                                    'py-1.5 text-xs font-medium rounded-lg border transition capitalize',
                                    orderType === t
                                        ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                                        : 'border-gray-700 text-gray-500 hover:border-gray-600',
                                )}
                            >{t}</button>
                        ))}
                    </div>

                    {/* Wallet selector */}
                    {wallets && wallets.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Ví giao dịch</label>
                            <select
                                value={walletId}
                                onChange={e => setWalletId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                            >
                                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Available balance */}
                    <div className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-2 text-xs',
                        side === 'buy' ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20',
                    )}>
                        <span className="text-gray-500">{side === 'buy' ? 'Số dư khả dụng' : `${pair.base} đang có`}</span>
                        <span className={cn('font-mono font-semibold', side === 'buy' ? 'text-emerald-400' : 'text-red-400')}>
                            {side === 'buy' ? formatUSD(availableFiat) : `${availableCoin > 0 ? availableCoin.toFixed(6) : '0'} ${pair.base}`}
                        </span>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Giá {orderType === 'market' ? '(Market)' : '(Limit)'}</label>
                        {orderType === 'market' ? (
                            <div className="px-3 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-sm font-mono text-gray-400">
                                {livePrice ? fmtPrice(livePrice, pair.symbol) : '—'} USDT
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
                                    placeholder={livePrice ? fmtPrice(livePrice, pair.symbol) : '0.00'}
                                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-indigo-500 focus:outline-none rounded-xl text-sm font-mono text-white placeholder-gray-600 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDT</span>
                            </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Số lượng ({pair.base})</label>
                        <div className="relative">
                            <input
                                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="0.00000"
                                className={cn(
                                    'w-full px-3 py-2.5 bg-gray-800 border rounded-xl text-sm font-mono text-white placeholder-gray-600 transition focus:outline-none',
                                    (insufficientBuy || insufficientSell)
                                        ? 'border-red-500/60 focus:border-red-500'
                                        : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500',
                                )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{pair.base}</span>
                        </div>
                        {insufficientBuy  && <p className="text-[11px] text-red-400">Không đủ USDT — cần thêm {formatUSD(total - availableFiat)}</p>}
                        {insufficientSell && <p className="text-[11px] text-red-400">Vượt số dư — chỉ có {availableCoin.toFixed(6)} {pair.base}</p>}
                        <div className="grid grid-cols-4 gap-1 mt-1">
                            {[25, 50, 75, 100].map(p => (
                                <button key={p} onClick={() => fillPercent(p)}
                                    className="py-1 text-[10px] text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-800/50 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Tổng giá trị</span>
                            <span className="text-white font-mono">{total > 0 ? formatUSD(total) : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Fee (0.1%)</span>
                            <span className="text-gray-400 font-mono">{total > 0 ? formatUSD(total * 0.001) : '—'}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-1.5 mt-1.5">
                            <span className="text-gray-400">Nhận về</span>
                            <span className="font-mono font-semibold text-white">
                                {side === 'buy'
                                    ? (qty > 0 ? `${qty.toFixed(6)} ${pair.base}` : '—')
                                    : (total > 0 ? formatUSD(total * 0.999) : '—')}
                            </span>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit} disabled={!canSubmit}
                        className={cn(
                            'w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2',
                            side === 'buy'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900/40 disabled:text-emerald-700 disabled:cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white disabled:bg-red-900/40 disabled:text-red-700 disabled:cursor-not-allowed',
                        )}
                    >
                        {submitting && <RefreshCw size={14} className="animate-spin" />}
                        {side === 'buy' ? 'Mua' : 'Bán'} {pair.base}
                    </button>

                    <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                        Paper trading — giao dịch giả lập, không dùng tiền thật.
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── FuturesPage (Main) ────────────────────────────────────────────────────────
export function FuturesPage() {
    const [pair,      setPair]      = useState(PAIRS[0])
    const [interval,  setInterval]  = useState('15m')
    const [bottomTab, setBottomTab] = useState<'trades' | 'depth'>('trades')
    const [mobileTab, setMobileTab] = useState<'chart' | 'book' | 'trade'>('chart')

    const [tick,  setTick]  = useState<Tick24h | null>(null)
    const [flash, setFlash] = useState<'up' | 'down' | null>(null)
    const prevPriceRef  = useRef<number | null>(null)
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [liveKline, setLiveKline] = useState<KlineMsg['k'] | null>(null)

    // miniTicker — 24h stats + price flash
    useBinanceStream<MiniTicker>(
        `${pair.symbol.toLowerCase()}@miniTicker`,
        useCallback((data) => {
            const price = parseFloat(data.c)
            const open  = parseFloat(data.o)
            const chg   = ((price - open) / open) * 100
            setTick({ price, open, high: parseFloat(data.h), low: parseFloat(data.l),
                      volume: parseFloat(data.v), quoteVolume: parseFloat(data.q), change: chg })
            if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
                setFlash(price > prevPriceRef.current ? 'up' : 'down')
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
                flashTimerRef.current = setTimeout(() => setFlash(null), 600)
            }
            prevPriceRef.current = price
        }, []),
    )

    // kline stream — live last-candle update
    useBinanceStream<KlineMsg>(
        `${pair.symbol.toLowerCase()}@kline_${interval}`,
        useCallback((data) => { setLiveKline(data.k) }, [interval]),
    )

    // Reset on pair / interval change
    useEffect(() => {
        setTick(null); setFlash(null); setLiveKline(null)
        prevPriceRef.current = null
    }, [pair.symbol, interval])

    return (
        <div className="flex flex-col flex-1 bg-gray-950 overflow-hidden">
            <SymbolHeader
                pair={pair} tick={tick} flash={flash}
                onSelectPair={p => { setPair(p); setTick(null); setLiveKline(null) }}
            />

            <div className="flex flex-1 min-h-0">
                {/* ── Chart + bottom tab ── */}
                <div className={cn('flex flex-col flex-1 min-w-0', mobileTab !== 'chart' ? 'hidden md:flex' : 'flex')}>
                    <div className="flex-1 min-h-0">
                        <FuturesChart
                            pair={pair}
                            interval={interval}
                            onIntervalChange={setInterval}
                            liveKline={liveKline}
                        />
                    </div>

                    {/* Trades | Depth tab */}
                    <div className="flex flex-col shrink-0" style={{ height: '260px' }}>
                        <div className="flex border-t border-gray-800 bg-gray-900">
                            {([
                                { key: 'trades' as const, label: 'Trades'      },
                                { key: 'depth'  as const, label: 'Depth Chart' },
                            ]).map(t => (
                                <button key={t.key} onClick={() => setBottomTab(t.key)}
                                    className={cn(
                                        'px-4 py-2 text-xs font-medium border-b-2 transition',
                                        bottomTab === t.key
                                            ? 'border-indigo-500 text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-300',
                                    )}
                                >{t.label}</button>
                            ))}
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {bottomTab === 'trades'
                                ? <RecentTrades symbol={pair.symbol} />
                                : <DepthChart   symbol={pair.symbol} />
                            }
                        </div>
                    </div>
                </div>

                {/* ── Order Book ── */}
                <div className={cn('md:w-52 shrink-0 min-h-0 overflow-hidden', mobileTab !== 'book' ? 'hidden md:block' : 'flex flex-1')}>
                    <OrderBook symbol={pair.symbol} />
                </div>

                {/* ── Trading Panel ── */}
                <div className={cn('md:w-64 shrink-0 min-h-0 overflow-hidden', mobileTab !== 'trade' ? 'hidden md:block' : 'flex flex-1')}>
                    <TradingPanel pair={pair} livePrice={tick?.price ?? null} />
                </div>
            </div>

            {/* Mobile tab bar */}
            <div className="md:hidden flex border-t border-gray-800 bg-gray-900 shrink-0">
                {([
                    { key: 'chart' as const, label: '📈 Chart' },
                    { key: 'book'  as const, label: '📖 Book'  },
                    { key: 'trade' as const, label: '💱 Trade' },
                ]).map(t => (
                    <button key={t.key} onClick={() => setMobileTab(t.key)}
                        className={cn(
                            'flex-1 py-3 text-xs font-medium transition',
                            mobileTab === t.key ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-300',
                        )}
                    >{t.label}</button>
                ))}
            </div>
        </div>
    )
}
