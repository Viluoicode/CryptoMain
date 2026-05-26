// src/components/ui/Button.tsx
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center font-semibold transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
                'rounded-xl',

                // Variants
                variant === 'primary' && [
                    'bg-gradient-to-r from-accent-cyan to-accent-purple text-white',
                    'hover:shadow-glow hover:brightness-110',
                    'active:scale-[0.98]',
                ],
                variant === 'outline' && [
                    'border border-white/10 bg-white/[0.03] text-gray-200',
                    'hover:bg-white/[0.06] hover:border-white/20',
                    'active:scale-[0.98]',
                ],
                variant === 'ghost' && [
                    'text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]',
                ],
                variant === 'danger' && [
                    'bg-red-500/10 border border-red-500/20 text-red-400',
                    'hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300',
                    'active:scale-[0.98]',
                ],

                // Sizes
                size === 'sm' && 'px-3 py-1.5 text-xs gap-1.5',
                size === 'md' && 'px-4 py-2.5 text-sm gap-2',
                size === 'lg' && 'px-6 py-3 text-base gap-2',

                className,
            )}
        >
            {loading && (
                <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            )}
            {children}
        </button>
    )
}