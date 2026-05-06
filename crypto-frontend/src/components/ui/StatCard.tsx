// src/components/ui/StatCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
    label: string
    value: ReactNode
    sub?: string
    trend?: number
    loading?: boolean
}

export function StatCard({ label, value, sub, trend, loading }: StatCardProps) {
    const trendPositive = (trend ?? 0) >= 0

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>

            {loading ? (
                <div className="h-7 w-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mt-1" />
            ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {value}
                </p>
            )}

            <div className="mt-1 flex items-center gap-1.5 min-h-[18px]">
                {trend !== undefined && !loading && (
                    <span className={cn(
                        'text-xs font-medium',
                        trendPositive ? 'text-emerald-500' : 'text-red-500'
                    )}>
                        {trendPositive ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}%
                    </span>
                )}
                {sub && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>
                )}
            </div>
        </div>
    )
}