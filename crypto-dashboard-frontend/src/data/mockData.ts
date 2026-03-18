import type { NavItem, UserProfile, CryptoHolding, Transaction } from '../types';

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
  { id: 'portfolio', label: 'Portfolio', icon: '◑', path: '/portfolio' },
  { id: 'wallets', label: 'Wallets', icon: '◈', path: '/wallets' },
  { id: 'transactions', label: 'Transactions', icon: '⇄', path: '/transactions' },
  { id: 'market', label: 'Crypto Market', icon: '◉', path: '/market' },
  { id: 'settings', label: 'Settings', icon: '⚙', path: '/settings' },
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
  },
];
