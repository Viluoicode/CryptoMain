// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { ToastProvider } from '@/components/ui/Toast'
import './index.css'

// ─── React Query client ───────────────────────────────────────────────────────
// Centralised config following Clean Architecture: data access concerns
// (retry, stale time, error categorisation) live here — not scattered in pages.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 2-minute default; individual queries may override (e.g. live data
            // pages set staleTime: 0 to always fetch fresh).
            staleTime: 1000 * 60 * 2,

            // Don't retry on auth errors — they are permanent until re-login.
            retry: (failureCount, error: unknown) => {
                const status = (error as { response?: { status?: number } })?.response?.status
                if (status === 401 || status === 403 || status === 404) return false
                return failureCount < 2
            },

            // Surface network errors to user via the query's `isError` state,
            // but don't let them propagate to the ErrorBoundary automatically.
            throwOnError: false,
        },
        mutations: {
            // Mutations also don't propagate to the ErrorBoundary by default.
            throwOnError: false,
        },
    },
})

// ─── Root render ─────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </BrowserRouter>
            {/* DevTools only included in dev builds — tree-shaken in production */}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    </StrictMode>,
)
