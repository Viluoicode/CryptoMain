import { useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts';
import { marketCoins, watchlistItems } from '../data/mockData';
import type { MarketCoin } from '../types';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtLarge(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

function ChangePill({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        pos ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-500 bg-red-50 border border-red-100'
      }`}
    >
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? '#10B981' : '#EF4444'}
          strokeWidth={1.5}
          dot={false}
        />
        <Tooltip
          formatter={(v) => {
            const num = typeof v === 'number' ? v : 0;
            return [`$${fmt(num)}`, ''] as [string, string];
          }}
          contentStyle={{ fontSize: 11, borderRadius: 8, padding: '4px 8px' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const COIN_RATES: Record<string, number> = {
  BTC: 43_250,
  ETH: 2_890.50,
  SOL: 105.80,
  ADA: 0.812,
  BNB: 418.30,
  USDT: 1.0,
  XRP: 0.582,
  AVAX: 38.90,
};

export default function MarketPage() {
  const [search, setSearch] = useState('');
  const [fromAmount, setFromAmount] = useState('1');
  const [fromCoin, setFromCoin] = useState('BTC');
  const [toCoin, setToCoin] = useState('ETH');

  const filtered = marketCoins.filter(
    (c: MarketCoin) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  const fromRate = COIN_RATES[fromCoin] ?? 1;
  const toRate = COIN_RATES[toCoin] ?? 1;
  const converted = (parseFloat(fromAmount) || 0) * (fromRate / toRate);

  return (
    <div className="flex gap-6">
      {/* Main table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Market Overview</h2>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search coin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">1h %</th>
                  <th className="px-4 py-3 text-right font-semibold">24h %</th>
                  <th className="px-4 py-3 text-right font-semibold">7d %</th>
                  <th className="px-4 py-3 text-right font-semibold hidden lg:table-cell">Market Cap</th>
                  <th className="px-4 py-3 text-right font-semibold hidden xl:table-cell">Volume (24h)</th>
                  <th className="px-4 py-3 text-center font-semibold">Chart</th>
                  <th className="px-4 py-3 text-center font-semibold">★</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((coin) => (
                  <tr key={coin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{coin.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: coin.iconColor }}
                        >
                          {coin.symbol.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{coin.name}</p>
                          <p className="text-xs text-slate-400">{coin.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      ${coin.price < 10 ? fmt(coin.price, 4) : fmt(coin.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangePill value={coin.change1h} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangePill value={coin.change24h} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangePill value={coin.change7d} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">
                      {fmtLarge(coin.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden xl:table-cell">
                      {fmtLarge(coin.volume24h)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Sparkline data={coin.sparkline} positive={coin.change7d >= 0} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={coin.inWatchlist ? 'text-amber-400' : 'text-slate-300'}>★</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* USD Converter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Converter</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <select
                  value={fromCoin}
                  onChange={(e) => setFromCoin(e.target.value)}
                  className="px-2 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {Object.keys(COIN_RATES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-center text-slate-400 text-lg">⇅</div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">To</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700 truncate">
                  {isNaN(converted) ? '—' : converted.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                </div>
                <select
                  value={toCoin}
                  onChange={(e) => setToCoin(e.target.value)}
                  className="px-2 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {Object.keys(COIN_RATES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              1 {fromCoin} = {(fromRate / toRate).toLocaleString('en-US', { maximumFractionDigits: 6 })} {toCoin}
            </p>
          </div>
        </div>

        {/* Watchlist */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Watchlist</h3>
          <div className="space-y-3">
            {watchlistItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: item.iconColor }}
                  >
                    {item.symbol.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.symbol}</p>
                    <p className="text-xs text-slate-400">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    ${item.price < 10 ? fmt(item.price, 4) : fmt(item.price)}
                  </p>
                  <span
                    className={`text-xs font-semibold ${
                      item.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {item.change24h >= 0 ? '▲' : '▼'} {Math.abs(item.change24h).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
