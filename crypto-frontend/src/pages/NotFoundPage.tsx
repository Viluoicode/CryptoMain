// src/pages/NotFoundPage.tsx
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Home, ArrowLeft, Search } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
    useDocumentTitle('404 — Không tìm thấy')
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">

                {/* Logo */}
                <div className="flex justify-center">
                    <div className="bg-indigo-600/20 border border-indigo-500/20 rounded-2xl p-5">
                        <TrendingUp size={36} className="text-indigo-400" />
                    </div>
                </div>

                {/* 404 number */}
                <div>
                    <p className="text-8xl font-black text-gray-800 select-none leading-none">
                        404
                    </p>
                    <h1 className="text-2xl font-bold text-white mt-3">
                        Trang không tồn tại
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                        Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển.
                        <br />
                        Hãy kiểm tra lại URL hoặc quay về trang chủ.
                    </p>
                </div>

                {/* Quick links */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium rounded-xl transition"
                    >
                        <ArrowLeft size={15} />
                        Quay lại
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                    >
                        <Home size={15} />
                        Trang chủ
                    </button>
                    <button
                        onClick={() => navigate('/market')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium rounded-xl transition"
                    >
                        <Search size={15} />
                        Thị trường
                    </button>
                </div>
            </div>
        </div>
    )
}
