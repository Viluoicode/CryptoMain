import { apiClient } from './apiClient';

// Matches WalletResponse (camelCase) from GET /api/Wallet
export interface WalletResponse {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const walletApi = {
  getAll: () => apiClient.get<WalletResponse[]>('/api/Wallet'),
};
