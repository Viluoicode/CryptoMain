import type {
  NavItem,
  UserProfile,
  CryptoHolding,
  Transaction,
  PortfolioDataPoint,
  AssetDistribution,
  MarketCoin,
  WatchlistItem,
  NotificationSettings,
} from '../types';

export const mockUser: UserProfile = {
  name: 'Alex Johnson',
  email: 'alex@cryptodash.io',
  avatarInitials: 'AJ',
  totalBalance: 48_732.58,
  balanceChange: 1_842.30,
  balanceChangePercent: 3.93,
};

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/' },
  { id: 'analytics', label: 'Analytics', icon: '◑', path: '/analytics' },
  { id: 'market', label: 'Market', icon: '◉', path: '/market' },
  { id: 'transactions', label: 'Transactions', icon: '⇄', path: '/transactions' },
  { id: 'profile', label: 'Profile', icon: '⚙', path: '/profile' },
];

export const mockHoldings: CryptoHolding[] = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.52,
    currentPrice: 43_250.00,
    totalValue: 22_490.00,
    change24h: 2.34,
    iconColor: '#F7931A',
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    quantity: 4.15,
    currentPrice: 2_890.50,
    totalValue: 11_995.58,
    change24h: -1.12,
    iconColor: '#627EEA',
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    quantity: 68.0,
    currentPrice: 105.80,
    totalValue: 7_194.40,
    change24h: 5.67,
    iconColor: '#9945FF',
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    quantity: 8_500.0,
    currentPrice: 0.812,
    totalValue: 6_902.00,
    change24h: -0.88,
    iconColor: '#0033AD',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'Buy',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 0.25,
    price: 42_800.00,
    total: 10_700.00,
    date: '2026-03-15',
    status: 'Completed',
    iconColor: '#F7931A',
  },
  {
    id: '2',
    type: 'Sell',
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    quantity: 1.0,
    price: 2_950.00,
    total: 2_950.00,
    date: '2026-03-12',
    status: 'Completed',
    iconColor: '#627EEA',
  },
  {
    id: '3',
    type: 'Buy',
    coinSymbol: 'SOL',
    coinName: 'Solana',
    quantity: 20.0,
    price: 102.50,
    total: 2_050.00,
    date: '2026-03-10',
    status: 'Completed',
    iconColor: '#9945FF',
  },
  {
    id: '4',
    type: 'Transfer',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 0.05,
    price: 43_100.00,
    total: 2_155.00,
    date: '2026-03-08',
    status: 'Pending',
    iconColor: '#F7931A',
  },
  {
    id: '5',
    type: 'Sell',
    coinSymbol: 'ADA',
    coinName: 'Cardano',
    quantity: 1_200.0,
    price: 0.81,
    total: 972.00,
    date: '2026-03-05',
    status: 'Completed',
    iconColor: '#0033AD',
  },
  {
    id: '6',
    type: 'Buy',
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    quantity: 0.5,
    price: 2_820.00,
    total: 1_410.00,
    date: '2026-03-01',
    status: 'Failed',
    iconColor: '#627EEA',
  },
  {
    id: '7',
    type: 'Buy',
    coinSymbol: 'ADA',
    coinName: 'Cardano',
    quantity: 5_000.0,
    price: 0.79,
    total: 3_950.00,
    date: '2026-02-25',
    status: 'Completed',
    iconColor: '#0033AD',
  },
  {
    id: '8',
    type: 'Sell',
    coinSymbol: 'SOL',
    coinName: 'Solana',
    quantity: 10.0,
    price: 98.40,
    total: 984.00,
    date: '2026-02-20',
    status: 'Completed',
    iconColor: '#9945FF',
  },
];

// --- Analytics Page Data ---

function generatePortfolioData(days: number, baseValue: number): PortfolioDataPoint[] {
  const data: PortfolioDataPoint[] = [];
  const now = new Date('2026-03-18');
  let value = baseValue * 0.7;
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const change = (Math.random() - 0.42) * (baseValue * 0.04);
    value = Math.max(baseValue * 0.4, value + change);
    const label =
      days <= 1
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data.push({ date: label, value: Math.round(value * 100) / 100 });
  }
  return data;
}

export const portfolioHistory: Record<string, PortfolioDataPoint[]> = {
  '1D': generatePortfolioData(1, 48_732),
  '1W': generatePortfolioData(7, 48_732),
  '1M': generatePortfolioData(30, 48_732),
  '3M': generatePortfolioData(90, 48_732),
  '1Y': generatePortfolioData(365, 48_732),
  'ALL': generatePortfolioData(730, 48_732),
};

