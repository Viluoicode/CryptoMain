// src/components/FearGreedWidget.tsx
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface FngData { value: string; value_classification: string; timestamp: string }

async function fetchFearGreed(): Promise<FngData> {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    if (!res.ok) throw new Error('FNG fetch failed')
    const json = await res.json()
    return json.data[0]
}

function getZone(v: number) {
    if (v <= 25) return { label: 'Extreme Fear', color: 'text-red-400',     stroke: '#ef4444', bg: 'bg-red-500/10'     }
    if (v <= 45) return { label: 'Fear',          color: 'text-orange-400',  stroke: '#f97316', bg: 'bg-orange-500/10'  }
    if (v <= 55) return { label: 'Neutral',        color: 'text-yellow-400',  stroke: '#eab308', bg: 'bg-yellow-500/10'  }
    if (v <= 75) return { label: 'Greed',          color: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10' }
    return              { label: 'Extreme Greed',  color: 'text-green-300',   stroke: '#4ade80', bg: 'bg-green-500/10'   }
}

function Gauge({ value }: { value: number }) {
    const zone = getZone(value)
    const r = 54, cx = 70, cy = 68
    const circumference = Math.PI * r
    const progress = (value / 100) * circumference
    const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

    return (
        <svg viewBox="0 0 140 76" className="w-full max-w-[180px] mx-auto overflow-visible">
            <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
            <path d={arcPath} fill="none" stroke={zone.stroke} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`} className="transition-all duration-700" />
            {(() => {
                const angle = (value / 100) * 180 - 180
                const rad = (angle * Math.PI) / 180
                const nx = cx + (r - 6) * Math.cos(rad)
                const ny = cy + (r - 6) * Math.sin(rad)
                return <circle cx={nx} cy={ny} r={4} fill={zone.stroke} className="transition-all duration-700" />
            })()}
            <text x="8" y={cy + 16} fontSize="7" fill="#6b7280">Fear</text>
            <text x="108" y={cy + 16} fontSize="7" fill="#6b7280">Greed</text>
        </svg>
    )
}

export function FearGreedWidget() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['fearGreed'],
        queryFn: fetchFearGreed,
        staleTime: 1000 * 60 * 15,
        retry: 2,
    })

    const value = data ? parseInt(data.value, 10) : null
    const zone = value !== null ? getZone(value) : null

    return (
        <div className="glass-card p-5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 self-start">
                <span className="text-sm font-semibold text-white">Fear &amp; Greed</span>
                <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">alternative.me</span>
            </div>

            {isLoading ? (
                <div className="w-full h-28 skeleton rounded-xl" />
            ) : isError || !data || value === null ? (
                <div className="py-6 text-xs text-gray-500">Cannot load data</div>
            ) : (
                <>
                    <Gauge value={value} />
                    <div className="text-center -mt-1">
                        <p className={cn('text-4xl font-bold font-mono', zone!.color)}>{value}</p>
                        <p className={cn('text-xs font-semibold mt-0.5 px-2.5 py-0.5 rounded-full border', zone!.bg, zone!.color, 'border-current/20')}>
                            {zone!.label}
                        </p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                        Updated {new Date(parseInt(data.timestamp, 10) * 1000).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                </>
            )}
        </div>
    )
}
