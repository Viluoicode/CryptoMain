// src/pages/auth/LoginPage.tsx
import { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

// ─── Validation ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email không được để trống')
        .email('Định dạng email không hợp lệ'),
    password: z
        .string()
        .min(1, 'Mật khẩu không được để trống'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LoginPage() {
    const { login, isLoading, error, clearError, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from     = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

    // Nếu đã đăng nhập → redirect
    useEffect(() => {
        if (isAuthenticated) navigate(from, { replace: true })
    }, [isAuthenticated, navigate, from])

    // Clear server error khi unmount
    useEffect(() => () => clearError(), [clearError])

    async function onSubmit(values: LoginFormValues) {
        try {
            await login(values)
            navigate(from, { replace: true })
        } catch {
            // Lỗi đã được set vào store, hiển thị qua `error`
        }
    }

    return (
        <AuthLayout
            title="Chào mừng trở lại"
            subtitle="Đăng nhập vào tài khoản của bạn để tiếp tục"
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* Server error */}
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <Input
                    {...register('email')}
                    label="Email"
                    type="email"
                    placeholder="ban@example.com"
                    autoComplete="email"
                    error={errors.email?.message}
                />

                <Input
                    {...register('password')}
                    label="Mật khẩu"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    error={errors.password?.message}
                />

                <Button
                    type="submit"
                    size="lg"
                    loading={isLoading}
                    className="w-full mt-2"
                >
                    Đăng nhập
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Chưa có tài khoản?{' '}
                <Link
                    to="/register"
                    className="font-medium text-brand-600 hover:text-brand-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                    Tạo tài khoản miễn phí
                </Link>
            </p>
        </AuthLayout>
    )
}
