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

// POST /api/auth/change-password
export async function changePasswordApi(body: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  await apiClient.post('/auth/change-password', body)
}

// POST /api/auth/logout — revoke refresh token server-side
export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout')
}

// PUT /api/auth/profile — cập nhật tên hiển thị
export async function updateProfileApi(body: { username: string }): Promise<void> {
  await apiClient.put('/auth/profile', body)
}
