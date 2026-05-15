// src/hooks/usePriceAlert.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, createAlert, deleteAlert } from '@/api/priceAlert'
import type { CreatePriceAlertRequest } from '@/types'
import { useAuth } from './useAuth'

const QUERY_KEY = ['priceAlerts']

export function useAlerts() {
    const { isAuthenticated } = useAuth()
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn:  getAlerts,
        enabled:  isAuthenticated,
        staleTime: 1000 * 60,   // 1 min — WS handles real-time, this is just list sync
        refetchInterval: 1000 * 60 * 2,
    })
}

export function useCreateAlert() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (req: CreatePriceAlertRequest) => createAlert(req),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}

export function useDeleteAlert() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteAlert(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}
