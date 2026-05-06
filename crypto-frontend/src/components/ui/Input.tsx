// src/components/ui/Input.tsx
import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        {label}
                    </label>
                )}
                <input
                    {...props}
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition',
                        'bg-white dark:bg-gray-800',
                        'border-gray-300 dark:border-gray-700',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
                        'dark:focus:border-brand-400 dark:focus:ring-brand-400',
                        error && 'border-red-400 focus:border-red-400 focus:ring-red-400',
                        className,
                    )}
                />
                {error && (
                    <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
                )}
            </div>
        )
    },
)
Input.displayName = 'Input'