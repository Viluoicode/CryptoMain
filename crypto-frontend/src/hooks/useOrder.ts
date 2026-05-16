import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderApi } from '../api/order'
import type { CreateOrderRequest } from '../types'

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: orderApi.getAll })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CreateOrderRequest) => orderApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => orderApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
