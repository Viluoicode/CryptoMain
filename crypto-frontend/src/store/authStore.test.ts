/**
 * Unit tests cho authStore (Zustand).
 *
 * Chiến lược mock:
 * - @/main          → mock queryClient để tránh import vite entry-point
 * - @/api/auth      → mock loginApi / registerApi để kiểm soát response
 * - @/api/client    → tokenStorage dùng thật (jsdom cung cấp localStorage)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock @/main trước khi import authStore ────────────────────────────────────
vi.mock('@/main', () => ({
  queryClient: { clear: vi.fn() },
}))

// ── Mock API functions ────────────────────────────────────────────────────────
vi.mock('@/api/auth', () => ({
  loginApi:    vi.fn(),
  registerApi: vi.fn(),
}))

import { useAuthStore }         from './authStore'
import { loginApi, registerApi } from '@/api/auth'
import { tokenStorage }          from '@/api/client'
import { queryClient }           from '@/main'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Tạo một JWT giả (chỉ cần decode được payload) */
function makeFakeJwt(username: string, email: string): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name':         username,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': email,
    }),
  )
  return `${header}.${payload}.fake-signature`
}

const FAKE_JWT     = makeFakeJwt('alice', 'alice@test.com')
const FUTURE_EXPIRY = new Date(Date.now() + 15 * 60 * 1000).toISOString()

const FAKE_AUTH_RESPONSE = {
  accessToken:  FAKE_JWT,
  refreshToken: 'refresh-token-123',
  expiresAt:    FUTURE_EXPIRY,
  username:     'alice',
  email:        'alice@test.com',
}

// ── Reset state giữa các test ─────────────────────────────────────────────────
beforeEach(() => {
  // Reset Zustand store về trạng thái ban đầu
  useAuthStore.setState({
    user:            null,
    isAuthenticated: false,
    isLoading:       false,
    error:           null,
  })

  // Xóa localStorage
  localStorage.clear()

  // Reset mocks
  vi.clearAllMocks()
})

// ══════════════════════════════════════════════════════════════════════════════
//  initialize()
// ══════════════════════════════════════════════════════════════════════════════

