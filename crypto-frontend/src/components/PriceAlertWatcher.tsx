// src/components/PriceAlertWatcher.tsx
// Invisible component mounted inside AppLayout.
// Watches Binance live prices against the user's alerts — fires toasts and
// hard-deletes the alert via API when a target is crossed.

import { useEffect, useRef } from 'react'
import { useLivePriceStore } from '@/store/livePriceStore'
import { useAlerts, useDeleteAlert } from '@/hooks/usePriceAlert'
import { useToast } from '@/components/ui/Toast'
import { formatUSD } from '@/lib/format'

// Request browser notification permission once on mount
function useNotificationPermission() {
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [])
}

function sendBrowserNotification(title: string, body: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
        const n = new Notification(title, { body, icon: '/favicon.ico', silent: false })
        // Auto-close after 8 seconds
        setTimeout(() => n.close(), 8000)
    } catch { /* some browsers block notifications */ }
}

export function PriceAlertWatcher() {
    const { ticks }        = useLivePriceStore()
    const { data: alerts } = useAlerts()
    const deleteMut        = useDeleteAlert()
    const toast            = useToast()

    // Request browser notification permission
    useNotificationPermission()

    // Track IDs already triggered this session to avoid double-firing
    const triggeredRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (!alerts?.length) return

        for (const alert of alerts) {
            if (triggeredRef.current.has(alert.id)) continue

            const tick = ticks[alert.coinSymbol.toLowerCase()]
            if (!tick) continue

            const shouldTrigger =
                alert.direction === 1
                    ? tick.price >= alert.targetPrice
                    : tick.price <= alert.targetPrice

            if (!shouldTrigger) continue

            // Mark immediately to prevent re-fire before API responds
            triggeredRef.current.add(alert.id)

            const sym      = alert.coinSymbol.toUpperCase()
            const dirLabel = alert.direction === 1 ? '≥' : '≤'
            const title    = `🔔 ${sym} ${dirLabel} ${formatUSD(alert.targetPrice)}`
            const body     = `Giá hiện tại: ${formatUSD(tick.price)}`

            // In-app toast
            toast.success(title, body)

            // Browser push notification (works even when tab is in background)
            sendBrowserNotification(title, body)

            // Hard-delete alert (one-shot)
            deleteMut.mutate(alert.id)
        }
    }, [ticks, alerts])   // eslint-disable-line react-hooks/exhaustive-deps

    return null
}
