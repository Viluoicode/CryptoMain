import type { CreateOrderRequest, OrderResponse } from '../types'
import { apiClient } from './client'

/**
 * Generates a fresh idempotency key for each POST so a double-click on
 * "Place order" doesn't accidentally submit twice. Backend caches the key
 * for 5 minutes and returns 409 on a duplicate.
 */
function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const orderApi = {
  getAll: () => apiClient.get<OrderResponse[]>('/Order').then(r => r.data),
  create: (req: CreateOrderRequest) =>
    apiClient
      .post<OrderResponse>('/Order', req, {
        headers: { 'Idempotency-Key': newIdempotencyKey() },
      })
      .then(r => r.data),
  cancel: (id: string) => apiClient.delete(`/Order/${id}`),
}
