import { useState, useEffect, type FormEvent } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockUser, mockHoldings,  portfolioHistory,
  assetDistribution, marketCoins, mockTransactions,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { ApiError } from '../api/apiClient';
import { walletApi, type WalletResponse } from '../api/walletApi';
import { transactionApi } from '../api/transactionApi';
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
interface StatCardProps {
  title: string;
  subtitle: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}
function StatCard({ title, subtitle, value, change, isPositive, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.05] bg-[#151924] p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-opacity-20 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[28px] font-bold tracking-tight text-white">{value}</p>
        {change && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span className={`flex items-center font-semibold ${isPositive ? 'text-[#00B087]' : 'text-[#FF4B4B]'}`}>
              {change}
            </span>
            <span className="text-slate-500">vs last week</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────
interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string }[]; 
  label?: string;
}
function PortfolioTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/[0.1] bg-[#1A1B24] px-4 py-3 shadow-xl">
        <p className="mb-1 text-xs text-slate-400">{label}</p>
        <p className="text-base font-bold text-white">${payload[0].value.toLocaleString('en-US')}</p>
      </div>
    );
  }
  return null;
}

function AllocationTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/[0.1] bg-[#1A1B24] px-3 py-2 shadow-xl">
        <p className="text-xs font-semibold text-white">{payload[0].name}: ${payload[0].value.toLocaleString('en-US')}</p>
      </div>
    );
  }
  return null;
}

function tokenClasses(symbol: string) {
  if (symbol === 'BTC') return { dot: 'bg-amber-400', coin: 'bg-amber-500/20 text-amber-300' };
  if (symbol === 'ETH') return { dot: 'bg-indigo-400', coin: 'bg-indigo-500/20 text-indigo-300' };
  if (symbol === 'SOL') return { dot: 'bg-violet-400', coin: 'bg-violet-500/20 text-violet-300' };
  if (symbol === 'ADA') return { dot: 'bg-blue-400', coin: 'bg-blue-500/20 text-blue-300' };
  return { dot: 'bg-rose-400', coin: 'bg-rose-500/20 text-rose-300' };
}

