import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Bảo vệ các route cần đăng nhập.
 * Nếu chưa auth → redirect về /login, giữ lại `from` để sau login quay lại.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Route chỉ dành cho guest (login/register).
 * Nếu đã auth → redirect về dashboard.
 */
export function GuestRoute() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
