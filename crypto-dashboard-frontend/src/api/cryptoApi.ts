import { apiClient } from './apiClient';

export interface CryptoListResponse {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  marketCap: number;
  totalVolume: number;
}

export const cryptoApi = {
  getTop: (limit = 10) =>
    apiClient.get<CryptoListResponse[]>(`/api/Crypto/top?limit=${limit}`),
  getById: (coinId: string) =>
    apiClient.get<CryptoListResponse>(`/api/Crypto/${coinId}`),
};
