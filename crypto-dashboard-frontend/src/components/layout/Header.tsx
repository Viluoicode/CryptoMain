import { mockUser } from '../../data/mockData';

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="mb-5 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0A0B0F] px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-xl font-bold leading-tight text-white">{pageTitle}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{currentDate}</p>
      </div>

      <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
        <div className="hidden w-[190px] items-center gap-2 rounded-xl border border-white/10 bg-[#13141A] px-3.5 py-2 sm:flex md:w-[220px]">
          <span className="shrink-0 text-[13px] text-slate-500">⌕</span>
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full bg-transparent text-[13px] text-slate-400 outline-none placeholder:text-slate-500"
            readOnly
          />
        </div>

        <button className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/10 bg-[#13141A] text-slate-400 transition-colors duration-200 hover:border-white/20 hover:text-slate-200">
          <span className="text-sm">☾</span>
        </button>

        <button className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/10 bg-[#13141A] text-slate-400 transition-colors duration-200 hover:border-white/20 hover:text-slate-200">
          <span className="text-sm">⌁</span>
          <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-[#6C5CE7]" />
        </button>

        <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#13141A] px-2 py-1.5 transition-colors duration-200 hover:border-white/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-xs font-semibold text-white">
            {mockUser.avatarInitials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-tight text-white">{mockUser.name}</p>
            <p className="text-[10px] text-slate-500">Pro Trader</p>
          </div>
          <span className="text-sm text-slate-500">⌄</span>
        </div>
      </div>
    </header>
  );
}
