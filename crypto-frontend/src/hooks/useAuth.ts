import { useAuthStore } from '@/store/authStore'

/**
 * Convenience hook — trả về auth state và actions.
 * Dùng ở bất kỳ component nào cần auth.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */
export function useAuth() {
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)
  const error           = useAuthStore((s) => s.error)
  const login           = useAuthStore((s) => s.login)
  const register        = useAuthStore((s) => s.register)
  const logout          = useAuthStore((s) => s.logout)
  const clearError      = useAuthStore((s) => s.clearError)

  return { user, isAuthenticated, isLoading, error, login, register, logout, clearError }
}
