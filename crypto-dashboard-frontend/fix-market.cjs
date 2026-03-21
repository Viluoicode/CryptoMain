const fs = require('fs');

const content = `import { useState } from 'react';
import { useCryptoMarket } from '../hooks/useCryptoMarket';
import type { CryptoListResponse } from '../api/cryptoApi';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtLarge(n: number) {
  if (n >= 1_000_000_000) return \`$\${(n / 1_000_000_000).toFixed(2)}B\`;
  if (n >= 1_000_000) return \`$\${(n / 1_000_000).toFixed(2)}M\`;
  return \`$\${n.toLocaleString('en-US')}\`;
}

function ChangePill({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className={\`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full \${
        pos ? 'text-emerald-500' : 'text-red-500'
      }\`}
    >
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function CoinIcon({ coin }: { coin: CryptoListResponse }) {
  const [imgError, setImgError] = useState(false);
  if (coin.image && !imgError) {
    return (
      <img
        src={coin.image}
        alt={coin.symbol}
        className="w-8 h-8 rounded-full shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  
  // Deterministic icon colour derived from coinSymbol
  const COIN_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < coin.symbol.length; i++) {
    hash = coin.symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = COIN_COLORS[Math.abs(hash) % COIN_COLORS.length];

  return (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
      style={{ backgroundColor: color }}
    >
      {coin.symbol.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MarketPage() {
  const { coins, loading, error, watchlist, toggleWatchlist, refetch } = useCryptoMarket(10);
  const [search, setSearch] = useState('');
  const [fromAmount, setFromAmount] = useState('1');
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');

  // Build a symbol→price map from live data for the converter
  const coinRates: Record<string, number> = {};
  coins.forEach((c) => {
    coinRates[c.symbol.toUpperCase()] = c.currentPrice;
  });

  // Default converter selections to first two coins once data loads
  const symbols = Object.keys(coinRates);
  const effectiveFrom = fromCoin && coinRates[fromCoin] !== undefined ? fromCoin : (symbols[0] ?? '');
  const effectiveTo = toCoin && coinRates[toCoin] !== undefined ? toCoin : (symbols[1] ?? '');

  const fromRate = coinRates[effectiveFrom] ?? 1;
  const toRate = coinRates[effectiveTo] ?? 1;
  const converted = (parseFloat(fromAmount) || 0) * (fromRate / toRate);

  const filtered = coins.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  const watchlistCoins = coins.filter((c) => watchlist.has(c.id));

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Main table */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Market Overview</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => void refetch()}
              className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
              title="Refresh"
            >
              🔄
            </button>
            <input
              type="text"
              placeholder="Search coin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 text-sm bg-[#151924] border border-slate-700 text-white rounded-xl focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-[#151924] rounded-xl border border-slate-800 overflow-x-auto p-4">
          <table className="w-full text-sm text-left text-slate-300">
            <thead>
              <tr className="text-xs uppercase bg-[#1A1F2D] text-slate-400">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">24h %</th>
                <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">Market Cap</th>
                <th className="px-4 py-3 font-medium text-right hidden xl:table-cell">Volume (24h)</th>
                <th className="px-4 py-3 font-medium text-center">Watch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">
                    Loading market data…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No coins found matching "{search}"
                  </td>
                </tr>
              )}
              {!loading && filtered.map((coin, index) => (
                <tr key={coin.id} className="hover:bg-[#1A1F2D]/50 transition-colors">
                  <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <CoinIcon coin={coin} />
                      <div>
                        <div className="font-semibold text-white">{coin.name}</div>
                        <div className="text-xs text-slate-500">{coin.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-white">
                    \${coin.currentPrice < 10 ? fmt(coin.currentPrice, 4) : fmt(coin.currentPrice)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <ChangePill value={coin.priceChangePercentage24h} />
                  </td>
                  <td className="px-4 py-4 text-right text-slate-400 hidden lg:table-cell">
                    {fmtLarge(coin.marketCap)}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-400 hidden xl:table-cell">
                    {fmtLarge(coin.totalVolume)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => toggleWatchlist(coin.id)}
                      className={\`text-lg transition-colors \${
                        watchlist.has(coin.id) ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }\`}
                    >
                      ★
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 space-y-6">
        {/* USD Converter */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Convert</h3>
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-4">Loading prices…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-2 block">From</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="flex-1 w-full px-3 py-2 bg-[#1A1F2D] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 min-w-0"
                  />
                  <select
                    value={effectiveFrom}
                    onChange={(e) => setFromCoin(e.target.value)}
                    className="px-2 py-2 bg-[#1A1F2D] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-center">
                 <span className="text-slate-600 text-xl transform rotate-90">⇄</span>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-2 block">To</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-[#1A1F2D]/50 border border-slate-700/50 rounded-lg text-slate-300 font-medium overflow-hidden text-ellipsis truncate">
                    {isNaN(converted) ? '0.00' : converted.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                  </div>
                  <select
                    value={effectiveTo}
                    onChange={(e) => setToCoin(e.target.value)}
                    className="px-2 py-2 bg-[#1A1F2D] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="text-center pt-2">
                 <p className="text-xs text-slate-500">
                   1 {effectiveFrom} = {(toRate > 0 ? (fromRate / toRate) : 0).toLocaleString('en-US', { maximumFractionDigits: 8 })} {effectiveTo}
                 </p>
              </div>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">My Watchlist</h3>
          <div className="space-y-4">
            {watchlistCoins.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">Star a coin to add it directly to your watchlist.</p>
            ) : (
                watchlistCoins.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 hover:bg-[#1A1F2D] rounded-lg transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <CoinIcon coin={item} />
                      <div>
                          <div className="text-sm font-semibold text-white">{item.symbol.toUpperCase()}</div>
                          <div className="text-xs text-slate-500">{item.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                          \${item.currentPrice < 10 ? fmt(item.currentPrice, 4) : fmt(item.currentPrice)}
                      </div>
                      <div
                          className={\`text-xs font-semibold \${
                          item.priceChangePercentage24h >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }\`}
                      >
                          {item.priceChangePercentage24h >= 0 ? '▲' : '▼'} {Math.abs(item.priceChangePercentage24h).toFixed(2)}%
                      </div>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('d:/DNTU/Tự Học/Crypto/crypto-dashboard-frontend/src/pages/MarketPage.tsx', content, 'utf8');
console.log('Fixed MarketPage merge conflict!');
