import { create } from 'zustand'
import { queryClient } from '@/main'
import { tokenStorage } from '@/api/client'
import { loginApi, registerApi, logoutApi } from '@/api/auth'
import type { AuthUser, LoginRequest, RegisterRequest } from '@/types/auth'

interface AuthStore {
  // ─── State ─────────────────────────────────────────────────────────────────
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // ─── Actions ────────────────────────────────────────────────────────────────
  login: (body: LoginRequest) => Promise<void>
  register: (body: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUsername: (username: string) => void

  /** Gọi khi app khởi động để rehydrate từ localStorage */
  initialize: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize() {
    const token     = tokenStorage.getAccess()
    const refresh   = tokenStorage.getRefresh()
    const expiresAt = tokenStorage.getExpiry()

    // Nếu có token và refresh token chưa xóa → rehydrate
    // (access token có thể expired, sẽ tự refresh khi gọi API)
    if (token && refresh) {
      // Lưu user info từ JWT payload (decode phần payload)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        set({
          user: {
            username: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? '',
            email:    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? '',
          },
          isAuthenticated: true,
        })
        return
      } catch {
        // Token malformed
        tokenStorage.clear()
      }
    }

    // Nếu không có token hoặc parse lỗi
    set({ user: null, isAuthenticated: false })
    void expiresAt // suppress unused warning
  },

  async login(body) {
    set({ isLoading: true, error: null })
    try {
      const res = await loginApi(body)
      tokenStorage.set(res.accessToken, res.refreshToken, res.expiresAt)
      set({
        user: { username: res.username, email: res.email },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, isLoading: false })
      throw err
    }
  },

  async register(body) {
    set({ isLoading: true, error: null })
    try {
      const res = await registerApi(body)
      tokenStorage.set(res.accessToken, res.refreshToken, res.expiresAt)
      set({
        user: { username: res.username, email: res.email },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout() {
    // Fire-and-forget: revoke server-side refresh token
    logoutApi().catch(() => { /* ignore — we're logging out anyway */ })
    tokenStorage.clear()
    queryClient.clear()
    set({ user: null, isAuthenticated: false, error: null })
  },

  clearError() {
    set({ error: null })
  },

  updateUsername(username) {
    set((state) => ({
      user: state.user ? { ...state.user, username } : null,
    }))
  },
}))

// ─── Helper ──────────────────────────────────────────────────────────────────
function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: { message?: string } } }
    return axiosErr.response?.data?.message ?? 'An error occurred'
  }
  if (err instanceof Error) return err.message
  return 'An error occurred'
}

// ─── Listen for auto-logout event từ axios interceptor ───────────────────────
// Được trigger khi refresh token fail hoàn toàn
window.addEventListener('auth:logout', () => {
  useAuthStore.getState().logout()
})
