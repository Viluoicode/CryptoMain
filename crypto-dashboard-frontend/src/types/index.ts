export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarInitials: string;
  totalBalance: number;
  balanceChange: number;
  balanceChangePercent: number;
}

export interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  change24h: number;
  iconColor: string;
}

export interface Transaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Transfer';
  coinSymbol: string;
  coinName: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Failed';
  iconColor: string;
}

export interface PortfolioDataPoint {
  date: string;
  value: number;
}

export interface AssetDistribution {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

export interface MarketCoin {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  iconColor: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  sparkline: number[];
  inWatchlist: boolean;
}

export interface WatchlistItem {
  id: string;
  name: string;
  symbol: string;
  iconColor: string;
  price: number;
  change24h: number;
}

export interface NotificationSettings {
  priceAlerts: boolean;
  portfolioUpdates: boolean;
  transactionConfirmations: boolean;
  weeklyReport: boolean;
  securityAlerts: boolean;
  marketNews: boolean;
}
