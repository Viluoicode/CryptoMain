import { apiClient } from './apiClient';

// Matches PortfolioCoinAllocationResponse (camelCase)
export interface PortfolioCoinAllocation {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  investedValue: number;
  allocationPercentage: number;
}

// Matches PortfolioSummaryResponse (camelCase)
export interface PortfolioSummary {
  walletCount: number;
  totalTransactionCount: number;
  totalCurrentValue: number;
  totalInvestedValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  allocations: PortfolioCoinAllocation[];
}

// Matches PortfolioPerformanceResponse (camelCase)
export interface PortfolioPerformance {
  totalBuyAmount: number;
  totalSellAmount: number;
  netInvested: number;
  currentPortfolioValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercentage: number;
  totalBuyTransactions: number;
  totalSellTransactions: number;
}

export const portfolioApi = {
  getSummary: () => apiClient.get<PortfolioSummary>('/api/Portfolio'),
  getPerformance: () => apiClient.get<PortfolioPerformance>('/api/Portfolio/performance'),
};
