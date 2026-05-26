// src/components/layout/BottomStatusBar.tsx
// ─── Toobit-style persistent footer status bar ────────────────────────────────
// Lives at the very bottom of AppLayout. Three regions:
//   ◾ left:   connection indicator (driven by livePriceStore.connected)
//   ◾ middle: scrolling ticker (live prices from top-10 pairs)
//   ◾ right:  utility links (Markets / Leaderboard / Docs / Feedback / GitHub)
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Wifi, WifiOff, Megaphone, Calendar,
    MessageCircle, ThumbsUp, Github,
} from 'lucide-react'
import { getTopCryptos } from '@/api/crypto'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useBinanceWs } from '@/hooks/useBinanceWs'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

// Top pairs to show in the ticker. Keep this small (10) so the scroll stays
// readable — duplicate the list once for a seamless infinite loop.
const TICKER_SYMBOLS = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'doge', 'avax', 'dot', 'link']

// ─── Compact pair pill — symbol + live price + 24h % ──────────────────────────
function TickerPill({ symbol }: { symbol: string }) {
    const tick = useLivePriceStore(s => s.ticks[symbol])
    if (!tick) {
        // Skeleton — keeps width stable before WS connects
        return (
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] font-mono opacity-50">
                <span className="font-bold uppercase text-gray-400">{symbol}USDT</span>
                <span className="text-gray-600">—</span>
            </span>
        )
    }
    const pos = tick.change24h >= 0
    const price = tick.price
    const priceStr = price >= 1
        ? price.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : price.toFixed(6)

    return (
        <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
            <span className="font-bold uppercase text-gray-300">{symbol}USDT</span>
            <span className="text-gray-400">{priceStr}</span>
            <span className={cn('font-semibold', pos ? 'text-profit' : 'text-loss')}>
                {formatPct(tick.change24h, 2)}
            </span>
        </span>
    )
}

// ─── Connection indicator ─────────────────────────────────────────────────────
function ConnectionDot() {
    const connected = useLivePriceStore(s => s.connected)
    return (
        <div className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0',
            connected ? 'text-profit' : 'text-gray-500',
        )}>
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span className="hidden sm:inline">{connected ? 'Stable connection' : 'Offline'}</span>
        </div>
    )
}

// ─── Utility link (right side) ────────────────────────────────────────────────
function UtilityLink({
    icon, label, to, href, badge,
}: {
    icon: React.ReactNode
    label: string
    to?: string
    href?: string
    badge?: boolean
}) {
    const className = 'group relative inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition'
    const content = (
        <>
            <span className="text-gray-500 group-hover:text-accent-cyan transition">{icon}</span>
            <span className="hidden md:inline">{label}</span>
            {badge && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-loss animate-pulse" />
            )}
        </>
    )

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
            </a>
        )
    }
    return <Link to={to ?? '#'} className={className}>{content}</Link>
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BottomStatusBar() {
    // Need the symbol list from CoinGecko to subscribe — falls back to hardcoded.
    // We pre-warm by querying the top-10 cache (same key MarketPage uses).
    const { data: coins } = useQuery({
        queryKey: ['crypto', 'top', 10],
        queryFn: () => getTopCryptos(10),
        staleTime: 1000 * 60 * 5,
    })

    // Subscribe to live ticks for the 10 ticker pairs.
    useBinanceWs(TICKER_SYMBOLS)

    // Duplicate the list so the CSS `animate-ticker` loops seamlessly.
    const items = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS]
    void coins   // intentionally referenced — query is just a pre-warm

    return (
        <div className="flex items-center h-8 px-3 bg-navy-950/95 backdrop-blur border-t border-white/[0.06] text-gray-400 shrink-0 z-30">
            {/* ── Left: connection ── */}
            <div className="flex items-center gap-3 shrink-0 pr-4 border-r border-white/[0.04]">
                <ConnectionDot />
            </div>

            {/* ── Middle: scrolling ticker ── */}
            <div className="flex-1 min-w-0 overflow-hidden px-4">
                <div className="flex items-center gap-6 animate-ticker w-max">
                    {items.map((sym, i) => (
                        <TickerPill key={`${sym}-${i}`} symbol={sym} />
                    ))}
                </div>
            </div>

            {/* ── Right: utility links ── */}
            <div className="flex items-center gap-0.5 shrink-0 pl-4 border-l border-white/[0.04]">
                <UtilityLink
                    icon={<Megaphone size={11} />}
                    label="Announcements"
                    to="/market"
                    badge
                />
                <UtilityLink
                    icon={<Calendar size={11} />}
                    label="Leaderboard"
                    to="/leaderboard"
                />
                <UtilityLink
                    icon={<MessageCircle size={11} />}
                    label="Chat"
                    href="https://github.com/Viluoicode/CryptoMain/discussions"
                />
                <UtilityLink
                    icon={<ThumbsUp size={11} />}
                    label="Feedback"
                    href="mailto:vilun1705@gmail.com?subject=CryptoDash%20Feedback"
                />
                <UtilityLink
                    icon={<Github size={11} />}
                    label="GitHub"
                    href="https://github.com/Viluoicode/CryptoMain"
                />
            </div>
        </div>
    )
}
