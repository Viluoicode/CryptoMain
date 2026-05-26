// src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps {
    className?: string
}

/** Shimmer-animated loading placeholder */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('skeleton', className)} />
    )
}

/** Common skeleton patterns */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-3',
                        i === lines - 1 ? 'w-3/4' : 'w-full',
                    )}
                />
            ))}
        </div>
    )
}

export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn('glass-card p-5 space-y-4', className)}>
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                </div>
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-2.5 w-20" />
        </div>
    )
}

export function SkeletonRow({ className }: SkeletonProps) {
    return (
        <div className={cn('flex items-center gap-3 py-3', className)}>
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 w-20 flex-shrink-0" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
        </div>
    )
}
