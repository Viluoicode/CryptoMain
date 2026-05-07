// src/components/AuthLayout.tsx
import type { ReactNode } from 'react'
import { TrendingUp } from 'lucide-react'

interface AuthLayoutProps {
    title: string
    subtitle: string
    children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-600 to-indigo-800 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="bg-white/20 dark:bg-white/10 rounded-xl p-2">
                        <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-white text-2xl font-bold tracking-tight">
                        CryptoDash
                    </span>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-200">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}