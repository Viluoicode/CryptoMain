import { mockUser } from '../../data/mockData';

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shrink-0">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{pageTitle}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back, {mockUser.name.split(' ')[0]}! Here's your portfolio overview.
        </p>
      </div>

      {/* Right Side: Search + Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search coins..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-52"
            readOnly
          />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <span className="text-lg">🔔</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
            {mockUser.avatarInitials}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden md:block">
            {mockUser.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
