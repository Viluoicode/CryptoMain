import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { mockUser, mockHoldings, mockTransactions, portfolioHistory, assetDistribution, marketCoins } from '../data/mockData';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  change,
  isPositive,
  accentColor = 'bg-indigo-500',
}: {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
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
function PortfolioTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
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

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activePeriod, setActivePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeAsset, setTradeAsset] = useState('BTC');
  const [tradeAmount, setTradeAmount] = useState('');

  const totalInvested = mockHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const unrealizedPnl = mockUser.totalBalance - totalInvested;
  const pnlPercent = ((unrealizedPnl / totalInvested) * 100).toFixed(2);

  const chartData = portfolioHistory[activePeriod];
  const periods: Array<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'> = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  return (
    <div className="space-y-6">
      {/* ── Row 1: Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Portfolio Value"
          value={`$${mockUser.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={`$${mockUser.balanceChange.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${mockUser.balanceChangePercent}%)`}
          isPositive={mockUser.balanceChange > 0}
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
          change={`${pnlPercent}% all time`}
          isPositive={unrealizedPnl >= 0}
          accentColor={unrealizedPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
        <StatCard
          title="Assets Held"
          value={`${mockHoldings.length}`}
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
                data={assetDistribution}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
              >
                {assetDistribution.map((entry) => (
                  <Cell key={entry.symbol} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1E2433', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }}
                formatter={(value) => {
                  const num = typeof value === 'number' ? value : Number(value);
                  return [`$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {assetDistribution.map((asset) => (
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

          {/* Asset selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Asset</label>
            <select
              value={tradeAsset}
              onChange={(e) => setTradeAsset(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {mockHoldings.map((h) => (
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
                  <p className={`text-xs font-semibold ${tx.type === 'Buy' ? 'text-emerald-400' : tx.type === 'Transfer' ? 'text-sky-400' : 'text-red-400'}`}>
                    {tx.type === 'Buy' ? '+' : tx.type === 'Transfer' ? '⇄' : '-'}${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            className={`mt-auto w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors ${
              tradeType === 'buy'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {tradeType === 'buy' ? 'Buy' : 'Sell'} {tradeAsset}
          </button>
        </div>
      </div>
    </div>
  );
}

