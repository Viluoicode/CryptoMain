// src/lib/indicators.ts
// Pure functions — no React, no side-effects.
// Used by FuturesChart and CoinDetailPage chart.

export interface OhlcBar {
    time:  number   // unix seconds
    open:  number
    high:  number
    low:   number
    close: number
}

// ─── EMA ──────────────────────────────────────────────────────────────────────
// Returns array same length as input; first (period-1) values are null.
export function calcEMA(bars: OhlcBar[], period: number): (number | null)[] {
    if (bars.length < period) return bars.map(() => null)

    const k      = 2 / (period + 1)
    const result : (number | null)[] = Array(period - 1).fill(null)

    // Seed: simple average of first `period` closes
    let ema = bars.slice(0, period).reduce((s, b) => s + b.close, 0) / period
    result.push(ema)

    for (let i = period; i < bars.length; i++) {
        ema = bars[i].close * k + ema * (1 - k)
        result.push(ema)
    }
    return result
}

// Incremental EMA — for updating the last live bar without full recompute
export function tickEMA(prevEMA: number, newClose: number, period: number): number {
    const k = 2 / (period + 1)
    return newClose * k + prevEMA * (1 - k)
}

// ─── RSI (Wilder's smoothing) ──────────────────────────────────────────────────
// Returns array same length as input; first `period` values are null.
export interface RsiState {
    avgGain: number
    avgLoss: number
    prevClose: number
}

export function calcRSI(
    bars: OhlcBar[],
    period = 14,
): { values: (number | null)[]; state: RsiState | null } {
    if (bars.length <= period) {
        return { values: bars.map(() => null), state: null }
    }

    const values: (number | null)[] = Array(period).fill(null)

    // Initial average gain/loss
    let avgGain = 0
    let avgLoss = 0
    for (let i = 1; i <= period; i++) {
        const d = bars[i].close - bars[i - 1].close
        if (d > 0) avgGain += d
        else avgLoss += -d
    }
    avgGain /= period
    avgLoss /= period

    const rs = avgGain / (avgLoss || 1e-10)
    values.push(100 - 100 / (1 + rs))

    // Wilder smoothing for remaining bars
    for (let i = period + 1; i < bars.length; i++) {
        const d    = bars[i].close - bars[i - 1].close
        const gain = d > 0 ? d  : 0
        const loss = d < 0 ? -d : 0
        avgGain = (avgGain * (period - 1) + gain) / period
        avgLoss = (avgLoss * (period - 1) + loss) / period
        const rs = avgGain / (avgLoss || 1e-10)
        values.push(100 - 100 / (1 + rs))
    }

    const last = bars[bars.length - 1]
    return {
        values,
        state: { avgGain, avgLoss, prevClose: last.close },
    }
}

// Incremental RSI tick — update live candle without full recompute
export function tickRSI(state: RsiState, newClose: number, period: number): {
    value: number
    state: RsiState
} {
    const d    = newClose - state.prevClose
    const gain = d > 0 ? d  : 0
    const loss = d < 0 ? -d : 0
    // For a live (unclosed) bar we want the *current* RSI, not Wilder-smoothed yet
    // So we temporarily compute without advancing avgGain/avgLoss
    const tempAvgGain = (state.avgGain * (period - 1) + gain) / period
    const tempAvgLoss = (state.avgLoss * (period - 1) + loss) / period
    const rs    = tempAvgGain / (tempAvgLoss || 1e-10)
    return {
        value: 100 - 100 / (1 + rs),
        state: { avgGain: tempAvgGain, avgLoss: tempAvgLoss, prevClose: newClose },
    }
}

// ─── Depth chart helpers ───────────────────────────────────────────────────────
export interface DepthPoint {
    price: number
    bid?:  number   // cumulative bid qty (left of mid)
    ask?:  number   // cumulative ask qty (right of mid)
}

export function buildDepthPoints(
    bids: [string, string][],
    asks: [string, string][],
    maxRows = 20,
): DepthPoint[] {
    // Bids sorted high→low; accumulate qty
    let cumBid = 0
    const bidPts: DepthPoint[] = bids.slice(0, maxRows).map(([p, q]) => {
        cumBid += parseFloat(q)
        return { price: parseFloat(p), bid: cumBid }
    }).reverse()   // Now sorted low→high price for chart

    // Asks sorted low→high; accumulate qty
    let cumAsk = 0
    const askPts: DepthPoint[] = asks.slice(0, maxRows).map(([p, q]) => {
        cumAsk += parseFloat(q)
        return { price: parseFloat(p), ask: cumAsk }
    })

    return [...bidPts, ...askPts]
}
