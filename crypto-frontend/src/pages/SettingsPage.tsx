// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Bell, Shield, ChevronRight, Check, Eye, EyeOff, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { changePasswordApi, updateProfileApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Section = 'profile' | 'security' | 'notifications' | 'privacy'

// ─── Sidebar nav ───────────────────────────────────────────────────────────────
const SECTIONS: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'profile',       label: 'Tài khoản',       icon: <User size={16} />,    desc: 'Thông tin cá nhân & email' },
    { id: 'security',      label: 'Bảo mật',          icon: <Lock size={16} />,    desc: 'Mật khẩu & xác thực 2FA' },
    { id: 'notifications', label: 'Thông báo',        icon: <Bell size={16} />,    desc: 'Email & push notifications' },
    { id: 'privacy',       label: 'Quyền riêng tư',  icon: <Shield size={16} />,  desc: 'Dữ liệu & cookies' },
]

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function ProfileSection({ username, email }: { username: string; email: string }) {
    const [name, setName]       = useState(username)
    const [saved, setSaved]     = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState('')
    const toast                  = useToast()
    const updateUsername         = useAuthStore((s) => s.updateUsername)

    async function handleSave() {
        if (!name.trim()) return
        setError('')
        setLoading(true)
        try {
            await updateProfileApi({ username: name.trim() })
            updateUsername(name.trim())
            setSaved(true)
            toast.success('Đã lưu', 'Tên người dùng đã được cập nhật')
            setTimeout(() => setSaved(false), 2500)
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Cập nhật thất bại'
            setError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader title="Thông tin tài khoản" desc="Cập nhật tên hiển thị và xem email đăng ký." />

            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/15 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-accent-cyan">
                        {(name || username).charAt(0).toUpperCase()}
                    </span>
                </div>
                <div>
                    <p className="text-sm font-bold text-white leading-tight">{name || username}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">{email}</p>
                </div>
            </div>

            <Divider />

            {/* Fields */}
            <div className="space-y-4 max-w-md">
                <Field label="Tên người dùng">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                    />
                </Field>

                <Field label="Email">
                    <input
                        value={email}
                        disabled
                        className={cn(inputCls, 'opacity-40 cursor-not-allowed')}
                    />
                    <p className="text-[10px] font-semibold text-gray-500 mt-1.5 uppercase tracking-wider">
                        Email không thể thay đổi.
                    </p>
                </Field>
            </div>

            <div className="flex items-center gap-3">
                <SaveButton loading={loading} saved={saved} onClick={handleSave} />
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        </div>
    )
}

function SecuritySection() {
    const toast = useToast()
    const [current,  setCurrent]  = useState('')
    const [newPwd,   setNewPwd]   = useState('')
    const [confirm,  setConfirm]  = useState('')
    const [showPwd,  setShowPwd]  = useState(false)
    const [saved,    setSaved]    = useState(false)
    const [loading,  setLoading]  = useState(false)
    const [error,    setError]    = useState('')

    async function handleSave() {
        setError('')
        if (!current || !newPwd || !confirm) { setError('Vui lòng điền đầy đủ.'); return }
        if (newPwd !== confirm)              { setError('Mật khẩu mới không khớp.'); return }
        if (newPwd.length < 8)              { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return }

        setLoading(true)
        try {
            await changePasswordApi({ currentPassword: current, newPassword: newPwd })
            setSaved(true)
            setCurrent(''); setNewPwd(''); setConfirm('')
            toast.success('Đổi mật khẩu thành công', 'Vui lòng đăng nhập lại trên các thiết bị khác')
            setTimeout(() => setSaved(false), 2500)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Đổi mật khẩu thất bại'
            setError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader title="Bảo mật" desc="Đổi mật khẩu và quản lý bảo mật tài khoản." />

            {/* Change password */}
            <div className="space-y-4 max-w-md">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Đổi mật khẩu</h3>

                <Field label="Mật khẩu hiện tại">
                    <div className="relative">
                        <input
                            type={showPwd ? 'text' : 'password'}
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            className={cn(inputCls, 'pr-10')}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd((p) => !p)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </Field>

                <Field label="Mật khẩu mới">
                    <input
                        type={showPwd ? 'text' : 'password'}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className={inputCls}
                        placeholder="••••••••"
                    />
                </Field>

                <Field label="Xác nhận mật khẩu mới">
                    <input
                        type={showPwd ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={inputCls}
                        placeholder="••••••••"
                    />
                </Field>

                {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
            </div>

            <div className="flex items-center gap-3">
                <SaveButton loading={loading} saved={saved} onClick={handleSave} />
            </div>

            <Divider />

            {/* 2FA placeholder */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Xác thực 2 bước (2FA)</h3>
                <div className="flex items-center justify-between p-4 bg-navy-950/60 border border-white/[0.04] rounded-xl max-w-md">
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">Google Authenticator</p>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase mt-1">Chưa kích hoạt</p>
                    </div>
                    <button className="text-xs text-accent-cyan font-bold hover:underline">
                        Kích hoạt
                    </button>
                </div>
            </div>
        </div>
    )
}

function NotificationsSection() {
    const [prefs, setPrefs] = useState({
        emailPriceAlert: true,
        emailNewLogin:   true,
        pushPriceAlert:  false,
        pushPortfolio:   false,
    })

    function toggle(key: keyof typeof prefs) {
        setPrefs((p) => ({ ...p, [key]: !p[key] }))
    }

    return (
        <div className="space-y-6">
            <SectionHeader title="Thông báo" desc="Chọn loại thông báo bạn muốn nhận." />

            <div className="space-y-2 max-w-md">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Email</h3>
                <ToggleRow
                    label="Cảnh báo giá"
                    desc="Khi coin đạt mức giá bạn đặt"
                    checked={prefs.emailPriceAlert}
                    onChange={() => toggle('emailPriceAlert')}
                />
                <ToggleRow
                    label="Đăng nhập mới"
                    desc="Thông báo khi có thiết bị mới đăng nhập"
                    checked={prefs.emailNewLogin}
                    onChange={() => toggle('emailNewLogin')}
                />
            </div>

            <Divider />

            <div className="space-y-2 max-w-md">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Push</h3>
                <ToggleRow
                    label="Biến động giá"
                    desc="Biến động > 5% trong 24h"
                    checked={prefs.pushPriceAlert}
                    onChange={() => toggle('pushPriceAlert')}
                />
                <ToggleRow
                    label="Cập nhật danh mục"
                    desc="Tóm tắt hiệu suất hàng tuần"
                    checked={prefs.pushPortfolio}
                    onChange={() => toggle('pushPortfolio')}
                />
            </div>
        </div>
    )
}

function PrivacySection() {
    return (
        <div className="space-y-6">
            <SectionHeader title="Quyền riêng tư" desc="Quản lý cách dữ liệu của bạn được sử dụng." />

            <div className="space-y-3 max-w-md">
                {[
                    { label: 'Tải xuống dữ liệu', desc: 'Xuất toàn bộ lịch sử giao dịch và portfolio' },
                    { label: 'Xoá tài khoản',     desc: 'Xoá vĩnh viễn tài khoản và dữ liệu' },
                ].map(({ label, desc }) => (
                    <button
                        key={label}
                        className="flex w-full items-center justify-between p-4 bg-navy-950/60 border border-white/[0.04] hover:bg-white/[0.02] rounded-xl transition group text-left"
                    >
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{label}</p>
                            <p className="text-xs text-gray-500 font-semibold mt-1">{desc}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition" />
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const inputCls =
    'w-full px-4 py-2.5 bg-navy-950/60 border border-white/[0.08] text-white placeholder-gray-500 rounded-xl text-sm outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 hover:border-white/[0.12] transition duration-200 font-semibold'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    )
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
    return (
        <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">{title}</h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">{desc}</p>
        </div>
    )
}

function Divider() {
    return <hr className="border-white/[0.06]" />
}

function SaveButton({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={loading || saved}
            className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider',
                saved
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white shadow-glow hover:brightness-110 disabled:opacity-60',
            )}
        >
            {saved ? (
                <><Check size={14} /> Đã lưu</>
            ) : loading ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
            ) : (
                'Lưu thay đổi'
            )}
        </button>
    )
}

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: () => void
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-navy-950/60 border border-white/[0.04] rounded-xl">
            <div>
                <p className="text-sm font-bold text-white leading-tight">{label}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">{desc}</p>
            </div>
            <button
                onClick={onChange}
                className={cn(
                    'relative w-10 rounded-full transition-colors duration-200 border border-white/[0.08]',
                    checked ? 'bg-accent-cyan border-accent-cyan/20 shadow-glow' : 'bg-navy-950',
                )}
                style={{ height: '22px', width: '40px' }}
            >
                <span
                    className={cn(
                        'absolute top-0.5 bg-white rounded-full shadow-sm transition-transform duration-200',
                        checked ? 'translate-x-[19px]' : 'translate-x-0.5',
                    )}
                    style={{ height: '18px', width: '18px' }}
                />
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function SettingsPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [activeSection, setActiveSection] = useState<Section>('profile')

    function handleLogout() {
        logout()
        navigate('/', { replace: true })
    }

    const content = {
        profile:       <ProfileSection username={user?.username ?? ''} email={user?.email ?? ''} />,
        security:      <SecuritySection />,
        notifications: <NotificationsSection />,
        privacy:       <PrivacySection />,
    }[activeSection]

    return (
        <div className="max-w-4xl space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Cài đặt</h1>
                <p className="text-xs text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">Quản lý tài khoản và tuỳ chọn cá nhân</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <aside className="w-full md:w-56 shrink-0">
                    <Card padding="none" className="p-2 space-y-1">
                        {SECTIONS.map(({ id, label, icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveSection(id)}
                                className={cn(
                                    'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-150',
                                    activeSection === id
                                        ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan border border-accent-cyan/35'
                                        : 'text-gray-400 hover:bg-white/[0.02] hover:text-white',
                                )}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}

                        <div className="pt-1.5 mt-1.5 border-t border-white/[0.06]">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors duration-150"
                            >
                                <LogOut size={16} />
                                Đăng xuất
                            </button>
                        </div>
                    </Card>
                </aside>

                {/* Content */}
                <Card className="flex-1 p-6">
                    {content}
                </Card>
            </div>
        </div>
    )
}
