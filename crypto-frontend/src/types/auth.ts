// ─── Auth ────────────────────────────────────────────────────────────────────
// Maps to: AuthResponse.cs
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string   // ISO datetime string từ C# DateTime
  username: string
  email: string
}

// Maps to: LoginRequest.cs
export interface LoginRequest {
  email: string
  password: string
}

// Maps to: RegisterRequest.cs
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// Maps to: RefreshTokenRequest.cs
export interface RefreshTokenRequest {
  refreshToken: string
}

// ─── Auth Store State ────────────────────────────────────────────────────────
export interface AuthUser {
  username: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  isAuthenticated: boolean
}

// ─── API Error ───────────────────────────────────────────────────────────────
// Matches GlobalExceptionHandlerMiddleware response shape
export interface ApiError {
  message: string
  statusCode?: number
}
