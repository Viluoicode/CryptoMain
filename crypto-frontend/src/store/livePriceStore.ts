// src/store/livePriceStore.ts
import { create } from 'zustand'

export interface LiveTick {
    symbol: string      // lowercase, e.g. 'btc'
    price: number
    open: number        // 24h open price
    high24h: number
    low24h: number
    change24h: number   // % e.g. 2.34
    volume: number      // base asset volume
    updatedAt: number   // Date.now()
}

interface LivePriceStore {
    ticks: Record<string, LiveTick>   // key: coin symbol lowercase, e.g. 'btc'
    connected: boolean
    setTick: (symbol: string, tick: LiveTick) => void
    setConnected: (v: boolean) => void
    reset: () => void
}

export const useLivePriceStore = create<LivePriceStore>((set) => ({
    ticks: {},
    connected: false,

    setTick: (symbol, tick) =>
        set(s => ({ ticks: { ...s.ticks, [symbol]: tick } })),

    setConnected: (connected) => set({ connected }),

    reset: () => set({ ticks: {}, connected: false }),
}))
