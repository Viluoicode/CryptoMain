import type { OpenPositionRequest, PositionResponse } from '../types'
import { apiClient } from './client'

export const positionApi = {
  getAll: () => apiClient.get<PositionResponse[]>('/Position').then(r => r.data),
  open: (req: OpenPositionRequest) => apiClient.post<PositionResponse>('/Position', req).then(r => r.data),
  close: (id: string) => apiClient.delete<PositionResponse>(`/Position/${id}`).then(r => r.data),
}
