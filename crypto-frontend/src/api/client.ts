import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7103'

// ─── Axios instance ──────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  // Bỏ qua SSL self-signed cert trong dev (không cần nếu dùng https-proxy)
})

// ─── Token storage helpers ───────────────────────────────────────────────────
const TOKEN_KEY   = 'crypto_access_token'
const REFRESH_KEY = 'crypto_refresh_token'
const EXPIRES_KEY = 'crypto_expires_at'

export const tokenStorage = {
  getAccess:     () => localStorage.getItem(TOKEN_KEY),
  getRefresh:    () => localStorage.getItem(REFRESH_KEY),
  getExpiry:     () => localStorage.getItem(EXPIRES_KEY),

  set(accessToken: string, refreshToken: string, expiresAt: string) {
    localStorage.setItem(TOKEN_KEY,   accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(EXPIRES_KEY, expiresAt)
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  },

  isExpired(): boolean {
    const exp = localStorage.getItem(EXPIRES_KEY)
    if (!exp) return true
    // Thêm buffer 30s để refresh trước khi thực sự hết hạn
    return new Date(exp).getTime() - 30_000 < Date.now()
  },
}

// ─── Request interceptor: đính kèm Bearer token ──────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth endpoints
    const isAuthEndpoint = config.url?.startsWith('/auth')
    if (isAuthEndpoint) return config

    const token = tokenStorage.getAccess()
    if (!token) return config

    // Nếu token sắp hết hạn → thử refresh trước khi gửi request
    if (tokenStorage.isExpired()) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        config.headers.Authorization = `Bearer ${tokenStorage.getAccess()}`
        return config
      }
      // Refresh fail → logout sẽ được xử lý ở response interceptor
      return config
    }

    config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor: handle 401 ────────────────────────────────────────
let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processPendingQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đưa vào queue chờ token mới
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshed = await tryRefreshToken()
        if (!refreshed) throw new Error('Refresh failed')

        const newToken = tokenStorage.getAccess()!
        processPendingQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processPendingQueue(refreshError, null)
        tokenStorage.clear()
        // Dispatch custom event để AuthStore biết logout
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ─── Refresh token helper ────────────────────────────────────────────────────
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return false

  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const data = response.data
    tokenStorage.set(data.accessToken, data.refreshToken, data.expiresAt)
    return true
  } catch {
    return false
  }
}
