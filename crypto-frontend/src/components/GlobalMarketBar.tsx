// src/components/GlobalMarketBar.tsx
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

function StatItem({ label, value, badge }: { label: string; value: string; badge?: { text: string; positive: boolean } }) {
    return (
        <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-300 font-mono font-medium">{value}</span>
            {badge && (
                <span className={cn('flex items-center gap-0.5 font-mono text-[10px]', badge.positive ? 'text-profit' : 'text-loss')}>
                    {badge.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {badge.positive ? '+' : ''}{badge.text}
                </span>
            )}
        </div>
    )
}

export function GlobalMarketBar() {
    const { data, isLoading } = useQuery({
        queryKey: ['globalMarket'],
        queryFn:  fetchGlobal,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    })

    if (isLoading) return <div className="h-8 bg-navy-850/60 border-b border-white/[0.04] skeleton" />
    if (!data) return null

    const chg = data.market_cap_change_percentage_24h_usd
    const pos = chg >= 0

    return (
        <div className="bg-navy-850/60 backdrop-blur-sm border-b border-white/[0.04] px-4 py-1.5 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <StatItem label="Market Cap" value={fmt(data.total_market_cap.usd)} badge={{ text: `${Math.abs(chg).toFixed(2)}%`, positive: pos }} />
            <span className="text-gray-700/50 text-xs">|</span>
            <StatItem label="Vol 24h" value={fmt(data.total_volume.usd)} />
            <span className="text-gray-700/50 text-xs">|</span>
            <StatItem label="BTC Dom" value={`${data.market_cap_percentage.btc.toFixed(1)}%`} />
            <span className="text-gray-700/50 text-xs">|</span>
            <StatItem label="ETH Dom" value={`${data.market_cap_percentage.eth.toFixed(1)}%`} />
        </div>
    )
}
