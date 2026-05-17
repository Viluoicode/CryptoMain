// src/pages/auth/RegisterPage.tsx
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

// ─── Validation — mirror C# [StringLength] / [MinLength] annotations ──────────
const registerSchema = z
    .object({
        username: z
            .string()
            .min(3, 'Tên người dùng phải có ít nhất 3 ký tự')
            .max(100, 'Tên người dùng tối đa 100 ký tự'),
        email: z
            .string()
            .min(1, 'Email không được để trống')
            .email('Định dạng email không hợp lệ')
            .max(255, 'Email quá dài'),
        password: z
            .string()
            .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
        confirmPassword: z
            .string()
            .min(1, 'Vui lòng xác nhận mật khẩu'),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    })

type RegisterFormValues = z.infer<typeof registerSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────
export function RegisterPage() {
    const { register: registerUser, isLoading, error, clearError } = useAuth()
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

    useEffect(() => () => clearError(), [clearError])

    async function onSubmit(values: RegisterFormValues) {
        try {
            await registerUser({
                username: values.username,
                email:    values.email,
                password: values.password,
            })
            navigate('/dashboard', { replace: true })
        } catch {
            // Lỗi đã được set vào store
        }
    }

    return (
        <AuthLayout
            title="Tạo tài khoản"
            subtitle="Bắt đầu theo dõi danh mục crypto của bạn ngay hôm nay"
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* Server error */}
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <Input
                    {...register('username')}
                    label="Tên người dùng"
                    type="text"
                    placeholder="satoshi"
                    autoComplete="username"
                    error={errors.username?.message}
                />

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
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete="new-password"
                    error={errors.password?.message}
                />

                <Input
                    {...register('confirmPassword')}
                    label="Xác nhận mật khẩu"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                />

                <Button
                    type="submit"
                    size="lg"
                    loading={isLoading}
                    className="w-full mt-2"
                >
                    Tạo tài khoản
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Đã có tài khoản?{' '}
                <Link
                    to="/login"
                    className="font-medium text-brand-600 hover:text-brand-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                    Đăng nhập
                </Link>
            </p>
        </AuthLayout>
    )
}