type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
const periods: Period[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

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

  const [activePeriod, setActivePeriod] = useState<Period>('1M');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeAsset, setTradeAsset] = useState(''); // stores coinId
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeWalletId, setTradeWalletId] = useState('');
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const mockTotalInvested = mockHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const mockUnrealizedPnl = mockUser.totalBalance - mockTotalInvested;

  const userBalance = summary?.totalCurrentValue ?? mockUser.totalBalance;
  const userProfit = summary?.totalProfitLoss ?? mockUser.balanceChange;
  const totalInvested = summary?.totalInvestedValue ?? mockTotalInvested;
  const unrealizedPnl = performance?.unrealizedProfitLoss ?? mockUnrealizedPnl;
  const unrealizedPnlPct = performance?.unrealizedProfitLossPercentage ??
    ((mockUnrealizedPnl / mockTotalInvested) * 100);

  const profitChangeValue = summary
    ? `${summary.totalProfitLossPercentage >= 0 ? '+' : ''}${summary.totalProfitLossPercentage.toFixed(2)}% all time`
    : `+ $1,248 (+2.01%)`;

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

  const chartData = portfolioHistory[activePeriod] || portfolioHistory['1M'];

  // ── Sync default selected asset to first holding's coinId ──────────────────
  useEffect(() => {
    if (displayHoldings.length > 0 && tradeAsset === '') {
      setTradeAsset(displayHoldings[0].id);
    }
  }, [displayHoldings, tradeAsset]);

  // ── Fetch user wallets for Quick Trade ────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    walletApi.getAll()
      .then((data) => {
        setWallets(data);
        // Use functional updater so tradeWalletId is not a dependency
        setTradeWalletId((prev) => prev || (data[0]?.id ?? ''));
      })
      .catch(() => {
        setTradeError('Could not load wallets. Please refresh the page.');
      });
  }, [isAuthenticated]);

  // ── Quick Trade submit ─────────────────────────────────────────────────────
  async function handleQuickTrade() {
    setTradeError(null);
    setTradeSuccess(null);

    if (!tradeWalletId) {
      setTradeError('No wallet found. Please create a wallet first.');
      return;
    }
    const amount = Number(tradeAmount);
    if (!tradeAmount || amount <= 0) {
      setTradeError('Enter a valid USD amount greater than 0.');
      return;
    }
    const holding = displayHoldings.find((h) => h.id === tradeAsset);
    if (!holding || holding.currentPrice <= 0) {
      setTradeError('Cannot determine coin price. Please try again.');
      return;
    }

    const quantity = amount / holding.currentPrice;

    setTradeLoading(true);
    try {
      await transactionApi.create({
        walletId: tradeWalletId,
        coinId: tradeAsset,
        type: tradeType === 'buy' ? 1 : 2,
        quantity,
        pricePerCoin: holding.currentPrice,
      });
      setTradeAmount('');
      setTradeSuccess(
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${holding.symbol} successfully!`,
      );
      refresh(); // refresh portfolio data
    } catch (err) {
      setTradeError(
        err instanceof ApiError
          ? `Trade failed (${err.status}): ${err.message}`
          : 'Trade failed. Please try again.',
      );
    } finally {
      setTradeLoading(false);
    }
  }

  return (
    <>
      {!isAuthenticated && <LoginModal />}

      <div className="flex flex-col gap-6 p-6 lg:p-8 bg-[#0B0E14] min-h-screen">
        
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Portfolio Value" subtitle="All assets combined"
            value={`$${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={profitChangeValue} isPositive={userProfit >= 0}
            icon={<span className="text-xl font-bold">$</span>} iconBg="bg-[#6C5CE7]/10" iconColor="text-[#A29BFE]"
          />
          <StatCard
            title="24h Profit/Loss" subtitle="Today's performance"
            value={`$${userProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })}`} 
            change={profitChangeValue} isPositive={userProfit >= 0}
            icon={<span className="text-xl font-bold">📈</span>} iconBg="bg-[#00B087]/10" iconColor="text-[#00B087]"
          />
          <StatCard
            title="Total Invested" subtitle="Capital deployed"
            value={`$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={`+ $2,100 (+4.6%)`} isPositive={true}
            icon={<span className="text-xl font-bold">💼</span>} iconBg="bg-[#FF9900]/10" iconColor="text-[#FFB347]"
          />
          <StatCard
            title="Unrealized Gains" subtitle="Open positions"
            value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={`${Math.abs(unrealizedPnlPct).toFixed(2)}%`} isPositive={unrealizedPnl >= 0}
            icon={<span className="text-xl font-bold">🎯</span>} iconBg="bg-[#6C5CE7]/10" iconColor="text-[#A29BFE]"
          />
        </div>

        {/* ── Row 2: Charts ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Portfolio Chart */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#151924] p-6 lg:col-span-2 shadow-sm flex flex-col">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-400">Portfolio Performance</h2>
                <div className="mt-1 flex items-baseline gap-3">
                  <p className="text-[32px] font-bold tracking-tight text-white">
                    ${(chartData[chartData.length - 1]?.value ?? 0).toLocaleString('en-US')}
                  </p>
                  <span className={`text-sm font-semibold ${userProfit >= 0 ? 'text-[#00B087]' : 'text-[#FF4B4B]'}`}>
                    {profitChangeValue}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-[#0D0E14] p-1">
                {periods.map((p) => (
                  <button key={p} onClick={() => setActivePeriod(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activePeriod === p ? 'bg-[#6C5CE7] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                    {p === 'ALL' ? 'All' : p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[280px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" dy={10} />
                  <YAxis tick={{ fill: '#4B5563', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} dx={-10} />
                  <Tooltip content={<PortfolioTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="value" stroke="#6C5CE7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#6C5CE7', stroke: '#111218', strokeWidth: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#151924] p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-semibold text-white">Asset Allocation</h2>
            <p className="mt-0.5 text-xs text-slate-500">Portfolio distribution</p>
            
            <div className="mt-6 flex flex-col items-center gap-6 flex-1">
              <div className="relative h-[200px] w-full shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={displayAssetDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {displayAssetDistribution.map((entry) => (<Cell key={entry.symbol} fill={entry.color} />))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full space-y-3 mt-auto">
                {displayAssetDistribution.map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${tokenClasses(asset.symbol).dot}`} style={{ backgroundColor: asset.color }} />
                      <span className="text-sm font-medium text-slate-300">{asset.symbol}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{asset.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Market Overview + Quick Trade ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Bảng giá */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.05] bg-[#151924] lg:col-span-2 shadow-sm">
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Market Overview</h2>
                <p className="mt-0.5 text-xs text-slate-500">Live crypto prices</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 text-left font-medium">Asset</th>
                    <th className="px-6 py-3 text-right font-medium">Price</th>
                    <th className="px-6 py-3 text-right font-medium">24h</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {marketCoins.slice(0, 4).map((coin) => (
                    <tr key={coin.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tokenClasses(coin.symbol).coin}`}>
                            {coin.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{coin.name}</p>
                            <p className="text-xs text-slate-500">{coin.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${coin.change24h >= 0 ? 'text-[#00B087]' : 'text-[#FF4B4B]'}`}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Đặt lệnh nhanh */}
          <div className="flex flex-col rounded-2xl border border-white/[0.05] bg-[#151924] p-6 shadow-sm h-full">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white">Quick Trade</h2>
              <p className="mt-0.5 text-xs text-slate-500">Place instant orders</p>
            </div>
            <div className="flex flex-col gap-6 flex-1">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#0D0E14] p-1">
                <button onClick={() => setTradeType('buy')} className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${tradeType === 'buy' ? 'bg-[#00B087] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Buy</button>
                <button onClick={() => setTradeType('sell')} className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${tradeType === 'sell' ? 'bg-[#FF4B4B] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Sell</button>
              </div>

              {/* Wallet selector — shown only when user has multiple wallets */}
              {wallets.length > 1 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Wallet</label>
                  <select
                    value={tradeWalletId}
                    onChange={(e) => setTradeWalletId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.05] bg-[#0D0E14] px-4 py-3 text-sm font-medium text-white shadow-sm focus:border-[#6C5CE7] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Asset selector — value is coinId; populated from real API holdings or mock */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Asset</label>
                <select
                  value={tradeAsset}
                  onChange={(e) => setTradeAsset(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.05] bg-[#0D0E14] px-4 py-3 text-sm font-medium text-white shadow-sm focus:border-[#6C5CE7] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                >
                  {displayHoldings.map((h) => (
                    <option key={h.id} value={h.id}>{h.symbol} - {h.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount input */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Amount (USD)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.05] bg-[#0D0E14] px-4 py-3 text-sm font-medium text-white shadow-sm placeholder-slate-600 focus:border-[#6C5CE7] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
                {/* Estimated quantity preview */}
                {tradeAmount && Number(tradeAmount) > 0 && (() => {
                  const h = displayHoldings.find((x) => x.id === tradeAsset);
                  if (!h || h.currentPrice <= 0) return null;
                  const qty = (Number(tradeAmount) / h.currentPrice).toFixed(8);
                  return (
                    <p className="mt-1 text-xs text-slate-500">
                      ≈ {qty} {h.symbol}
                    </p>
                  );
                })()}
              </div>

              {/* Trade feedback messages */}
              {tradeError && (
                <p className="text-xs text-[#FF4B4B] bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 rounded-lg px-3 py-2">
                  {tradeError}
                </p>
              )}
              {tradeSuccess && (
                <p className="text-xs text-[#00B087] bg-[#00B087]/10 border border-[#00B087]/20 rounded-lg px-3 py-2">
                  ✓ {tradeSuccess}
                </p>
              )}

              {/* Recent transactions preview */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Recent</p>
                <div className="space-y-2">
                  {mockTransactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                            tx.type === 'Buy' ? 'bg-[#00B087]' : tx.type === 'Transfer' ? 'bg-[#6C5CE7]' : 'bg-[#FF4B4B]'
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
                          tx.type === 'Buy' ? 'text-[#00B087]' : tx.type === 'Transfer' ? 'text-[#6C5CE7]' : 'text-[#FF4B4B]'
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
                onClick={handleQuickTrade}
                disabled={tradeLoading || !isAuthenticated}
                className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  tradeType === 'buy'
                    ? 'bg-[#00B087] hover:bg-[#009D78]'
                    : 'bg-[#FF4B4B] hover:bg-[#FF3333]'
                }`}
              >
                {tradeLoading
                  ? 'Processing…'
                  : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${displayHoldings.find((h) => h.id === tradeAsset)?.symbol ?? tradeAsset}`
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
