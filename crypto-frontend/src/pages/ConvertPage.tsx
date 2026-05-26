// src/pages/ConvertPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, ChevronDown, TrendingUp, TrendingDown, Info, Zap } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CryptoListResponse } from '@/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── CoinSelector ──────────────────────────────────────────────────────────────
function CoinSelector({
    value,
    coins,
    onChange,
    label,
}: {
    value: CryptoListResponse | null
    coins: CryptoListResponse[]
    onChange: (c: CryptoListResponse) => void
    label: string
}) {
    const [open,   setOpen]   = useState(false)
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return q
            ? coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
            : coins
    }, [coins, search])

    function select(c: CryptoListResponse) {
        onChange(c)
        setOpen(false)
        setSearch('')
    }

    return (
        <div className="relative">
            <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</p>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-navy-950/60 border border-white/[0.08] hover:border-white/[0.12] rounded-xl transition duration-150"
            >
                {value ? (
                    <>
                        <img src={value.image} alt={value.name} className="w-5 h-5 rounded-full shrink-0" />
                        <span className="font-bold text-white text-sm uppercase">{value.symbol}</span>
                        <span className="text-gray-500 font-semibold text-xs">{value.name}</span>
                    </>
                ) : (
                    <span className="text-gray-500 text-sm font-semibold">Chọn coin...</span>
                )}
                <ChevronDown size={14} className="ml-auto text-gray-400" />
            </button>

            {open && (
                <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-navy-900 border border-white/[0.08] rounded-xl shadow-glass overflow-hidden animate-scale-in">
                    <div className="p-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Tìm coin..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-navy-950 border border-white/[0.08] rounded-lg outline-none focus:border-accent-cyan/40 text-white placeholder-gray-500 font-semibold"
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto divide-y divide-white/[0.04]">
                        {filtered.slice(0, 30).map((c) => (
                            <li key={c.id}>
                                <button
                                    onClick={() => select(c)}
                                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/[0.03] transition text-left"
                                >
                                    <img src={c.image} alt={c.name} className="w-5 h-5 rounded-full shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white uppercase leading-none">{c.symbol}</p>
                                        <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5 truncate leading-none">{c.name}</p>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-gray-400 shrink-0">{formatUSD(c.currentPrice)}</span>
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 && (
                            <li className="px-4 py-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Không tìm thấy coin
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}

// ─── Rate info row ─────────────────────────────────────────────────────────────
function RateRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span className="text-gray-500">{label}</span>
            <span className="font-mono text-white text-xs">{value}</span>
        </div>
    )
}

// ─── Recent simulated conversions ─────────────────────────────────────────────
interface ConvRecord {
    id: number
    from: string
    to: string
    fromAmt: number
    toAmt: number
    rate: number
    time: string
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function ConvertPage() {
    const { data: coins = [], isLoading } = useQuery({
        queryKey: ['crypto', 'top', 100],
        queryFn:  () => getTopCryptos(100),
        staleTime: 1000 * 60 * 2,
    })

    const [fromCoin, setFromCoin]   = useState<CryptoListResponse | null>(null)
    const [toCoin,   setToCoin]     = useState<CryptoListResponse | null>(null)
    const [fromAmt,  setFromAmt]    = useState('')
    const [history,  setHistory]    = useState<ConvRecord[]>([])
    const [success,  setSuccess]    = useState(false)
    const [loading,  setLoading]    = useState(false)

    // Rate & toAmount
    const rate = fromCoin && toCoin
        ? fromCoin.currentPrice / toCoin.currentPrice
        : null

    const toAmt = rate !== null && parseFloat(fromAmt) > 0
        ? (parseFloat(fromAmt) * rate).toFixed(6)
        : ''

    const usdValue = fromCoin && parseFloat(fromAmt) > 0
        ? parseFloat(fromAmt) * fromCoin.currentPrice
        : null

    function handleSwap() {
        const tmp = fromCoin
        setFromCoin(toCoin)
        setToCoin(tmp)
        setFromAmt(toAmt || '')
    }

    async function handleConvert() {
        if (!fromCoin || !toCoin || !parseFloat(fromAmt) || !rate) return
        setLoading(true)
        await new Promise((r) => setTimeout(r, 900))
        setLoading(false)
        setSuccess(true)
        setHistory((prev) => [
            {
                id:      Date.now(),
                from:    fromCoin.symbol.toUpperCase(),
                to:      toCoin.symbol.toUpperCase(),
                fromAmt: parseFloat(fromAmt),
                toAmt:   parseFloat(toAmt),
                rate,
                time:    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.slice(0, 9),
        ])
        setFromAmt('')
        setTimeout(() => setSuccess(false), 2500)
    }

    const canConvert = !!fromCoin && !!toCoin && parseFloat(fromAmt) > 0 && fromCoin.id !== toCoin.id

    return (
        <div className="max-w-5xl space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Chuyển đổi</h1>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">Mô phỏng chuyển đổi giữa các coin theo giá thị trường thực tế</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* ── Convert Card ── */}
                <Card className="w-full lg:max-w-md p-5 space-y-5">
                    {/* From */}
                    <div className="space-y-2.5">
                        <CoinSelector
                            label="Từ"
                            value={fromCoin}
                            coins={coins.filter((c) => c.id !== toCoin?.id)}
                            onChange={setFromCoin}
                        />
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                placeholder="0.00"
                                value={fromAmt}
                                onChange={(e) => setFromAmt(e.target.value)}
                                className="w-full px-4 py-3 bg-navy-950/60 border border-white/[0.08] rounded-xl text-lg font-mono font-bold text-white placeholder-gray-600 outline-none focus:border-accent-cyan/40 transition hover:border-white/[0.12] duration-200"
                            />
                            {fromCoin && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 uppercase">
                                    {fromCoin.symbol}
                                </span>
                            )}
                        </div>
                        {usdValue !== null && (
                            <p className="text-[10px] text-gray-500 pl-1 font-bold font-mono">≈ {formatUSD(usdValue)}</p>
                        )}
                    </div>

                    {/* Swap button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleSwap}
                            className="p-2.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:text-accent-cyan rounded-full transition text-gray-400 active:scale-95"
                        >
                            <ArrowDownUp size={16} />
                        </button>
                    </div>

                    {/* To */}
                    <div className="space-y-2.5">
                        <CoinSelector
                            label="Đến"
                            value={toCoin}
                            coins={coins.filter((c) => c.id !== fromCoin?.id)}
                            onChange={setToCoin}
                        />
                        <div className="relative px-4 py-3.5 bg-navy-950/40 border border-white/[0.04] rounded-xl min-h-[50px] flex items-center justify-between">
                            <span className={cn(
                                'text-lg font-mono font-bold',
                                toAmt ? 'text-white' : 'text-gray-600',
                            )}>
                                {toAmt || '0.00'}
                            </span>
                            {toCoin && (
                                <span className="text-sm font-bold text-gray-400 uppercase">
                                    {toCoin.symbol}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Rate info */}
                    {rate !== null && fromCoin && toCoin && (
                        <div className="space-y-2.5 p-3.5 bg-navy-950/60 border border-white/[0.04] rounded-xl text-sm">
                            <RateRow label="Tỷ giá" value={`1 ${fromCoin.symbol.toUpperCase()} = ${rate.toFixed(6)} ${toCoin.symbol.toUpperCase()}`} />
                            <RateRow label={`Giá ${fromCoin.symbol.toUpperCase()}`} value={formatUSD(fromCoin.currentPrice)} />
                            <RateRow label={`Giá ${toCoin.symbol.toUpperCase()}`} value={formatUSD(toCoin.currentPrice)} />
                            <div className="flex gap-3 pt-1">
                                <span className={cn(
                                    'flex items-center gap-1 text-[10px] font-bold font-mono',
                                    fromCoin.priceChangePercentage24h >= 0
                                        ? 'text-emerald-400'
                                        : 'text-red-400',
                                )}>
                                    {fromCoin.priceChangePercentage24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {fromCoin.symbol.toUpperCase()} {formatPct(fromCoin.priceChangePercentage24h)}
                                </span>
                                <span className={cn(
                                    'flex items-center gap-1 text-[10px] font-bold font-mono',
                                    toCoin.priceChangePercentage24h >= 0
                                        ? 'text-emerald-400'
                                        : 'text-red-400',
                                )}>
                                    {toCoin.priceChangePercentage24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {toCoin.symbol.toUpperCase()} {formatPct(toCoin.priceChangePercentage24h)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex items-start gap-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-accent-cyan/5 border border-accent-cyan/10 rounded-xl p-3.5 leading-normal">
                        <Info size={14} className="mt-0.5 shrink-0 text-accent-cyan" />
                        Đây là mô phỏng — không có giao dịch thực tế. Giá lấy từ CoinGecko API.
                    </div>

                    {/* Button */}
                    <button
                        onClick={handleConvert}
                        disabled={!canConvert || loading || isLoading}
                        className={cn(
                            'w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 uppercase tracking-wider shadow-glow',
                            success
                                ? 'bg-emerald-500 text-white'
                                : canConvert
                                    ? 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:brightness-110'
                                    : 'bg-white/[0.02] border border-white/[0.04] text-gray-500 cursor-not-allowed',
                        )}
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
                        ) : success ? (
                            <>✓ Chuyển đổi thành công!</>
                        ) : (
                            <><Zap size={14} /> Chuyển đổi ngay</>
                        )}
                    </button>
                </Card>

                {/* ── Right panel ── */}
                <div className="flex-1 space-y-4 w-full">
                    {/* Quick picks */}
                    <Card className="p-5">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Cặp phổ biến</h3>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {[
                                    ['bitcoin', 'ethereum'],
                                    ['ethereum', 'tether'],
                                    ['bitcoin', 'tether'],
                                    ['solana', 'ethereum'],
                                    ['binancecoin', 'bitcoin'],
                                ].map(([fId, tId]) => {
                                    const f = coins.find((c) => c.id === fId)
                                    const t = coins.find((c) => c.id === tId)
                                    if (!f || !t) return null
                                    const r = f.currentPrice / t.currentPrice
                                    return (
                                        <button
                                            key={`${fId}-${tId}`}
                                            onClick={() => { setFromCoin(f); setToCoin(t) }}
                                            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/[0.02] rounded-xl transition duration-150 text-left"
                                        >
                                            <div className="flex -space-x-2 shrink-0">
                                                <img src={f.image} className="w-5 h-5 rounded-full border border-navy-900" alt={f.name} />
                                                <img src={t.image} className="w-5 h-5 rounded-full border border-navy-900" alt={t.name} />
                                            </div>
                                            <span className="text-xs font-bold text-white uppercase tracking-tight">
                                                {f.symbol} / {t.symbol}
                                            </span>
                                            <span className="text-xs font-mono font-semibold text-gray-500 ml-auto">
                                                {r < 0.001 ? r.toFixed(8) : r.toFixed(4)}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </Card>

                    {/* History */}
                    <Card className="p-5">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Lịch sử chuyển đổi</h3>
                        {history.length === 0 ? (
                            <div className="py-8 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Chưa có giao dịch nào
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="flex items-center justify-between p-3 bg-navy-950/60 border border-white/[0.04] rounded-xl text-xs font-medium"
                                    >
                                        <div>
                                            <span className="font-bold text-white font-mono">
                                                {rec.fromAmt.toLocaleString()} {rec.from}
                                            </span>
                                            <span className="text-gray-500 mx-2">→</span>
                                            <span className="font-bold text-emerald-400 font-mono">
                                                {Number(rec.toAmt).toLocaleString(undefined, { maximumFractionDigits: 6 })} {rec.to}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">{rec.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}
