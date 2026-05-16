import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { positionApi } from '../api/position'
import type { OpenPositionRequest } from '../types'

export function usePositions() {
  return useQuery({ queryKey: ['positions'], queryFn: positionApi.getAll, refetchInterval: 10_000 })
}

export function useOpenPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: OpenPositionRequest) => positionApi.open(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      qc.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useClosePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => positionApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      qc.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}
