// src/api/transaction.ts

import { apiClient } from './client'
import type { TransactionResponse, CreateTransactionRequest } from '@/types'

// ── Thêm type PagedResult ──
interface PagedResult<T> {
    items: T[]
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
}

export async function getTransactions(): Promise<TransactionResponse[]> {
    const { data } = await apiClient.get<PagedResult<TransactionResponse>>('/Transaction')
    return data.items  // ← lấy items từ PagedResult
}

export async function getWalletTransactions(walletId: string): Promise<TransactionResponse[]> {
    const { data } = await apiClient.get<PagedResult<TransactionResponse>>(`/Transaction/wallet/${walletId}`)
    return data.items  // ← thêm .items vào đây nữa
}

export async function createTransaction(body: CreateTransactionRequest): Promise<TransactionResponse> {
    const { data } = await apiClient.post<TransactionResponse>('/Transaction', body)
    return data
}

export async function deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/Transaction/${id}`)
}