import type { CreateOrderRequest, OrderResponse } from '../types'
import { apiClient } from './client'

export const orderApi = {
  getAll: () => apiClient.get<OrderResponse[]>('/Order').then(r => r.data),
  create: (req: CreateOrderRequest) => apiClient.post<OrderResponse>('/Order', req).then(r => r.data),
  cancel: (id: string) => apiClient.delete(`/Order/${id}`),
}
