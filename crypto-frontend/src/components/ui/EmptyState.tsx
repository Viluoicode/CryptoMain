// src/components/ui/EmptyState.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
    icon: ReactNode
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-12 text-center gap-3',
            className,
        )}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-cyan/10 to-accent-purple/10 border border-white/[0.06] flex items-center justify-center text-gray-500">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-300">{title}</p>
                {description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>
                )}
            </div>
            {action && (
                <Button
                    variant="primary"
                    size="sm"
                    onClick={action.onClick}
                    className="mt-2"
                >
                    {action.label}
                </Button>
            )}
        </div>
    )
}
