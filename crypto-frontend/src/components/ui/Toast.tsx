// src/components/ui/Toast.tsx
import {
    createContext, useCallback, useContext, useRef, useState,
} from 'react'
import type { ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

interface ToastContextValue {
    toast: (opts: Omit<Toast, 'id'>) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

// ── Config per type ────────────────────────────────────────────────────────
const CONFIG: Record<ToastType, {
    icon: typeof CheckCircle
    iconCls: string
    accentBorder: string
    bg: string
}> = {
    success: {
        icon: CheckCircle,
        iconCls: 'text-emerald-400',
        accentBorder: 'border-l-emerald-500',
        bg: 'bg-navy-800/90 backdrop-blur-xl',
    },
    error: {
        icon: XCircle,
        iconCls: 'text-red-400',
        accentBorder: 'border-l-red-500',
        bg: 'bg-navy-800/90 backdrop-blur-xl',
    },
    warning: {
        icon: AlertCircle,
        iconCls: 'text-amber-400',
        accentBorder: 'border-l-amber-500',
        bg: 'bg-navy-800/90 backdrop-blur-xl',
    },
    info: {
        icon: Info,
        iconCls: 'text-accent-cyan',
        accentBorder: 'border-l-accent-cyan',
        bg: 'bg-navy-800/90 backdrop-blur-xl',
    },
}

// ── Single Toast item ──────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const { icon: Icon, iconCls, accentBorder, bg } = CONFIG[toast.type]

    return (
        <div
            className={cn(
                'flex items-start gap-3 w-80 rounded-xl shadow-glass px-4 py-3',
                'border-l-4 border border-white/[0.06]',
                'animate-slide-in',
                bg,
                accentBorder,
            )}
            role="alert"
        >
            <Icon className={cn('mt-0.5 shrink-0', iconCls)} size={18} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                    {toast.title}
                </p>
                {toast.message && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                        {toast.message}
                    </p>
                )}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    )
}

// ── Provider ───────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const counterRef = useRef(0)

    const remove = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const toast = useCallback((opts: Omit<Toast, 'id'>) => {
        const id = `toast-${++counterRef.current}`
        const duration = opts.duration ?? 4000

        setToasts(prev => {
            // cap at 5 visible toasts
            const next = [...prev, { ...opts, id }]
            return next.length > 5 ? next.slice(next.length - 5) : next
        })

        setTimeout(() => remove(id), duration)
    }, [remove])

    const success = useCallback((title: string, message?: string) =>
        toast({ type: 'success', title, message }), [toast])
    const error = useCallback((title: string, message?: string) =>
        toast({ type: 'error', title, message }), [toast])
    const warning = useCallback((title: string, message?: string) =>
        toast({ type: 'warning', title, message }), [toast])
    const info = useCallback((title: string, message?: string) =>
        toast({ type: 'info', title, message }), [toast])

    return (
        <ToastContext.Provider value={{ toast, success, error, warning, info }}>
            {children}
            {/* Portal-like fixed container */}
            <div
                aria-live="polite"
                className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
            >
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onRemove={remove} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
    return ctx
}