describe('initialize()', () => {
  it('khởi động với user=null khi không có token', () => {
    useAuthStore.getState().initialize()

    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('rehydrate user từ JWT hợp lệ trong localStorage', () => {
    tokenStorage.set(FAKE_JWT, 'refresh-token', FUTURE_EXPIRY)

    useAuthStore.getState().initialize()

    const { user, isAuthenticated } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(user?.username).toBe('alice')
    expect(user?.email).toBe('alice@test.com')
  })

  it('xóa token và set unauthenticated khi JWT bị malformed', () => {
    localStorage.setItem('crypto_access_token',  'bad.token')
    localStorage.setItem('crypto_refresh_token', 'refresh')
    localStorage.setItem('crypto_expires_at',    FUTURE_EXPIRY)

    useAuthStore.getState().initialize()

    const { user, isAuthenticated } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
    expect(tokenStorage.getAccess()).toBeNull()
  })

  it('không rehydrate khi chỉ có access token nhưng thiếu refresh token', () => {
    localStorage.setItem('crypto_access_token', FAKE_JWT)
    // Không có refresh token

    useAuthStore.getState().initialize()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
//  login()
// ══════════════════════════════════════════════════════════════════════════════

describe('login()', () => {
  it('đăng nhập thành công: set user và isAuthenticated=true', async () => {
    vi.mocked(loginApi).mockResolvedValue(FAKE_AUTH_RESPONSE)

    await useAuthStore.getState().login({ email: 'alice@test.com', password: 'pass' })

    const { user, isAuthenticated, isLoading } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(isLoading).toBe(false)
    expect(user?.username).toBe('alice')
    expect(user?.email).toBe('alice@test.com')
  })

  it('đăng nhập thành công: lưu token vào localStorage', async () => {
    vi.mocked(loginApi).mockResolvedValue(FAKE_AUTH_RESPONSE)

    await useAuthStore.getState().login({ email: 'alice@test.com', password: 'pass' })

    expect(tokenStorage.getAccess()).toBe(FAKE_JWT)
    expect(tokenStorage.getRefresh()).toBe('refresh-token-123')
  })

  it('set isLoading=true trong lúc đang gọi API', async () => {
    let resolveLogin!: (v: typeof FAKE_AUTH_RESPONSE) => void
    vi.mocked(loginApi).mockReturnValue(
      new Promise<typeof FAKE_AUTH_RESPONSE>((res) => { resolveLogin = res })
    )

    const loginPromise = useAuthStore.getState().login({ email: 'a', password: 'p' })
    expect(useAuthStore.getState().isLoading).toBe(true)

    resolveLogin(FAKE_AUTH_RESPONSE)
    await loginPromise
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('đăng nhập thất bại: set error message và không set user', async () => {
    const axiosError = {
      response: { data: { message: 'Invalid email or password' } },
    }
    vi.mocked(loginApi).mockRejectedValue(axiosError)

    await expect(
      useAuthStore.getState().login({ email: 'x@x.com', password: 'wrong' })
    ).rejects.toBeDefined()

    const { user, isAuthenticated, error, isLoading } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(error).toBe('Invalid email or password')
    expect(isLoading).toBe(false)
  })

  it('đăng nhập thất bại: re-throw error để component xử lý', async () => {
    vi.mocked(loginApi).mockRejectedValue(new Error('Network error'))

    await expect(
      useAuthStore.getState().login({ email: 'x', password: 'y' })
    ).rejects.toThrow('Network error')
  })

  it('gọi loginApi với đúng body', async () => {
    vi.mocked(loginApi).mockResolvedValue(FAKE_AUTH_RESPONSE)

    await useAuthStore.getState().login({ email: 'test@example.com', password: 'secret' })

    expect(loginApi).toHaveBeenCalledWith({
      email:    'test@example.com',
      password: 'secret',
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
//  register()
// ══════════════════════════════════════════════════════════════════════════════

describe('register()', () => {
  it('đăng ký thành công: set user và isAuthenticated=true', async () => {
    vi.mocked(registerApi).mockResolvedValue(FAKE_AUTH_RESPONSE)

    await useAuthStore.getState().register({
      username: 'alice',
      email:    'alice@test.com',
      password: 'P@ss1',
    })

    const { user, isAuthenticated } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(user?.username).toBe('alice')
  })

  it('đăng ký thành công: lưu token vào localStorage', async () => {
    vi.mocked(registerApi).mockResolvedValue(FAKE_AUTH_RESPONSE)

    await useAuthStore.getState().register({ username: 'a', email: 'b', password: 'c' })

    expect(tokenStorage.getAccess()).toBe(FAKE_JWT)
    expect(tokenStorage.getRefresh()).toBe('refresh-token-123')
  })

  it('đăng ký thất bại: set error và không lưu token', async () => {
    const axiosError = {
      response: { data: { message: 'Email already exists' } },
    }
    vi.mocked(registerApi).mockRejectedValue(axiosError)

    await expect(
      useAuthStore.getState().register({ username: 'x', email: 'dup@test.com', password: 'p' })
    ).rejects.toBeDefined()

    expect(useAuthStore.getState().error).toBe('Email already exists')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(tokenStorage.getAccess()).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
//  logout()
// ══════════════════════════════════════════════════════════════════════════════

describe('logout()', () => {
  it('xóa user và set isAuthenticated=false', () => {
    // Đặt trạng thái đã đăng nhập
    useAuthStore.setState({
      user:            { username: 'alice', email: 'alice@test.com' },
      isAuthenticated: true,
    })
    tokenStorage.set(FAKE_JWT, 'refresh', FUTURE_EXPIRY)

    useAuthStore.getState().logout()

    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('xóa tất cả token trong localStorage', () => {
    tokenStorage.set(FAKE_JWT, 'refresh', FUTURE_EXPIRY)

    useAuthStore.getState().logout()

    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
    expect(tokenStorage.getExpiry()).toBeNull()
  })

  it('gọi queryClient.clear() để xóa cache', () => {
    useAuthStore.getState().logout()

    expect(queryClient.clear).toHaveBeenCalledOnce()
  })

  it('xóa error state', () => {
    useAuthStore.setState({ error: 'some old error' })

    useAuthStore.getState().logout()

    expect(useAuthStore.getState().error).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
//  clearError()
// ══════════════════════════════════════════════════════════════════════════════

describe('clearError()', () => {
  it('xóa error message khỏi state', () => {
    useAuthStore.setState({ error: 'Something went wrong' })

    useAuthStore.getState().clearError()

    expect(useAuthStore.getState().error).toBeNull()
  })

  it('không thay đổi các state khác', () => {
    useAuthStore.setState({
      user:            { username: 'alice', email: 'alice@test.com' },
      isAuthenticated: true,
      error:           'old error',
    })

    useAuthStore.getState().clearError()

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.username).toBe('alice')
  })
})