export const assetDistribution: AssetDistribution[] = [
  { name: 'Bitcoin', symbol: 'BTC', value: 22_490.00, percentage: 46.1, color: '#F7931A' },
  { name: 'Ethereum', symbol: 'ETH', value: 11_995.58, percentage: 24.6, color: '#627EEA' },
  { name: 'Solana', symbol: 'SOL', value: 7_194.40, percentage: 14.8, color: '#9945FF' },
  { name: 'Cardano', symbol: 'ADA', value: 6_902.00, percentage: 14.2, color: '#0033AD' },
  { name: 'Others', symbol: '—', value: 150.60, percentage: 0.3, color: '#64748B' },
];

export const tokenPerformance = [
  { symbol: 'BTC', name: 'Bitcoin', change7d: 8.42, change30d: 15.7, iconColor: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', change7d: -3.12, change30d: 7.3, iconColor: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', change7d: 12.55, change30d: 28.4, iconColor: '#9945FF' },
  { symbol: 'ADA', name: 'Cardano', change7d: -1.44, change30d: -4.2, iconColor: '#0033AD' },
];

// --- Market Page Data ---

function generateSparkline(base: number, points = 10): number[] {
  const data: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    v = v + (Math.random() - 0.48) * base * 0.03;
    data.push(Math.round(v * 100) / 100);
  }
  return data;
}

export const marketCoins: MarketCoin[] = [
  {
    id: 'bitcoin', rank: 1, name: 'Bitcoin', symbol: 'BTC', iconColor: '#F7931A',
    price: 43_250.00, change1h: 0.12, change24h: 2.34, change7d: 8.42,
    marketCap: 847_000_000_000, volume24h: 28_400_000_000,
    sparkline: generateSparkline(43_250, 10), inWatchlist: true,
  },
  {
    id: 'ethereum', rank: 2, name: 'Ethereum', symbol: 'ETH', iconColor: '#627EEA',
    price: 2_890.50, change1h: -0.08, change24h: -1.12, change7d: -3.12,
    marketCap: 347_000_000_000, volume24h: 14_200_000_000,
    sparkline: generateSparkline(2_890, 10), inWatchlist: true,
  },
  {
    id: 'tether', rank: 3, name: 'Tether', symbol: 'USDT', iconColor: '#26A17B',
    price: 1.00, change1h: 0.01, change24h: 0.02, change7d: -0.01,
    marketCap: 112_000_000_000, volume24h: 62_000_000_000,
    sparkline: generateSparkline(1, 10), inWatchlist: false,
  },
  {
    id: 'binancecoin', rank: 4, name: 'BNB', symbol: 'BNB', iconColor: '#F3BA2F',
    price: 418.30, change1h: 0.45, change24h: 1.87, change7d: 5.21,
    marketCap: 61_000_000_000, volume24h: 2_100_000_000,
    sparkline: generateSparkline(418, 10), inWatchlist: false,
  },
  {
    id: 'solana', rank: 5, name: 'Solana', symbol: 'SOL', iconColor: '#9945FF',
    price: 105.80, change1h: 1.22, change24h: 5.67, change7d: 12.55,
    marketCap: 47_000_000_000, volume24h: 3_800_000_000,
    sparkline: generateSparkline(105, 10), inWatchlist: true,
  },
  {
    id: 'xrp', rank: 6, name: 'XRP', symbol: 'XRP', iconColor: '#346AA9',
    price: 0.582, change1h: -0.31, change24h: -0.74, change7d: 2.11,
    marketCap: 32_000_000_000, volume24h: 1_500_000_000,
    sparkline: generateSparkline(0.58, 10), inWatchlist: false,
  },
  {
    id: 'cardano', rank: 7, name: 'Cardano', symbol: 'ADA', iconColor: '#0033AD',
    price: 0.812, change1h: -0.15, change24h: -0.88, change7d: -1.44,
    marketCap: 28_000_000_000, volume24h: 980_000_000,
    sparkline: generateSparkline(0.81, 10), inWatchlist: true,
  },
  {
    id: 'avalanche', rank: 8, name: 'Avalanche', symbol: 'AVAX', iconColor: '#E84142',
    price: 38.90, change1h: 0.88, change24h: 3.15, change7d: 7.82,
    marketCap: 16_000_000_000, volume24h: 720_000_000,
    sparkline: generateSparkline(38, 10), inWatchlist: false,
  },
];

export const watchlistItems: WatchlistItem[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', iconColor: '#F7931A', price: 43_250.00, change24h: 2.34 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', iconColor: '#627EEA', price: 2_890.50, change24h: -1.12 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', iconColor: '#9945FF', price: 105.80, change24h: 5.67 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', iconColor: '#0033AD', price: 0.812, change24h: -0.88 },
];

// --- Profile Page Data ---

export const mockNotificationSettings: NotificationSettings = {
  priceAlerts: true,
  portfolioUpdates: true,
  transactionConfirmations: true,
  weeklyReport: false,
  securityAlerts: true,
  marketNews: false,
};
