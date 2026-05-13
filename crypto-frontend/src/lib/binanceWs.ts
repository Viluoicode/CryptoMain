// src/lib/binanceWs.ts
// Singleton WebSocket manager — connects to Binance public miniTicker stream.
// No API key needed. Data: price, 24h open/high/low, volume.

import { useLivePriceStore } from '@/store/livePriceStore'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface MiniTickerData {
    e: '24hrMiniTicker'
    s: string   // 'BTCUSDT'
    c: string   // close (current price)
    o: string   // open 24h ago
    h: string   // 24h high
    l: string   // 24h low
    v: string   // base asset volume
    q: string   // quote asset volume
}

interface CombinedMsg {
    stream: string
    data: MiniTickerData
}

// ─── Manager ────────────────────────────────────────────────────────────────────
class BinanceWsManager {
    private ws: WebSocket | null = null
    private symbols: string[] = []
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private reconnectDelay = 2000
    private alive = true   // false = disconnect() was called intentionally

    // ── Public API ──────────────────────────────────────────────────────────────

    /** Start (or restart) connection with the given coin symbols (lowercase, e.g. ['btc','eth']). */
    connect(symbols: string[]) {
        this.alive = true
        this.reconnectDelay = 2000

        // De-dup symbols, filter empty
        const next = [...new Set(symbols.filter(Boolean))]
        const same = next.length === this.symbols.length && next.every((s, i) => s === this.symbols[i])

        if (same && this.ws?.readyState === WebSocket.OPEN) return  // already connected, same symbols

        this.symbols = next
        this._closeWs()
        this._open()
    }

    /** Permanently close the connection (e.g. component unmount). */
    disconnect() {
        this.alive = false
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this._closeWs()
        useLivePriceStore.getState().setConnected(false)
    }

    // ── Internals ───────────────────────────────────────────────────────────────

    private _open() {
        if (!this.symbols.length) return

        // Build combined stream URL:
        // wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker/...
        const streams = this.symbols.map(s => `${s}usdt@miniTicker`).join('/')
        const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

        try {
            this.ws = new WebSocket(url)
        } catch {
            this._scheduleReconnect()
            return
        }

        this.ws.onopen = () => {
            useLivePriceStore.getState().setConnected(true)
            this.reconnectDelay = 2000   // reset backoff on success
        }

        this.ws.onmessage = (ev: MessageEvent<string>) => {
            this._handleMessage(ev.data)
        }

        this.ws.onerror = () => {
            useLivePriceStore.getState().setConnected(false)
        }

        this.ws.onclose = () => {
            useLivePriceStore.getState().setConnected(false)
            if (this.alive) this._scheduleReconnect()
        }
    }

    private _closeWs() {
        if (this.ws) {
            this.ws.onclose = null   // prevent triggering reconnect inside _closeWs
            this.ws.close()
            this.ws = null
        }
    }

    private _scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
            this._open()
        }, this.reconnectDelay)
    }

    private _handleMessage(raw: string) {
        let msg: CombinedMsg
        try {
            msg = JSON.parse(raw) as CombinedMsg
        } catch {
            return
        }

        const d = msg?.data
        if (!d || d.e !== '24hrMiniTicker') return

        // 'BTCUSDT' → 'btc'
        const symbol = d.s.replace(/USDT$/i, '').toLowerCase()
        const price  = parseFloat(d.c)
        const open   = parseFloat(d.o)

        useLivePriceStore.getState().setTick(symbol, {
            symbol,
            price,
            open,
            high24h:   parseFloat(d.h),
            low24h:    parseFloat(d.l),
            change24h: open > 0 ? ((price - open) / open) * 100 : 0,
            volume:    parseFloat(d.v),
            updatedAt: Date.now(),
        })
    }
}

// Export as singleton — one connection for the whole app
export const binanceWs = new BinanceWsManager()
