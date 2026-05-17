import { useQuery } from '@tanstack/react-query'
import { leaderboardApi } from '../api/leaderboard'
import type { LeaderboardPeriod } from '../types'

export function useLeaderboard(period: LeaderboardPeriod = 1) {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => leaderboardApi.get(period),
    staleTime: 60_000,
  })
}
