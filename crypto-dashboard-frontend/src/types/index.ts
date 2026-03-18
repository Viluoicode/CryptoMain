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
  type: 'Buy' | 'Sell';
  coinSymbol: string;
  coinName: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
}
