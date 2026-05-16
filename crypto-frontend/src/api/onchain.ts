import type { AddOnChainWalletRequest, OnChainWalletResponse } from '../types'
import { apiClient } from './client'

export const onchainApi = {
  getAll: () => apiClient.get<OnChainWalletResponse[]>('/OnChainWallet').then(r => r.data),
  add: (req: AddOnChainWalletRequest) =>
    apiClient.post<OnChainWalletResponse>('/OnChainWallet', req).then(r => r.data),
  sync: (id: string) =>
    apiClient.post<OnChainWalletResponse>(`/OnChainWallet/${id}/sync`).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/OnChainWallet/${id}`),
}
