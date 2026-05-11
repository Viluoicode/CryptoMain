// src/api/transaction.ts

import { apiClient } from './client'
import type { TransactionResponse, CreateTransactionRequest } from '@/types'

// ── PagedResult ────────────────────────────────────────────────────────────
export interface PagedResult<T> {
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
    return data.items
}

// Backend dùng enum int: Buy=1, Sell=2
const TYPE_MAP = { Buy: 1, Sell: 2 } as const

export interface TransactionQueryParams {
    page?: number
    pageSize?: number
    type?: 'Buy' | 'Sell'
    search?: string
    sortBy?: string
    sortDir?: 'asc' | 'desc'
}

export async function getAllTransactionsPaged(
    params: TransactionQueryParams = {},
): Promise<PagedResult<TransactionResponse>> {
    const { page = 1, pageSize = 20, type, search, sortBy, sortDir } = params
    const qp: Record<string, unknown> = { page, pageSize }
    if (type) qp.type = TYPE_MAP[type]
    if (search) qp.search = search
    if (sortBy) qp.sortBy = sortBy
    if (sortDir) qp.sortDir = sortDir
    const { data } = await apiClient.get<PagedResult<TransactionResponse>>('/Transaction', { params: qp })
    return data
}

export async function getWalletTransactions(walletId: string): Promise<TransactionResponse[]> {
    const { data } = await apiClient.get<PagedResult<TransactionResponse>>(`/Transaction/wallet/${walletId}`)
    return data.items
}

export async function createTransaction(body: CreateTransactionRequest): Promise<TransactionResponse> {
    const { data } = await apiClient.post<TransactionResponse>('/Transaction', body)
    return data
}

export interface UpdateTransactionRequest {
    type: 1 | 2
    quantity: number
    pricePerCoin: number
    notes?: string
    transactionDate?: string
}

export async function updateTransaction(id: string, body: UpdateTransactionRequest): Promise<TransactionResponse> {
    const { data } = await apiClient.put<TransactionResponse>(`/Transaction/${id}`, body)
    return data
}

export async function deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/Transaction/${id}`)
}