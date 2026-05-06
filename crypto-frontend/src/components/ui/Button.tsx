// src/components/ui/Button.tsx
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost'
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
                'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',

                // Variants
                variant === 'primary' && [
                    'bg-brand-600 text-white hover:bg-brand-700',
                    'dark:bg-brand-600 dark:hover:bg-brand-700',
                ],
                variant === 'outline' && [
                    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
                ],
                variant === 'ghost' && [
                    'text-gray-600 hover:bg-gray-100',
                    'dark:text-gray-400 dark:hover:bg-gray-800',
                ],

                // Sizes
                size === 'sm' && 'px-3 py-1.5 text-sm',
                size === 'md' && 'px-4 py-2 text-sm',
                size === 'lg' && 'px-6 py-3 text-base',

                className,
            )}
        >
            {loading && (
                <svg
                    className="mr-2 h-4 w-4 animate-spin"
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