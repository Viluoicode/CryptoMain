// ─── Wallet ──────────────────────────────────────────────────────────────────
export interface WalletResponse {
  id: string
  name: string
  userId: string
  fiatBalance: number
  createdAt: string
  updatedAt: string
}

export interface HoldingResponse {
  coinId: string
  coinSymbol: string
  coinName: string
  quantity: number
  averageBuyPrice: number
  currentPrice: number
  currentValue: number
  profitLoss: number
  profitLossPercentage: number
}

export interface WalletDetailResponse {
  id: string
  name: string
  fiatBalance: number
  createdAt: string
  updatedAt: string
  holdings: HoldingResponse[]
  totalValue: number
  transactionCount: number
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItemResponse {
  id: string
  coinId: string
  coinSymbol: string
  createdAt: string
}

export interface AddWatchlistRequest {
  coinId: string
  coinSymbol: string
}

export interface CreateWalletRequest {
  name: string
}

export interface UpdateWalletRequest {
  name: string
}

// ─── Transaction ─────────────────────────────────────────────────────────────
// type: 1 = Buy, 2 = Sell  (C# enum TransactionType)
export type TransactionType = 1 | 2

export interface TransactionResponse {
  id: string
  walletId: string
  walletName: string
  coinId: string
  coinSymbol: string
  coinName: string
  type: TransactionType
  typeDisplay: string
  quantity: number
  pricePerCoin: number
  totalAmount: number
  transactionDate: string
  notes: string | null
}

export interface CreateTransactionRequest {
  walletId: string
  coinId: string
  type: TransactionType
  quantity: number
  pricePerCoin: number
  notes?: string
  transactionDate?: string
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export interface PortfolioCoinAllocation {
  coinId: string
  coinSymbol: string
  coinName: string
  quantity: number
  currentPrice: number
  currentValue: number
  investedValue: number
  allocationPercentage: number
}

export interface PortfolioSummaryResponse {
  walletCount: number
  totalTransactionCount: number
  totalCurrentValue: number
  totalInvestedValue: number
  totalProfitLoss: number
  totalProfitLossPercentage: number
  allocations: PortfolioCoinAllocation[]
}

export interface PortfolioPerformanceResponse {
  totalBuyAmount: number
  totalSellAmount: number
  netInvested: number
  currentPortfolioValue: number
  unrealizedProfitLoss: number
  unrealizedProfitLossPercentage: number
  totalBuyTransactions: number
  totalSellTransactions: number
}

// ─── Portfolio History ────────────────────────────────────────────────────────
export interface PortfolioHistoryPoint {
  date: string
  totalValue: number
}

// ─── Crypto ───────────────────────────────────────────────────────────────────
export interface CryptoListResponse {
  id: string
  symbol: string
  name: string
  image: string
  currentPrice: number
  priceChangePercentage24h: number
  marketCap: number
  totalVolume: number
}
