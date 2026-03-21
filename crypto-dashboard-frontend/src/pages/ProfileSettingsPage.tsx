import { useState, useRef } from 'react';
import { mockUser, mockNotificationSettings } from '../data/mockData';
import type { NotificationSettings } from '../types';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function ProfileSettingsPage() {
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [phone, setPhone] = useState('+1 (555) 012-3456');
  const [bio, setBio] = useState('Crypto enthusiast & long-term investor.');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<NotificationSettings>({ ...mockNotificationSettings });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const notificationLabels: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: 'priceAlerts', label: 'Price Alerts', desc: 'Get notified when your tracked coins hit target prices.' },
    { key: 'portfolioUpdates', label: 'Portfolio Updates', desc: 'Daily summary of your portfolio performance.' },
    { key: 'transactionConfirmations', label: 'Transaction Confirmations', desc: 'Receive confirmations for every completed transaction.' },
    { key: 'weeklyReport', label: 'Weekly Report', desc: 'A weekly digest of market trends and your holdings.' },
    { key: 'securityAlerts', label: 'Security Alerts', desc: 'Immediate alerts on suspicious login attempts.' },
    { key: 'marketNews', label: 'Market News', desc: 'Breaking news and updates from the crypto market.' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Profile Settings</h2>

      {/* Profile Photo + Personal Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-5">Personal Details</h3>
        <form onSubmit={handleSave}>
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-indigo-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {mockUser.avatarInitials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow hover:bg-indigo-700 transition-colors"
                title="Change photo"
              >
                ✏
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{email}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-xs text-indigo-600 hover:underline font-medium"
              >
                Upload new photo
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save Changes
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                ✓ Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-5">Notification Settings</h3>
        <div className="space-y-4">
          {notificationLabels.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={notifications[key]}
                onChange={() => toggleNotification(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
        <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
        <p className="text-xs text-slate-400 mb-4">These actions are irreversible. Please proceed with caution.</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Change Password
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium border border-red-200 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
