// src/components/ErrorBoundary.tsx
// ─── React Error Boundary — prevents white screen on unhandled render errors ──
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { TrendingUp, RefreshCw, Home } from 'lucide-react'
import { reportClientError } from '@/api/telemetry'

interface Props {
    children: ReactNode
    /** Optional custom fallback. If omitted the default UI is shown. */
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Always log to console for local debugging
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)

        // Ship to backend telemetry sink in production (best-effort, never re-throws)
        if (!import.meta.env.DEV) {
            reportClientError({
                message: error.message,
                stack: error.stack,
                componentStack: info.componentStack ?? undefined,
                url: window.location.href,
                userAgent: navigator.userAgent,
                context: 'ErrorBoundary',
            })
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Logo */}
                        <div className="flex justify-center">
                            <div className="bg-indigo-600/20 rounded-2xl p-4">
                                <TrendingUp size={32} className="text-indigo-400" />
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <h1 className="text-xl font-bold text-white">Đã xảy ra lỗi</h1>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử tải lại
                                trang hoặc quay về trang chủ.
                            </p>

                            {/* Error detail — dev only */}
                            {import.meta.env.DEV && this.state.error && (
                                <pre className="mt-4 text-left bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-red-400 overflow-auto max-h-40 font-mono">
                                    {this.state.error.message}
                                </pre>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                            >
                                <RefreshCw size={15} />
                                Thử lại
                            </button>
                            <button
                                onClick={() => { this.handleReset(); window.location.href = '/' }}
                                className="flex items-center gap-2 px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium rounded-xl transition"
                            >
                                <Home size={15} />
                                Trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
