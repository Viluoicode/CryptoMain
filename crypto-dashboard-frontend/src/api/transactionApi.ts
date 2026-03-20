import { apiClient } from './apiClient';

// TransactionType mirrors the C# enum: Buy = 1, Sell = 2
export type TransactionType = 1 | 2;

// Matches TransactionResponse (camelCase) from GET /api/Transaction
export interface TransactionResponse {
  id: string;
  walletId: string;
  walletName: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  type: TransactionType;
  quantity: number;
  pricePerCoin: number;
  totalAmount: number;
  transactionDate: string;
  notes: string | null;
}

export const transactionApi = {
  getAll: () => apiClient.get<TransactionResponse[]>('/api/Transaction'),
};
