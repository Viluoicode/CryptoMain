import type { OpenPositionRequest, PositionResponse } from '../types'
import { apiClient } from './client'

/** Fresh idempotency key per open-position call — defends against double-clicks. */
function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const positionApi = {
  getAll: () => apiClient.get<PositionResponse[]>('/Position').then(r => r.data),
  open: (req: OpenPositionRequest) =>
    apiClient
      .post<PositionResponse>('/Position', req, {
        headers: { 'Idempotency-Key': newIdempotencyKey() },
      })
      .then(r => r.data),
  close: (id: string) => apiClient.delete<PositionResponse>(`/Position/${id}`).then(r => r.data),
}
