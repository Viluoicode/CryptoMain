// src/hooks/useWallet.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWallets, getWalletById, createWallet, updateWallet, deleteWallet } from '@/api/wallet'
import type { CreateWalletRequest, UpdateWalletRequest } from '@/types'

export const walletKeys = {
    all: ['wallets'] as const,
    detail: (id: string) => ['wallets', id] as const,
}

export function useWallets() {
    return useQuery({ queryKey: walletKeys.all, queryFn: getWallets })
}

export function useWalletDetail(id: string) {
    return useQuery({
        queryKey: walletKeys.detail(id),
        queryFn: () => getWalletById(id),
        enabled: !!id,
    })
}

export function useCreateWallet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (req: CreateWalletRequest) => createWallet(req),
        onSuccess: () => qc.invalidateQueries({ queryKey: walletKeys.all }),
    })
}

export function useUpdateWallet(walletId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (req: UpdateWalletRequest) => updateWallet(walletId, req),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: walletKeys.all })
            qc.invalidateQueries({ queryKey: walletKeys.detail(walletId) })
        },
    })
}

export function useDeleteWallet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteWallet(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: walletKeys.all }),
    })
}