// src/hooks/useBinanceStream.ts
// Generic single-stream Binance WebSocket hook.
// Connects to wss://stream.binance.com:9443/ws/<streamName>
// Calls onMessage with each parsed JSON payload.
// Auto-reconnects with exponential back-off (1s → 30s).

import { useEffect, useRef } from 'react'

const BASE_URL = 'wss://stream.binance.com:9443/ws'

interface Options {
    enabled?: boolean
}

export function useBinanceStream<T = unknown>(
    streamName: string,
    onMessage: (data: T) => void,
    options: Options = {},
) {
    const { enabled = true } = options
    const wsRef       = useRef<WebSocket | null>(null)
    const aliveRef    = useRef(false)
    const delayRef    = useRef(1000)
    const onMessageRef = useRef(onMessage)

    // Keep callback ref fresh without resetting the WS
    useEffect(() => { onMessageRef.current = onMessage })

    useEffect(() => {
        if (!enabled || !streamName) return

        aliveRef.current = true
        delayRef.current = 1000

        function connect() {
            if (!aliveRef.current) return

            const ws = new WebSocket(`${BASE_URL}/${streamName}`)
            wsRef.current = ws

            ws.onmessage = (ev) => {
                try {
                    onMessageRef.current(JSON.parse(ev.data) as T)
                } catch { /* ignore parse errors */ }
            }

            ws.onclose = () => {
                if (!aliveRef.current) return
                const delay = delayRef.current
                delayRef.current = Math.min(delay * 2, 30_000)
                setTimeout(connect, delay)
            }

            ws.onerror = () => {
                ws.close()
            }
        }

        connect()

        return () => {
            aliveRef.current = false
            wsRef.current?.close()
            wsRef.current = null
        }
    }, [streamName, enabled])
}
