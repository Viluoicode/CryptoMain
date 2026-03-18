import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/wallets': 'Wallets',
  '/transactions': 'Transactions',
  '/market': 'Crypto Market',
  '/settings': 'Settings',
};

export default function MainLayout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
