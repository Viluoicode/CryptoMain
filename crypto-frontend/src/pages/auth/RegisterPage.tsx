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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const registerSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(100, 'Username too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email format').max(255, 'Email too long'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
    useDocumentTitle('Sign Up')
    const { register: registerUser, isLoading, error, clearError } = useAuth()
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    })

    useEffect(() => () => clearError(), [clearError])

    async function onSubmit(values: RegisterFormValues) {
        try {
            await registerUser({ username: values.username, email: values.email, password: values.password })
            navigate('/dashboard', { replace: true })
        } catch { /* error set in store */ }
    }

    return (
        <AuthLayout title="Create account" subtitle="Start tracking your crypto portfolio today">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <Input {...register('username')} label="Username" type="text" placeholder="satoshi" autoComplete="username" error={errors.username?.message} />
                <Input {...register('email')} label="Email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} />
                <Input {...register('password')} label="Password" type="password" placeholder="Min 6 characters" autoComplete="new-password" error={errors.password?.message} />
                <Input {...register('confirmPassword')} label="Confirm Password" type="password" placeholder="Re-enter password" autoComplete="new-password" error={errors.confirmPassword?.message} />

                <Button type="submit" size="lg" loading={isLoading} className="w-full mt-2">
                    Create Account
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-accent-cyan hover:text-accent-cyan/80 transition">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    )
}
