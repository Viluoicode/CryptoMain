import { apiClient } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Matches CryptoDashboard.Application.DTOs.Auth.AuthResponse (camelCase from JSON serializer)
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  username: string;
  email: string;
}

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/api/Auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/api/Auth/register', data),
};
