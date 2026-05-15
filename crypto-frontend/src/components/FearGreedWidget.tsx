// src/components/FearGreedWidget.tsx
// Fetches the Crypto Fear & Greed Index from alternative.me (public, no key needed).
// Renders a semi-circular SVG gauge with color-coded zones.
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface FngData {
    value: string
    value_classification: string
    timestamp: string
}

async function fetchFearGreed(): Promise<FngData> {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    if (!res.ok) throw new Error('FNG fetch failed')
    const json = await res.json()
    return json.data[0]
}

function getZone(v: number): { label: string; color: string; stroke: string; bg: string } {
    if (v <= 25) return { label: 'Extreme Fear', color: 'text-red-400',     stroke: '#ef4444', bg: 'bg-red-500/10'     }
    if (v <= 45) return { label: 'Fear',          color: 'text-orange-400',  stroke: '#f97316', bg: 'bg-orange-500/10'  }
    if (v <= 55) return { label: 'Neutral',        color: 'text-yellow-400',  stroke: '#eab308', bg: 'bg-yellow-500/10'  }
    if (v <= 75) return { label: 'Greed',          color: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10' }
    return              { label: 'Extreme Greed',  color: 'text-green-300',   stroke: '#4ade80', bg: 'bg-green-500/10'   }
}

// SVG semi-circular gauge (180° arc)
function Gauge({ value }: { value: number }) {
    const zone   = getZone(value)
    const r      = 54
    const cx     = 70
    const cy     = 68
    const circumference = Math.PI * r          // half-circle
    const progress      = (value / 100) * circumference

    // Arc from left (180°) to right (0°) — viewBox 140×80
    const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

    return (
        <svg viewBox="0 0 140 76" className="w-full max-w-[180px] mx-auto overflow-visible">
            {/* Background arc (gray) */}
            <path
                d={arcPath}
                fill="none"
                stroke="#1f2937"
                strokeWidth="10"
                strokeLinecap="round"
            />
            {/* Colored progress arc */}
            <path
                d={arcPath}
                fill="none"
                stroke={zone.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
                className="transition-all duration-700"
            />
            {/* Needle */}
            {(() => {
                const angle = (value / 100) * 180 - 180  // -180° to 0°
                const rad   = (angle * Math.PI) / 180
                const nx    = cx + (r - 6) * Math.cos(rad)
                const ny    = cy + (r - 6) * Math.sin(rad)
                return <circle cx={nx} cy={ny} r={4} fill={zone.stroke} className="transition-all duration-700" />
            })()}
            {/* Zone labels */}
            <text x="8"   y={cy + 16} fontSize="7" fill="#6b7280">Fear</text>
            <text x="108" y={cy + 16} fontSize="7" fill="#6b7280">Greed</text>
        </svg>
    )
}

export function FearGreedWidget() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['fearGreed'],
        queryFn:  fetchFearGreed,
        staleTime: 1000 * 60 * 15,   // refresh every 15 min
        retry: 2,
    })

    const value = data ? parseInt(data.value, 10) : null
    const zone  = value !== null ? getZone(value) : null

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 self-start">
                <span className="text-sm font-semibold text-white">Fear &amp; Greed</span>
                <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">alternative.me</span>
            </div>

            {isLoading ? (
                <div className="w-full h-28 bg-gray-800 animate-pulse rounded-xl" />
            ) : isError || !data || value === null ? (
                <div className="py-6 text-xs text-gray-600">Không tải được dữ liệu</div>
            ) : (
                <>
                    <Gauge value={value} />
                    <div className="text-center -mt-1">
                        <p className={cn('text-4xl font-bold font-mono', zone!.color)}>{value}</p>
                        <p className={cn('text-xs font-semibold mt-0.5 px-2.5 py-0.5 rounded-full', zone!.bg, zone!.color)}>
                            {zone!.label}
                        </p>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                        Cập nhật lúc {new Date(parseInt(data.timestamp, 10) * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                </>
            )}
        </div>
    )
}
