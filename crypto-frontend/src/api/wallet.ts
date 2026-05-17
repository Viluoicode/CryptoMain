import { apiClient } from './client'
import type {
  WalletResponse,
  WalletDetailResponse,
  CreateWalletRequest,
  UpdateWalletRequest,
  TransferWalletRequest,
} from '@/types'

export async function getWallets(): Promise<WalletResponse[]> {
  const { data } = await apiClient.get<WalletResponse[]>('/Wallet')
  return data
}

export async function getWalletById(id: string): Promise<WalletDetailResponse> {
  const { data } = await apiClient.get<WalletDetailResponse>(`/Wallet/${id}`)
  return data
}

export async function createWallet(body: CreateWalletRequest): Promise<WalletResponse> {
  const { data } = await apiClient.post<WalletResponse>('/Wallet', body)
  return data
}

export async function updateWallet(id: string, body: UpdateWalletRequest): Promise<WalletResponse> {
  const { data } = await apiClient.put<WalletResponse>(`/Wallet/${id}`, body)
  return data
}

export async function deleteWallet(id: string): Promise<void> {
  await apiClient.delete(`/Wallet/${id}`)
}

export async function depositFiat(id: string, amount: number): Promise<WalletResponse> {
  const { data } = await apiClient.post<WalletResponse>(`/Wallet/${id}/deposit`, { amount })
  return data
}

export async function transferFunds(body: TransferWalletRequest): Promise<void> {
  await apiClient.post('/Wallet/transfer', body)
}
