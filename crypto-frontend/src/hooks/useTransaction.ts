
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWalletTransactions, createTransaction, deleteTransaction } from '@/api/transaction'
import type { CreateTransactionRequest } from '@/types'
import { walletKeys } from './useWallet'

export const txKeys = {
    byWallet: (walletId: string) => ['transactions', 'wallet', walletId] as const,
}

export function useWalletTransactions(walletId: string) {
    return useQuery({
        queryKey: txKeys.byWallet(walletId),
        queryFn: () => getWalletTransactions(walletId),
        enabled: !!walletId,
    })
}

export function useCreateTransaction() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (req: CreateTransactionRequest) => createTransaction(req),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: txKeys.byWallet(variables.walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.detail(variables.walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.all })
            // Invalidate dashboard queries
            qc.invalidateQueries({ queryKey: ['portfolio'] })
            qc.invalidateQueries({ queryKey: ['transactions'] })
        },
    })
}

export function useDeleteTransaction(walletId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (transactionId: string) => deleteTransaction(transactionId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: txKeys.byWallet(walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.detail(walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.all })
            qc.invalidateQueries({ queryKey: ['portfolio'] })
            qc.invalidateQueries({ queryKey: ['transactions'] })
        },
    })
}