import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { onchainApi } from '../api/onchain'
import type { AddOnChainWalletRequest } from '../types'

export function useOnChainWallets() {
  return useQuery({ queryKey: ['onchain-wallets'], queryFn: onchainApi.getAll })
}

export function useAddOnChainWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: AddOnChainWalletRequest) => onchainApi.add(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onchain-wallets'] }),
  })
}

export function useSyncOnChainWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => onchainApi.sync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onchain-wallets'] }),
  })
}

export function useRemoveOnChainWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => onchainApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onchain-wallets'] }),
  })
}
