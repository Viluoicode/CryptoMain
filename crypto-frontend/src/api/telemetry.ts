// src/api/telemetry.ts — push browser-side errors to the backend logger
import { apiClient } from './client'

export interface ClientErrorReport {
    message: string
    stack?: string
    componentStack?: string
    url?: string
    userAgent?: string
    context?: string
}

/**
 * Fire-and-forget: best-effort report of a frontend exception. Errors during
 * the report itself are swallowed — we don't want to recurse into the
 * ErrorBoundary by throwing while handling another error.
 */
export async function reportClientError(report: ClientErrorReport): Promise<void> {
    try {
        await apiClient.post('/telemetry/errors', report, { timeout: 5000 })
    } catch {
        // best effort — silently swallow so we never re-trigger the boundary
    }
}
