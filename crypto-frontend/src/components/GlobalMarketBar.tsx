// src/components/GlobalMarketBar.tsx
// Fetches global crypto market data from CoinGecko public API (no key needed).
// Displays: total market cap, 24h change, BTC dominance, ETH dominance, volume.
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface GlobalData {
    total_market_cap:                       { usd: number }
    total_volume:                           { usd: number }
    market_cap_percentage:                  { btc: number; eth: number }
    market_cap_change_percentage_24h_usd:   number
    active_cryptocurrencies:                number
}

async function fetchGlobal(): Promise<GlobalData> {
    const res = await fetch('https://api.coingecko.com/api/v3/global')
    if (!res.ok) throw new Error('Global fetch failed')
    const json = await res.json()
    return json.data
}

function fmt(n: number): string {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
    return `$${n.toFixed(0)}`
}

interface StatItemProps { label: string; value: string; badge?: { text: string; positive: boolean } }
function StatItem({ label, value, badge }: StatItemProps) {
    return (
        <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-300 font-mono font-medium">{value}</span>
            {badge && (
                <span className={cn(
                    'flex items-center gap-0.5 font-mono text-[10px]',
                    badge.positive ? 'text-emerald-400' : 'text-red-400',
                )}>
                    {badge.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {badge.positive ? '+' : ''}{badge.text}
                </span>
            )}
        </div>
    )
}

function Sep() {
    return <span className="text-gray-800 text-xs select-none mx-0.5">·</span>
}

export function GlobalMarketBar() {
    const { data, isLoading } = useQuery({
        queryKey: ['globalMarket'],
        queryFn:  fetchGlobal,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    })

    if (isLoading) {
        return (
            <div className="h-8 bg-gray-900 border-b border-gray-800 animate-pulse" />
        )
    }

    if (!data) return null

    const chg = data.market_cap_change_percentage_24h_usd
    const pos = chg >= 0

    return (
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <StatItem
                label="Market Cap"
                value={fmt(data.total_market_cap.usd)}
                badge={{ text: `${Math.abs(chg).toFixed(2)}%`, positive: pos }}
            />
            <Sep />
            <StatItem label="Vol 24h" value={fmt(data.total_volume.usd)} />
            <Sep />
            <StatItem label="BTC Dom" value={`${data.market_cap_percentage.btc.toFixed(1)}%`} />
            <Sep />
            <StatItem label="ETH Dom" value={`${data.market_cap_percentage.eth.toFixed(1)}%`} />
            <Sep />
            <StatItem label="Coins" value={data.active_cryptocurrencies.toLocaleString()} />
        </div>
    )
}
