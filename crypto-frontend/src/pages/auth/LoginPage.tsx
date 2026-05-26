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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
    useDocumentTitle('Sign In')
    const { login, isLoading, error, clearError, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    })

    useEffect(() => {
        if (isAuthenticated) navigate(from, { replace: true })
    }, [isAuthenticated, navigate, from])

    useEffect(() => () => clearError(), [clearError])

    async function onSubmit(values: LoginFormValues) {
        try {
            await login(values)
            navigate(from, { replace: true })
        } catch { /* error set in store */ }
    }

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <Input
                    {...register('email')}
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={errors.email?.message}
                />

                <Input
                    {...register('password')}
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                />

                <Button type="submit" size="lg" loading={isLoading} className="w-full mt-2">
                    Sign In
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-medium text-accent-cyan hover:text-accent-cyan/80 transition">
                    Create free account
                </Link>
            </p>
        </AuthLayout>
    )
}
