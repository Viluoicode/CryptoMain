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
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-gray-300"
                    >
                        {label}
                    </label>
                )}
                <input
                    {...props}
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'w-full rounded-xl border px-4 py-2.5 text-sm transition-all duration-200',
                        'bg-navy-800/60 backdrop-blur-sm',
                        'border-white/[0.08]',
                        'text-white',
                        'placeholder-gray-500',
                        'focus:border-accent-cyan/40 focus:outline-none focus:ring-1 focus:ring-accent-cyan/20',
                        'hover:border-white/[0.12]',
                        error && 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20',
                        className,
                    )}
                />
                {error && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                        {error}
                    </p>
                )}
            </div>
        )
    },
)
Input.displayName = 'Input'