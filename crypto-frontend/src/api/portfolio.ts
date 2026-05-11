import { apiClient } from './client'
import type { PortfolioSummaryResponse, PortfolioPerformanceResponse, PortfolioHistoryPoint } from '@/types'

export async function getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  const { data } = await apiClient.get<PortfolioSummaryResponse>('/Portfolio')
  return data
}

export async function getPortfolioPerformance(): Promise<PortfolioPerformanceResponse> {
  const { data } = await apiClient.get<PortfolioPerformanceResponse>('/Portfolio/performance')
  return data
}

export async function getPortfolioHistory(days = 30): Promise<PortfolioHistoryPoint[]> {
  const { data } = await apiClient.get<PortfolioHistoryPoint[]>('/Portfolio/history', { params: { days } })
  return data
}
