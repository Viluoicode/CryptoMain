const fs = require('fs');

const content = `import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import type { TransactionResponse } from '../api/transactionApi';

type TypeFilter = 'All' | 'Buy' | 'Sell';

// Deterministic icon colour derived from coinSymbol
const COIN_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
function coinColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return COIN_COLORS[Math.abs(hash) % COIN_COLORS.length];
}

function txTypeLabel(type: TransactionResponse['type']): 'Buy' | 'Sell' {
  if (type === 1) return 'Buy';
  if (type === 2) return 'Sell';
  return 'Sell';
}

function TypeBadge({ type }: { type: TransactionResponse['type'] }) {
  const label = txTypeLabel(type);
  const cls = label === 'Buy' ? 'bg-emerald-500' : 'bg-red-500';
  const icon = label === 'Buy' ? '↑' : '↓';
  return (
    <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 \${cls}\`}>
      {icon}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TransactionsPage() {
  const { transactions, loading, error, refresh } = useTransactions();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = transactions.filter((tx) => {
    if (typeFilter !== 'All' && txTypeLabel(tx.type) !== typeFilter) return false;
    if (search && !tx.coinName.toLowerCase().includes(search.toLowerCase()) &&
        !tx.coinSymbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && tx.transactionDate.slice(0, 10) < dateFrom) return false;
    if (dateTo && tx.transactionDate.slice(0, 10) > dateTo) return false;
    return true;
  });

  const totalBought = transactions
    .filter((t) => t.type === 1)
    .reduce((s, t) => s + t.totalAmount, 0);
  const totalSold = transactions
    .filter((t) => t.type === 2)
    .reduce((s, t) => s + t.totalAmount, 0);

  const hasActiveFilter = typeFilter !== 'All' || search !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>
          {error && (
            <button
              onClick={refresh}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Retry
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-4 flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 text-sm bg-[#1A1F2D] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 text-sm bg-[#1A1F2D] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500"
            >
              {(['All', 'Buy', 'Sell'] as TypeFilter[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1A1F2D] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1A1F2D] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilter && (
            <button
              onClick={() => { setTypeFilter('All'); setSearch(''); setDateFrom(''); setDateTo(''); }}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">Loading transactions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">
                {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wide bg-[#1A1F2D] border-b border-slate-800">
                    <th className="px-5 py-3 font-medium">Token</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium text-right">Price</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Wallet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#1A1F2D]/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: coinColor(tx.coinSymbol) }}
                          >
                            {tx.coinSymbol.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{tx.coinName}</p>
                            <p className="text-xs text-slate-400">{tx.coinSymbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={tx.type} />
                          <span className="text-sm font-medium text-slate-300">{txTypeLabel(tx.type)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-300">
                        {tx.quantity} {tx.coinSymbol}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-300">
                        \${tx.pricePerCoin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-white">
                        \${tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{formatDate(tx.transactionDate)}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{tx.walletName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-72 shrink-0 space-y-6">
        {/* Summary Cards */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Summary</h3>
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-white">{transactions.length}</p>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Bought</p>
            <p className="text-xl font-bold text-emerald-500">
              \${totalBought.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Sold</p>
            <p className="text-xl font-bold text-red-500">
              \${totalSold.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <p className="text-xs text-slate-400 mb-1">Net Position</p>
            <p className={\`text-xl font-bold \${totalBought - totalSold >= 0 ? 'text-emerald-500' : 'text-red-500'}\`}>
              \${(totalBought - totalSold).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Type breakdown */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">By Type</h3>
          {([
            { label: 'Buy',  typeVal: 1, color: 'bg-emerald-500' },
            { label: 'Sell', typeVal: 2, color: 'bg-red-500' },
          ]).map(({ label, typeVal, color }) => {
            const count = transactions.filter((t) => t.type === typeVal).length;
            return (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={\`w-3 h-3 rounded-full \${color}\`} />
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                </div>
                <span className="text-sm font-semibold text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('d:/DNTU/Tự Học/Crypto/crypto-dashboard-frontend/src/pages/TransactionsPage.tsx', content, 'utf8');
console.log('Fixed Transactions Page merge conflict!');
