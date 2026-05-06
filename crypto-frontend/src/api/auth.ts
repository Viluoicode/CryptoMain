import { apiClient } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'

// POST /api/auth/login
export async function loginApi(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', body)
  return data
}

// POST /api/auth/register
export async function registerApi(body: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', body)
  return data
}

// POST /api/auth/refresh — dùng nội bộ trong client.ts, nhưng export để dùng nếu cần
export async function refreshTokenApi(refreshToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken })
  return data
}
