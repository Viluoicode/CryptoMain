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
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-cyan/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0e1a_70%)]" />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-accent-gradient rounded-xl blur-md opacity-50" />
                        <div className="relative bg-gradient-to-br from-accent-cyan to-accent-purple rounded-xl p-2.5">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <span className="text-white text-2xl font-bold tracking-tight">
                        CryptoDash
                    </span>
                </div>

                {/* Card */}
                <div className="glass-strong rounded-2xl p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-white">{title}</h1>
                        <p className="mt-1.5 text-sm text-gray-400">{subtitle}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}