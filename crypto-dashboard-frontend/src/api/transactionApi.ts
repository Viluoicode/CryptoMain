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

// Matches CreateTransactionRequest for POST /api/Transaction
export interface CreateTransactionRequest {
  walletId: string;
  coinId: string;
  type: TransactionType; // 1 = Buy, 2 = Sell
  quantity: number;
  pricePerCoin: number;
  notes?: string;
  transactionDate?: string;
}

export const transactionApi = {
  getAll: () => apiClient.get<TransactionResponse[]>('/api/Transaction'),
  create: (data: CreateTransactionRequest) =>
    apiClient.post<TransactionResponse>('/api/Transaction', data),
};
