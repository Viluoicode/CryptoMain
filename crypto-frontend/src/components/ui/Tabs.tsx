// src/components/ui/Tabs.tsx
import { cn } from '@/lib/utils'

interface Tab {
    id: string
    label: string
}

interface TabsProps {
    tabs: Tab[]
    active: string
    onChange: (id: string) => void
    variant?: 'underline' | 'pills'
    className?: string
}

export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
    if (variant === 'pills') {
        return (
            <div className={cn('flex items-center gap-1 p-1 rounded-xl bg-navy-800/60 border border-white/[0.06] w-fit', className)}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                            active === tab.id
                                ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-white shadow-sm border border-white/[0.08]'
                                : 'text-gray-500 hover:text-gray-300',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        )
    }

    return (
        <div className={cn('flex items-center gap-6 border-b border-white/[0.06]', className)}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'pb-3 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px',
                        active === tab.id
                            ? 'text-white border-accent-cyan'
                            : 'text-gray-500 hover:text-gray-300 border-transparent',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
