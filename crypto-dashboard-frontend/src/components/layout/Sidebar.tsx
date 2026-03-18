import { NavLink } from 'react-router-dom';
import { mockUser, navItems } from '../../data/mockData';

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-lg">
          ₿
        </div>
        <span className="text-lg font-semibold tracking-tight">CryptoDash</span>
      </div>

      {/* User Profile */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-semibold text-sm shrink-0">
            {mockUser.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-white truncate">{mockUser.name}</p>
            <p className="text-xs text-slate-400 truncate">{mockUser.email}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4 p-3 rounded-xl bg-slate-800">
          <p className="text-xs text-slate-400 mb-1">Total Portfolio Value</p>
          <p className="text-lg font-bold text-white">
            ${mockUser.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-emerald-400">
              ▲ +${mockUser.balanceChange.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-400">
              ({mockUser.balanceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="px-3 mb-2 text-xs font-medium uppercase tracking-widest text-slate-500">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="px-3 mt-6 mb-2 text-xs font-medium uppercase tracking-widest text-slate-500">
          General
        </p>
        <ul className="space-y-1">
          {navItems.slice(5).map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full">
          <span>⏻</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
