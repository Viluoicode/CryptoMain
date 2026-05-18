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
  image: string
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

export interface TransferWalletRequest {
  fromWalletId: string
  toWalletId: string
  amount: number
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
  image: string
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
  totalInvested: number
  profitLoss: number
}

// ─── Price Alert ──────────────────────────────────────────────────────────────
// direction: 1 = Above (price >= target), 2 = Below (price <= target)
export type AlertDirection = 1 | 2

export interface PriceAlertResponse {
  id: string
  coinId: string
  coinSymbol: string
  coinName: string
  targetPrice: number
  direction: AlertDirection
  directionDisplay: string
  createdAt: string
}

export interface CreatePriceAlertRequest {
  coinId: string
  coinSymbol: string
  coinName: string
  targetPrice: number
  direction: AlertDirection
}

// ─── Orders (Stop-loss / Take-profit / Limit) ────────────────────────────────
export type OrderSide = 1 | 2       // 1=Buy, 2=Sell
export type OrderType = 1 | 2 | 3  // 1=StopLoss, 2=TakeProfit, 3=Limit
export type OrderStatus = 1 | 2 | 3 | 4 // 1=Pending, 2=Filled, 3=Cancelled, 4=Failed

export interface OrderResponse {
  id: string
  walletId: string
  walletName: string
  coinId: string
  coinSymbol: string
  coinName: string
  side: OrderSide
  type: OrderType
  triggerPrice: number
  quantity: number
  status: OrderStatus
  createdAt: string
  filledAt: string | null
  cancelledAt: string | null
  filledPrice: number | null
  failureReason: string | null
  transactionId: string | null
}

export interface CreateOrderRequest {
  walletId: string
  coinId: string
  side: OrderSide
  type: OrderType
  triggerPrice: number
  quantity: number
}

// ─── Positions (Margin Trading) ───────────────────────────────────────────────
export type PositionSide = 1 | 2   // 1=Long, 2=Short
export type PositionStatus = 1 | 2 | 3 // 1=Open, 2=Closed, 3=Liquidated

export interface PositionResponse {
  id: string
  walletId: string
  walletName: string
  coinId: string
  coinSymbol: string
  coinName: string
  side: PositionSide
  entryPrice: number
  quantity: number
  leverage: number
  collateralAmount: number
  liquidationPrice: number
  status: PositionStatus
  exitPrice: number | null
  realizedPnL: number | null
  closeReason: string | null
  openedAt: string
  closedAt: string | null
  // Live computed (open positions)
  currentPrice: number | null
  unrealizedPnL: number | null
  unrealizedPnLPercentage: number | null
  marginRatio: number | null
}

export interface OpenPositionRequest {
  walletId: string
  coinId: string
  side: PositionSide
  quantity: number
  leverage: number
}

// ─── On-Chain Wallets ─────────────────────────────────────────────────────────
export interface TokenBalance {
  symbol: string
  name: string
  contractAddress: string
  balance: number
  decimals: number
}

export interface OnChainWalletResponse {
  id: string
  address: string
  label: string
  chain: string
  nativeBalance: number
  nativeSymbol: string
  tokens: TokenBalance[]
  createdAt: string
  lastSyncedAt: string | null
}

export interface AddOnChainWalletRequest {
  address: string
  label: string
  chain: string
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export type LeaderboardPeriod = 1 | 2 | 3 // 1=Week, 2=Month, 3=AllTime

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  profitLossPercentage: number
  currentValue: number
  startValue: number
  transactionCount: number
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
  high24h: number
  low24h: number
  sparkline7d?: number[] | null
}
