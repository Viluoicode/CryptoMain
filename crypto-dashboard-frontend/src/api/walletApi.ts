import { apiClient } from './apiClient';

// Matches WalletResponse (camelCase) from GET /api/Wallet
export interface WalletResponse {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletRequest {
  name: string;
}

export const walletApi = {
  getAll: () => apiClient.get<WalletResponse[]>('/api/Wallet'),
  createWallet: (payload: CreateWalletRequest) =>
    apiClient.post<WalletResponse>('/api/Wallet', payload),
};
