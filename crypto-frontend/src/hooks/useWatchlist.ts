// src/hooks/useWatchlist.ts — DB-backed watchlist via React Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    syncWatchlistFromLocalStorage,
} from '@/api/watchlist'
import type { AddWatchlistRequest } from '@/types'
import { useAuthStore } from '@/store/authStore'

const WATCHLIST_KEY = ['watchlist'] as const
const LS_KEY = 'crypto_watchlist'

// ── Helpers for localStorage migration ────────────────────────────────────────
function getLocalStorageWatchlist(): Array<{ coinId: string; coinSymbol: string }> {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return []
        const ids = JSON.parse(raw) as string[]
        // Old format was just coinId strings — map to {coinId, coinSymbol}
        return ids.map(id => ({ coinId: id, coinSymbol: id.toUpperCase().slice(0, 5) }))
    } catch {
        return []
    }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useWatchlist() {
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const qc = useQueryClient()

    const query = useQuery({
        queryKey: WATCHLIST_KEY,
        queryFn: getWatchlist,
        enabled: isAuthenticated,
        staleTime: 60_000,
    })

    const addMutation = useMutation({
        mutationFn: (req: AddWatchlistRequest) => addToWatchlist(req),
        onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
    })

    const removeMutation = useMutation({
        mutationFn: (coinId: string) => removeFromWatchlist(coinId),
        onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
    })

    const watchedCoinIds = new Set(query.data?.map(w => w.coinId) ?? [])

    const toggle = (coinId: string, coinSymbol: string) => {
        if (watchedCoinIds.has(coinId)) {
            removeMutation.mutate(coinId)
        } else {
            addMutation.mutate({ coinId, coinSymbol })
        }
    }

    const isWatched = (coinId: string) => watchedCoinIds.has(coinId)

    return {
        watchlist: query.data ?? [],
        isLoading: query.isLoading,
        toggle,
        isWatched,
        count: watchedCoinIds.size,
    }
}

// ── Sync hook — call once after login ─────────────────────────────────────────
export function useWatchlistSync() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (items: AddWatchlistRequest[]) => syncWatchlistFromLocalStorage(items),
        onSuccess: (data) => {
            qc.setQueryData(WATCHLIST_KEY, data)
            // Clear localStorage after successful sync
            localStorage.removeItem(LS_KEY)
        },
    })
}

// Export helper so components can trigger the sync
export { getLocalStorageWatchlist }
