// src/components/ui/Card.tsx
import { cn } from '@/lib/utils'
import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    glow?: boolean
    hover?: boolean
    padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className, glow, hover, padding = 'md', ...props }: CardProps) {
    return (
        <div
            {...props}
            className={cn(
                'glass-card',
                padding === 'sm' && 'p-4',
                padding === 'md' && 'p-5',
                padding === 'lg' && 'p-6',
                padding === 'none' && 'p-0',
                hover && 'hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300',
                glow && 'hover-glow',
                className,
            )}
        >
            {children}
        </div>
    )
}

// Convenience sub-components
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex items-center justify-between mb-4', className)}>
            {children}
        </div>
    )
}

export function CardTitle({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
    return (
        <h3 className={cn('font-semibold text-white flex items-center gap-2', className)}>
            {icon && <span className="text-accent-cyan">{icon}</span>}
            {children}
        </h3>
    )
}
