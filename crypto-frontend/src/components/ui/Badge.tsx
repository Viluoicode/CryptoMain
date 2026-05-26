// src/components/ui/Badge.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple'

interface BadgeProps {
    variant?: BadgeVariant
    children: ReactNode
    className?: string
    dot?: boolean
}

const VARIANTS: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    danger:  'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const DOT_COLORS: Record<BadgeVariant, string> = {
    success: 'bg-emerald-400',
    danger:  'bg-red-400',
    warning: 'bg-amber-400',
    info:    'bg-cyan-400',
    neutral: 'bg-gray-400',
    purple:  'bg-purple-400',
}

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border',
            VARIANTS[variant],
            className,
        )}>
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant])} />}
            {children}
        </span>
    )
}
