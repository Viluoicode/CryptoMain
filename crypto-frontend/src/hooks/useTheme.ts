// src/hooks/useTheme.ts
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Đọc từ localStorage, fallback về 'dark' (default dark)
        const saved = localStorage.getItem('theme') as Theme | null
        return saved ?? 'dark'
    })

    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    return { theme, toggleTheme, isDark: theme === 'dark' }
}