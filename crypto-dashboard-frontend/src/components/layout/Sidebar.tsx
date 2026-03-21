import { NavLink } from 'react-router-dom';
import { navItems } from '../../data/mockData';

export default function Sidebar() {
  const mainItems = [
    { ...navItems[0], label: 'Dashboard', path: '/' },
    { ...navItems[2], label: 'Market', path: '/market' },
    { ...navItems[1], label: 'Portfolio', path: '/analytics' },
    { ...navItems[3], label: 'Transactions', path: '/transactions' },
    { ...navItems[4], label: 'Alerts', path: '/profile' },
  ];

  const alertBadgeMap: Record<string, number> = {
    '/profile': 3,
  };

  return (
    <aside className="flex h-screen w-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0D0E14] text-slate-100">
      <div className="flex h-24 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-sm font-bold text-white shadow-[0_4px_12px_rgba(108,92,231,0.3)]">
          ⚡
        </div>
        <p className="whitespace-nowrap text-xl font-bold tracking-[-0.02em] text-white">
          Fund<span className="text-[#A29BFE]">rows</span>
        </p>
      </div>

      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {mainItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? 'border-[#6C5CE7]/40 bg-gradient-to-br from-[#6C5CE7]/25 to-[#A29BFE]/15 text-[#A29BFE]'
                      : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-[#141622] hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`w-5 shrink-0 text-center text-base ${isActive ? 'text-[#A29BFE]' : 'text-slate-500'}`}>
                      {item.icon}
                    </span>
                    <span className={`truncate ${isActive ? 'font-semibold text-[#A29BFE]' : 'font-normal text-slate-400'}`}>
                      {item.label}
                    </span>
                    {alertBadgeMap[item.path] ? (
                      <span className="ml-auto flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#6C5CE7] text-[10px] font-bold text-white">
                        {alertBadgeMap[item.path]}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-2 py-4">
        <button className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:border-white/10 hover:bg-[#141622] hover:text-slate-100">
          <span className="text-base">⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
