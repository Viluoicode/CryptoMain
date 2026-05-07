import { apiClient } from './client'
import type { PortfolioSummaryResponse, PortfolioPerformanceResponse } from '@/types'

export async function getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  const { data } = await apiClient.get<PortfolioSummaryResponse>('/Portfolio')
  return data
}

export async function getPortfolioPerformance(): Promise<PortfolioPerformanceResponse> {
  const { data } = await apiClient.get<PortfolioPerformanceResponse>('/Portfolio/performance')
  return data
}
