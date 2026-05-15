// src/api/priceAlert.ts
import { apiClient } from './client'
import type { PriceAlertResponse, CreatePriceAlertRequest } from '@/types'

const BASE = '/PriceAlert'

export const getAlerts = (): Promise<PriceAlertResponse[]> =>
    apiClient.get<PriceAlertResponse[]>(BASE).then(r => r.data)

export const createAlert = (body: CreatePriceAlertRequest): Promise<PriceAlertResponse> =>
    apiClient.post<PriceAlertResponse>(BASE, body).then(r => r.data)

export const deleteAlert = (id: string): Promise<void> =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined)
