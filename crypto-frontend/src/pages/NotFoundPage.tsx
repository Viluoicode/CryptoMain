// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
    useDocumentTitle('404 — Not Found')

    return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 text-center max-w-md">
                <div className="text-8xl md:text-9xl font-black gradient-text mb-4 select-none">404</div>
                <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
                <p className="text-gray-400 mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="md" onClick={() => window.history.back()}>
                        <ArrowLeft size={16} />
                        Go Back
                    </Button>
                    <Link to="/">
                        <Button variant="primary" size="md">
                            <Home size={16} />
                            Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
