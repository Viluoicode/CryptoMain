// src/hooks/useBinanceWs.ts
// Self-contained multi-symbol Binance WS hook — no singleton.
// Connects to the Binance combined stream endpoint:
//   wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker/...
// Parses miniTicker events and writes to useLivePriceStore.
// Auto-reconnects with exponential back-off.

import { useEffect, useRef } from 'react'
import { useLivePriceStore } from '@/store/livePriceStore'

const BASE = 'wss://stream.binance.com:9443'

export function useBinanceWs(symbols: string[]) {
    const key            = symbols.slice().sort().join(',')
    const { setTick, setConnected } = useLivePriceStore()

    const wsRef    = useRef<WebSocket | null>(null)
    const aliveRef = useRef(false)
    const delayRef = useRef(1000)

    useEffect(() => {
        if (!symbols.length) return

        aliveRef.current = true
        delayRef.current = 1000

        function connect() {
            if (!aliveRef.current) return

            // Use combined stream if multiple symbols, single stream if one
            const streams = symbols.map(s => `${s}usdt@miniTicker`).join('/')
            const url = symbols.length === 1
                ? `${BASE}/ws/${streams}`
                : `${BASE}/stream?streams=${streams}`

            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                delayRef.current = 1000
                setConnected(true)
            }

            ws.onmessage = (ev) => {
                try {
                    const msg  = JSON.parse(ev.data)
                    // Combined stream wraps data; single stream is the payload directly
                    const data = msg.data ?? msg
                    if (!data?.s || !data?.c) return

                    const sym    = data.s.replace('USDT', '').toLowerCase()
                    const price  = parseFloat(data.c)
                    const open   = parseFloat(data.o)

                    setTick(sym, {
                        symbol:    sym,
                        price,
                        open,
                        high24h:   parseFloat(data.h),
                        low24h:    parseFloat(data.l),
                        change24h: open > 0 ? ((price - open) / open) * 100 : 0,
                        volume:    parseFloat(data.v),
                        updatedAt: Date.now(),
                    })
                } catch { /* ignore parse errors */ }
            }

            ws.onclose = () => {
                setConnected(false)
                if (!aliveRef.current) return
                const d = delayRef.current
                delayRef.current = Math.min(d * 2, 30_000)
                setTimeout(connect, d)
            }

            ws.onerror = () => ws.close()
        }

        connect()

        return () => {
            aliveRef.current = false
            wsRef.current?.close()
            wsRef.current = null
            setConnected(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
}
