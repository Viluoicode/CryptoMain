
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getWalletTransactions, getAllTransactionsPaged,
    createTransaction, updateTransaction, deleteTransaction,
} from '@/api/transaction'
import type { UpdateTransactionRequest, TransactionQueryParams } from '@/api/transaction'
import type { CreateTransactionRequest } from '@/types'
import { walletKeys } from './useWallet'

export const txKeys = {
    all: ['transactions'] as const,
    paged: (params: TransactionQueryParams) =>
        ['transactions', 'paged', params] as const,
    byWallet: (walletId: string) => ['transactions', 'wallet', walletId] as const,
}

// ── All transactions (paginated + filter + search + sort) ─────────────────
export function useAllTransactions(params: TransactionQueryParams = {}) {
    return useQuery({
        queryKey: txKeys.paged(params),
        queryFn: () => getAllTransactionsPaged(params),
        placeholderData: (prev) => prev,  // keep old data while fetching
    })
}

// ── Wallet transactions ────────────────────────────────────────────────────
export function useWalletTransactions(walletId: string) {
    return useQuery({
        queryKey: txKeys.byWallet(walletId),
        queryFn: () => getWalletTransactions(walletId),
        enabled: !!walletId,
    })
}

// ── Create ─────────────────────────────────────────────────────────────────
export function useCreateTransaction() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (req: CreateTransactionRequest) => createTransaction(req),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: txKeys.byWallet(variables.walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.detail(variables.walletId) })
            qc.invalidateQueries({ queryKey: walletKeys.all })
            qc.invalidateQueries({ queryKey: ['portfolio'] })
            qc.invalidateQueries({ queryKey: txKeys.all })
        },
    })
}

// ── Update ─────────────────────────────────────────────────────────────────
export function useUpdateTransaction(walletId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, req }: { id: string; req: UpdateTransactionRequest }) =>
            updateTransaction(id, req),
        onSuccess: () => {
            if (walletId) {
                qc.invalidateQueries({ queryKey: txKeys.byWallet(walletId) })
                qc.invalidateQueries({ queryKey: walletKeys.detail(walletId) })
            }
            qc.invalidateQueries({ queryKey: walletKeys.all })
            qc.invalidateQueries({ queryKey: ['portfolio'] })
            qc.invalidateQueries({ queryKey: txKeys.all })
        },
    })
}

// ── Delete ─────────────────────────────────────────────────────────────────
export function useDeleteTransaction(walletId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (transactionId: string) => deleteTransaction(transactionId),
        onSuccess: () => {
            if (walletId) {
                qc.invalidateQueries({ queryKey: txKeys.byWallet(walletId) })
                qc.invalidateQueries({ queryKey: walletKeys.detail(walletId) })
            }
            qc.invalidateQueries({ queryKey: walletKeys.all })
            qc.invalidateQueries({ queryKey: ['portfolio'] })
            qc.invalidateQueries({ queryKey: txKeys.all })
        },
    })
}
