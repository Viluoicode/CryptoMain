// src/hooks/useBinanceWs.ts
import { useEffect, useRef } from 'react'
import { binanceWs } from '@/lib/binanceWs'

/**
 * Connect to Binance WebSocket for the given coin symbols.
 *
 * @param symbols  Array of lowercase CoinGecko symbols, e.g. ['btc', 'eth', 'bnb'].
 *                 Pass an empty array (or wait until coins load) — hook is a no-op when empty.
 *
 * Lifecycle:
 *  - Connects when `symbols` first becomes non-empty.
 *  - Reconnects automatically if symbols list changes.
 *  - Disconnects cleanly on component unmount.
 */
export function useBinanceWs(symbols: string[]) {
    // Use a stable string key to compare symbol lists without re-creating effect
    const key = symbols.slice().sort().join(',')
    const keyRef = useRef(key)

    useEffect(() => {
        if (!symbols.length) return

        binanceWs.connect(symbols)
        keyRef.current = key

        return () => {
            binanceWs.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
}
