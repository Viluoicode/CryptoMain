import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/portfolio" element={<PlaceholderPage title="Portfolio" />} />
          <Route path="/wallets" element={<PlaceholderPage title="Wallets" />} />
          <Route path="/transactions" element={<PlaceholderPage title="Transactions" />} />
          <Route path="/market" element={<PlaceholderPage title="Crypto Market" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
