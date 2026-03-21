import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/market': 'Market',
  '/transactions': 'Transactions',
  '/profile': 'Profile Settings',
};

export default function MainLayout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'Dashboard';

  return (
    <div className="grid h-screen grid-cols-[240px_minmax(0,1fr)] overflow-hidden bg-[#060912] text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-col overflow-hidden bg-[#090D16] px-5 pt-5 pb-6 md:px-6 md:pt-6">
        <Header pageTitle={pageTitle} />
        <main className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-800/70 bg-[#0A0F1A] p-5 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
