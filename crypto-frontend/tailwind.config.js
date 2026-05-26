/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            colors: {
                // ── Core surface palette (Toobit dark mode) ───────────────────────────
                navy: {
                    950: '#07090b',
                    900: '#0b0e11',
                    850: '#101418',
                    800: '#161a1e',
                    700: '#20262d',
                    600: '#2b3139',
                    500: '#383f49',
                },
                surface: {
                    DEFAULT: '#161a1e',
                    light:   '#20262d',
                    hover:   '#2b3139',
                    border:  '#2b3139',
                },
                // ── Accent gradient endpoints (Toobit Blue/Cyan) ────────────────────
                accent: {
                    cyan:   '#0059FB', // Toobit brand blue
                    purple: '#00c6ff', // Light cyan-blue
                    blue:   '#0059FB',
                    pink:   '#ff3b30',
                },
                // ── Brand (backward compat with existing code) ───
                brand: {
                    50:  '#f0f5ff',
                    100: '#dbebff',
                    400: '#6ea6ff',
                    500: '#0059FB',
                    600: '#004cde',
                    700: '#003eb8',
                },
                // ── Semantic ─────────────────────────────────────
                profit:  '#03c076', // Toobit Green
                loss:    '#f6465d', // Toobit Red
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'accent-gradient': 'linear-gradient(135deg, #0059FB, #00c6ff)',
                'accent-gradient-r': 'linear-gradient(135deg, #00c6ff, #0059FB)',
                'card-gradient':   'linear-gradient(145deg, rgba(22,26,30,0.8), rgba(11,14,17,0.9))',
            },
            boxShadow: {
                glow:       '0 0 20px rgba(0,89,251,0.15)',
                'glow-lg':  '0 0 40px rgba(0,89,251,0.2)',
                'glow-purple': '0 0 30px rgba(0,198,255,0.15)',
                'glow-profit': '0 0 20px rgba(3,192,118,0.15)',
                'glow-loss':   '0 0 20px rgba(246,70,93,0.15)',
                'glass':    '0 8px 32px rgba(0,0,0,0.3)',
            },
            keyframes: {
                ticker: {
                    '0%':   { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                slideIn: {
                    '0%':   { transform: 'translateY(16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideUp: {
                    '0%':   { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%':   { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                shimmer: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                pulseSlow: {
                    '0%, 100%': { opacity: '0.4' },
                    '50%':      { opacity: '0.8' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%':      { transform: 'translateY(-10px)' },
                },
                gradientX: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%':      { backgroundPosition: '100% 50%' },
                },
                flashUp: {
                    '0%':   { backgroundColor: 'rgba(16,185,129,0.2)' },
                    '100%': { backgroundColor: 'transparent' },
                },
                flashDown: {
                    '0%':   { backgroundColor: 'rgba(239,68,68,0.2)' },
                    '100%': { backgroundColor: 'transparent' },
                },
                scaleIn: {
                    '0%':   { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                spin: {
                    from: { transform: 'rotate(0deg)' },
                    to:   { transform: 'rotate(360deg)' },
                },
            },
            animation: {
                ticker:     'ticker 30s linear infinite',
                'slide-in': 'slideIn 0.3s ease-out forwards',
                'slide-up': 'slideUp 0.3s ease-out forwards',
                'fade-in':  'fadeIn 0.2s ease-out forwards',
                'fade-out': 'fadeOut 0.3s ease-in forwards',
                shimmer:    'shimmer 2s infinite linear',
                'pulse-slow': 'pulseSlow 6s ease-in-out infinite',
                float:      'float 6s ease-in-out infinite',
                'gradient-x': 'gradientX 3s ease infinite',
                'flash-up':   'flashUp 700ms ease-out forwards',
                'flash-down': 'flashDown 700ms ease-out forwards',
                'scale-in':   'scaleIn 0.2s ease-out forwards',
            },
        },
    },
    plugins: [],
}