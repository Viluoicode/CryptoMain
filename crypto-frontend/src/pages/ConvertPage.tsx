// src/pages/ConvertPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, ChevronDown, TrendingUp, TrendingDown, Info, Zap } from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { formatUSD, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CryptoListResponse } from '@/types'

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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition"
            >
                {value ? (
                    <>
                        <img src={value.image} alt={value.name} className="w-6 h-6 rounded-full shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{value.symbol.toUpperCase()}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">{value.name}</span>
                    </>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">Chọn coin...</span>
                )}
                <ChevronDown size={14} className="ml-auto text-gray-400" />
            </button>

            {open && (
                <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Tìm coin..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-brand-500 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        {filtered.slice(0, 30).map((c) => (
                            <li key={c.id}>
                                <button
                                    onClick={() => select(c)}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                                >
                                    <img src={c.image} alt={c.name} className="w-6 h-6 rounded-full shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.symbol.toUpperCase()}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.name}</p>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{formatUSD(c.currentPrice)}</span>
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 && (
                            <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
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
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{value}</span>
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
        <div className="max-w-5xl space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chuyển đổi</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Mô phỏng chuyển đổi giữa các coin theo giá thị trường thực tế</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 items-start">
                {/* ── Convert Card ── */}
                <div className="w-full lg:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5">
                    {/* From */}
                    <div className="space-y-2">
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
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-semibold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition"
                            />
                            {fromCoin && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                                    {fromCoin.symbol.toUpperCase()}
                                </span>
                            )}
                        </div>
                        {usdValue !== null && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">≈ {formatUSD(usdValue)}</p>
                        )}
                    </div>

                    {/* Swap button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleSwap}
                            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full transition text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                        >
                            <ArrowDownUp size={18} />
                        </button>
                    </div>

                    {/* To */}
                    <div className="space-y-2">
                        <CoinSelector
                            label="Đến"
                            value={toCoin}
                            coins={coins.filter((c) => c.id !== fromCoin?.id)}
                            onChange={setToCoin}
                        />
                        <div className="relative px-3 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <span className={cn(
                                'text-lg font-semibold',
                                toAmt ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600',
                            )}>
                                {toAmt || '0.00'}
                            </span>
                            {toCoin && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                                    {toCoin.symbol.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Rate info */}
                    {rate !== null && fromCoin && toCoin && (
                        <div className="space-y-2.5 p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm">
                            <RateRow label="Tỷ giá" value={`1 ${fromCoin.symbol.toUpperCase()} = ${rate.toFixed(6)} ${toCoin.symbol.toUpperCase()}`} />
                            <RateRow label="Giá {fromCoin.symbol.toUpperCase()}" value={formatUSD(fromCoin.currentPrice)} />
                            <RateRow label="Giá {toCoin.symbol.toUpperCase()}" value={formatUSD(toCoin.currentPrice)} />
                            <div className="flex gap-3 pt-1">
                                <span className={cn(
                                    'flex items-center gap-1 text-xs font-medium',
                                    fromCoin.priceChangePercentage24h >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-500 dark:text-red-400',
                                )}>
                                    {fromCoin.priceChangePercentage24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {fromCoin.symbol.toUpperCase()} {formatPct(fromCoin.priceChangePercentage24h)}
                                </span>
                                <span className={cn(
                                    'flex items-center gap-1 text-xs font-medium',
                                    toCoin.priceChangePercentage24h >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-500 dark:text-red-400',
                                )}>
                                    {toCoin.priceChangePercentage24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {toCoin.symbol.toUpperCase()} {formatPct(toCoin.priceChangePercentage24h)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3">
                        <Info size={13} className="mt-0.5 shrink-0 text-blue-400" />
                        Đây là mô phỏng — không có giao dịch thực tế. Giá được lấy từ CoinGecko API.
                    </div>

                    {/* Button */}
                    <button
                        onClick={handleConvert}
                        disabled={!canConvert || loading || isLoading}
                        className={cn(
                            'w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2',
                            success
                                ? 'bg-emerald-500 text-white'
                                : canConvert
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed',
                        )}
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
                        ) : success ? (
                            <>✓ Chuyển đổi thành công!</>
                        ) : (
                            <><Zap size={15} /> Chuyển đổi ngay</>
                        )}
                    </button>
                </div>

                {/* ── Right panel ── */}
                <div className="flex-1 space-y-4 w-full">
                    {/* Quick picks */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Cặp phổ biến</h3>
                        {isLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
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
                                            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition group text-left"
                                        >
                                            <div className="flex -space-x-2 shrink-0">
                                                <img src={f.image} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900" alt={f.name} />
                                                <img src={t.image} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900" alt={t.name} />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {f.symbol.toUpperCase()} / {t.symbol.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                                {r < 0.001 ? r.toFixed(8) : r.toFixed(4)}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* History */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Lịch sử chuyển đổi</h3>
                        {history.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                Chưa có giao dịch nào
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm"
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {rec.fromAmt.toLocaleString()} {rec.from}
                                            </span>
                                            <span className="text-gray-400 dark:text-gray-500 mx-2">→</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {Number(rec.toAmt).toLocaleString(undefined, { maximumFractionDigits: 6 })} {rec.to}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{rec.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
