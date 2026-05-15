import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
  },

  build: {
    // Raise the warning threshold — after splitting, only the heavy vendor
    // chunks (klinecharts, lightweight-charts) exceed 500 KB and they are
    // loaded lazily so they don't block the initial paint.
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // Heavy charting libraries — each gets its own lazy chunk
          if (id.includes('node_modules/klinecharts'))         return 'vendor-klinecharts'
          if (id.includes('node_modules/lightweight-charts'))  return 'vendor-lightweight'

          // Recharts + d3 helpers
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-')      ||
              id.includes('node_modules/victory-'))            return 'vendor-charts'

          // TanStack ecosystem
          if (id.includes('node_modules/@tanstack'))           return 'vendor-query'

          // Router
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run'))          return 'vendor-router'

          // React core (smallest possible main bundle)
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/'))              return 'vendor-react'

          // Form / validation
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform')            ||
              id.includes('node_modules/zod'))                 return 'vendor-forms'

          // Everything else in node_modules → generic vendor chunk
          if (id.includes('node_modules'))                     return 'vendor'
        },
      },
    },
  },
})
