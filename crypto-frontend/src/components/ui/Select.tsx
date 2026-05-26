// src/components/ui/Select.tsx
import { cn } from '@/lib/utils'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, id, options, ...props }, ref) => {
        const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="text-sm font-medium text-gray-300"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        {...props}
                        id={selectId}
                        ref={ref}
                        className={cn(
                            'w-full rounded-xl border px-4 py-2.5 text-sm transition-all duration-200 appearance-none pr-10',
                            'bg-navy-800/60 backdrop-blur-sm',
                            'border-white/[0.08]',
                            'text-white',
                            'focus:border-accent-cyan/40 focus:outline-none focus:ring-1 focus:ring-accent-cyan/20',
                            'hover:border-white/[0.12]',
                            error && 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20',
                            className,
                        )}
                    >
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-navy-800">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
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
Select.displayName = 'Select'
