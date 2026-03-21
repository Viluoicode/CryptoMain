import { useState, type FormEvent } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockUser, mockHoldings, mockTransactions, portfolioHistory,
  assetDistribution, marketCoins,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { ApiError } from '../api/apiClient';
import type { CryptoHolding, AssetDistribution } from '../types';

// ─── Coin colour palette ───────────────────────────────────────────────────────
const COIN_COLORS: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  solana: '#9945FF',
  cardano: '#0033AD',
  tether: '#26A17B',
  binancecoin: '#F3BA2F',
  xrp: '#346AA9',
  avalanche: '#E84142',
};
function getCoinColor(coinId: string): string {
  return COIN_COLORS[coinId.toLowerCase()] ?? '#64748B';
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title, value, change, isPositive, accentColor = 'bg-indigo-500',
}: {
  title: string; value: string; change?: string; isPositive?: boolean; accentColor?: string;
}) {
  return (
    <div className="relative bg-[#151924] rounded-2xl p-6 border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor} rounded-t-2xl`} />
      <p className="text-sm font-medium text-slate-400 mb-2">{title}</p>
      <p className="text-2xl font-bold text-slate-100 tracking-tight">{value}</p>
      {change && (
        <span
          className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {isPositive ? '▲' : '▼'} {change}
        </span>
      )}
    </div>
  );
}

// ─── Custom Tooltip for Line Chart ────────────────────────────────────────────
function PortfolioTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E2433] border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-base font-bold text-slate-100">
          ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

