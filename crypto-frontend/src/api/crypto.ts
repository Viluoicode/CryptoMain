import { apiClient } from './client'
import type { CryptoListResponse } from '@/types'

export async function getTopCryptos(limit = 50): Promise<CryptoListResponse[]> {
  const { data } = await apiClient.get<CryptoListResponse[]>('/Crypto/top', {
    params: { limit },
  })
  return data
}

export async function getCryptoById(coinId: string): Promise<CryptoListResponse> {
  const { data } = await apiClient.get<CryptoListResponse>(`/Crypto/${coinId}`)
  return data
}
export async function getCoinHistory(coinId: string, days: number) {
    const { data } = await apiClient.get(`/Crypto/${coinId}/history`, { params: { days } })
    return data
}