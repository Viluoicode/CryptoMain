import type { LeaderboardEntry, LeaderboardPeriod } from '../types'
import { apiClient } from './client'

export const leaderboardApi = {
  get: (period: LeaderboardPeriod = 1, top = 50) =>
    apiClient.get<LeaderboardEntry[]>('/Portfolio/leaderboard', { params: { period, top } }).then(r => r.data),
}