// ─── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#151924] border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-100">Sign in to your account</h2>
          <p className="text-sm text-slate-400 mt-1">Connect to the live portfolio API</p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { isAuthenticated } = useAuth();
  
  const { summary, performance, loading, error, refresh } = usePortfolio();

  const [activePeriod, setActivePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeAsset, setTradeAsset] = useState('BTC');
  const [tradeAmount, setTradeAmount] = useState('');

  // ── Derive display values: prefer real API data, fall back to mock ──────────
  const mockTotalInvested = mockHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const mockUnrealizedPnl = mockUser.totalBalance - mockTotalInvested;

  const totalValue = summary?.totalCurrentValue ?? mockUser.totalBalance;
  const totalInvested = summary?.totalInvestedValue ?? mockTotalInvested;
  const unrealizedPnl = performance?.unrealizedProfitLoss ?? mockUnrealizedPnl;
  const unrealizedPnlPct = performance?.unrealizedProfitLossPercentage ??
    ((mockUnrealizedPnl / mockTotalInvested) * 100);

  // Build asset distribution from API allocations, or fall back to mock
  const displayAssetDistribution: AssetDistribution[] =
    summary && summary.allocations.length > 0
      ? summary.allocations.map((a) => ({
          name: a.coinName,
          symbol: a.coinSymbol,
          value: a.currentValue,
          percentage: Number(a.allocationPercentage.toFixed(1)),
          color: getCoinColor(a.coinId),
        }))
      : assetDistribution;

  // Build holdings list for Quick Trade from API, or fall back to mock
  const displayHoldings: CryptoHolding[] =
    summary && summary.allocations.length > 0
      ? summary.allocations.map((a) => ({
          id: a.coinId,
          symbol: a.coinSymbol,
          name: a.coinName,
          quantity: a.quantity,
          currentPrice: a.currentPrice,
          totalValue: a.currentValue,
          change24h: 0,
          iconColor: getCoinColor(a.coinId),
        }))
      : mockHoldings;

  const assetsCount = summary ? summary.allocations.length : mockHoldings.length;

  const chartData = portfolioHistory[activePeriod];
  const periods: Array<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'> = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  return (
    <>
      {!isAuthenticated && <LoginModal />}

      <div className="space-y-6">
        {/* ── API status banner ── */}
        {isAuthenticated && error && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-3 text-sm">
            <span>⚠ Could not load live data — showing demo figures. ({error})</span>
            <button
              onClick={() => refresh()}
              className="ml-4 px-3 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {isAuthenticated && loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-sm px-1">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading live portfolio data…
          </div>
        )}

        {/* ── Row 1: Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Total Portfolio Value"
            value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={
              summary
                ? `${summary.totalProfitLossPercentage >= 0 ? '+' : ''}${summary.totalProfitLossPercentage.toFixed(2)}% all time`
                : `$${mockUser.balanceChange.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${mockUser.balanceChangePercent}%)`
            }
            isPositive={summary ? summary.totalProfitLoss >= 0 : mockUser.balanceChange > 0}
            accentColor="bg-indigo-500"
          />
          <StatCard
            title="Total Invested"
            value={`$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            accentColor="bg-violet-500"
          />
          <StatCard
            title="Unrealized P&L"
            value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={`${Math.abs(unrealizedPnlPct).toFixed(2)}% all time`}
            isPositive={unrealizedPnl >= 0}
            accentColor={unrealizedPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
          />
          <StatCard
            title="Assets Held"
            value={`${assetsCount}`}
            change="Active holdings"
            isPositive={true}
            accentColor="bg-sky-500"
          />
        </div>

        {/* ── Row 2: Portfolio Performance + Asset Allocation ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Portfolio Performance (col-span-2) */}
          <div className="lg:col-span-2 bg-[#151924] rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Portfolio Performance</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  ${(chartData[chartData.length - 1]?.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-1">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      activePeriod === p
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<PortfolioTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation (col-span-1) */}
          <div className="bg-[#151924] rounded-2xl border border-slate-800 p-6">
            <h2 className="text-base font-semibold text-slate-100 mb-4">Asset Allocation</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={displayAssetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {displayAssetDistribution.map((entry) => (
                    <Cell key={entry.symbol} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1E2433',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    color: '#e2e8f0',
                  }}
                  formatter={(value) => {
                    const num = typeof value === 'number' ? value : Number(value);
                    return [`$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, ''];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {displayAssetDistribution.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: asset.color }} />
                    <span className="text-sm text-slate-300">{asset.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-400">{asset.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Market Overview + Quick Trade ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Market Overview (col-span-2) */}
          <div className="lg:col-span-2 bg-[#151924] rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Market Overview</h2>
              <a href="/market" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                View All →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide bg-slate-800/40 border-b border-slate-800">
                    <th className="px-5 py-3 text-left font-semibold">Asset</th>
                    <th className="px-5 py-3 text-right font-semibold">Price</th>
                    <th className="px-5 py-3 text-right font-semibold">24h</th>
                    <th className="px-5 py-3 text-right font-semibold hidden md:table-cell">Market Cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {marketCoins.slice(0, 6).map((coin) => (
                    <tr key={coin.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: coin.iconColor }}
                          >
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{coin.name}</p>
                            <p className="text-xs text-slate-500">{coin.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-200">
                        ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            coin.change24h >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {coin.change24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change24h).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 hidden md:table-cell">
                        ${(coin.marketCap / 1e9).toFixed(1)}B
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Trade (col-span-1) */}
          <div className="bg-[#151924] rounded-2xl border border-slate-800 p-6 flex flex-col gap-5">
            <h2 className="text-base font-semibold text-slate-100">Quick Trade</h2>

            {/* Buy / Sell toggle */}
            <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded-xl p-1">
              <button
                onClick={() => setTradeType('buy')}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                  tradeType === 'buy' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeType('sell')}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                  tradeType === 'sell' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Asset selector — populated from real API holdings or mock */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Asset</label>
              <select
                value={tradeAsset}
                onChange={(e) => setTradeAsset(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {displayHoldings.map((h) => (
                  <option key={h.id} value={h.symbol}>{h.symbol} - {h.name}</option>
                ))}
              </select>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Amount (USD)</label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              />
            </div>

            {/* Recent transactions preview */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Recent</p>
              <div className="space-y-2">
                {mockTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          tx.type === 'Buy' ? 'bg-emerald-600' : tx.type === 'Transfer' ? 'bg-sky-600' : 'bg-red-600'
                        }`}
                      >
                        {tx.type === 'Buy' ? '↑' : tx.type === 'Transfer' ? '⇄' : '↓'}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-300">{tx.type} {tx.coinSymbol}</p>
                        <p className="text-xs text-slate-500">{tx.date}</p>
                      </div>
                    </div>
                    <p
                      className={`text-xs font-semibold ${
                        tx.type === 'Buy' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-sky-400' : 'text-red-400'
                      }`}
                    >
                      {tx.type === 'Buy' ? '+' : tx.type === 'Transfer' ? '⇄' : '-'}
                      ${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA button */}
            <button
              className={`mt-auto w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors ${
                tradeType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {tradeAsset}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
