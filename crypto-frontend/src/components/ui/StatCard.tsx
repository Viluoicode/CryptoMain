// src/components/ui/StatCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
    label: string
    value: ReactNode
    sub?: string
    trend?: number
    loading?: boolean
    icon?: ReactNode
}

export function StatCard({ label, value, sub, trend, loading, icon }: StatCardProps) {
    const trendPositive = (trend ?? 0) >= 0

    return (
        <div className="glass-card px-5 py-4 hover-glow transition-all duration-200 hover:border-white/[0.1]">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                {icon && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-cyan/10 to-accent-purple/10 flex items-center justify-center text-accent-cyan">
                        {icon}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-7 w-32 skeleton mt-1" />
            ) : (
                <p className="text-2xl font-bold text-white leading-tight font-mono">
                    {value}
                </p>
            )}

            <div className="mt-1.5 flex items-center gap-1.5 min-h-[18px]">
                {trend !== undefined && !loading && (
                    <span className={cn(
                        'text-xs font-semibold font-mono px-1.5 py-0.5 rounded-md',
                        trendPositive
                            ? 'text-profit bg-profit/10'
                            : 'text-loss bg-loss/10'
                    )}>
                        {trendPositive ? '+' : ''}{Math.abs(trend).toFixed(2)}%
                    </span>
                )}
                {sub && (
                    <span className="text-xs text-gray-500 truncate">{sub}</span>
                )}
            </div>
        </div>
    )
}