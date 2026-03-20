import { useState } from 'react';
import { useCryptoMarket } from '../hooks/useCryptoMarket';
import type { CryptoListResponse } from '../api/cryptoApi';

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
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500 text-white font-bold text-xs shrink-0">
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
    <div className="flex gap-6">
      {/* Main table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Market Overview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
              title="Refresh"
            >
              🔄
            </button>
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">24h %</th>
                  <th className="px-4 py-3 text-right font-semibold hidden lg:table-cell">Market Cap</th>
                  <th className="px-4 py-3 text-right font-semibold hidden xl:table-cell">Volume (24h)</th>
                  <th className="px-4 py-3 text-center font-semibold">★</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Loading market data…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                      No coins found.
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((coin, index) => (
                  <tr key={coin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <CoinIcon coin={coin} />
                        <div>
                          <p className="font-semibold text-slate-800">{coin.name}</p>
                          <p className="text-xs text-slate-400">{coin.symbol.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      ${coin.currentPrice < 10 ? fmt(coin.currentPrice, 4) : fmt(coin.currentPrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangePill value={coin.priceChangePercentage24h} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">
                      {fmtLarge(coin.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden xl:table-cell">
                      {fmtLarge(coin.totalVolume)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleWatchlist(coin.id)}
                        className={`text-lg transition-colors ${watchlist.has(coin.id) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
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
      </div>

      {/* Right Sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Converter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Converter</h3>
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-4">Loading prices…</p>
          ) : (
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
                    value={effectiveFrom}
                    onChange={(e) => setFromCoin(e.target.value)}
                    className="px-2 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
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
                    value={effectiveTo}
                    onChange={(e) => setToCoin(e.target.value)}
                    className="px-2 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                1 {effectiveFrom} = {toRate > 0 ? (fromRate / toRate).toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'} {effectiveTo}
              </p>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Watchlist</h3>
          {watchlistCoins.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Star a coin to add it to your watchlist.
            </p>
          ) : (
            <div className="space-y-3">
              {watchlistCoins.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CoinIcon coin={item} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.symbol.toUpperCase()}</p>
                      <p className="text-xs text-slate-400">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      ${item.currentPrice < 10 ? fmt(item.currentPrice, 4) : fmt(item.currentPrice)}
                    </p>
                    <span
                      className={`text-xs font-semibold ${
                        item.priceChangePercentage24h >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {item.priceChangePercentage24h >= 0 ? '▲' : '▼'} {Math.abs(item.priceChangePercentage24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
