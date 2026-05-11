import { apiClient } from './client'
import type { WatchlistItemResponse, AddWatchlistRequest } from '@/types'

// GET /api/watchlist
export async function getWatchlist(): Promise<WatchlistItemResponse[]> {
    const { data } = await apiClient.get<WatchlistItemResponse[]>('/Watchlist')
    return data
}

// POST /api/watchlist
export async function addToWatchlist(body: AddWatchlistRequest): Promise<WatchlistItemResponse> {
    const { data } = await apiClient.post<WatchlistItemResponse>('/Watchlist', body)
    return data
}

// DELETE /api/watchlist/:coinId
export async function removeFromWatchlist(coinId: string): Promise<void> {
    await apiClient.delete(`/Watchlist/${coinId}`)
}

// POST /api/watchlist/sync — sync localStorage coins to DB
export async function syncWatchlistFromLocalStorage(
    items: AddWatchlistRequest[]
): Promise<WatchlistItemResponse[]> {
    const { data } = await apiClient.post<WatchlistItemResponse[]>('/Watchlist/sync', items)
    return data
}
