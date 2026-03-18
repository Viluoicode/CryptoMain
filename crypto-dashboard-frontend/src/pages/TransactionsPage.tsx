import { useState } from 'react';
import { mockTransactions } from '../data/mockData';
import type { Transaction } from '../types';

type StatusFilter = 'All' | 'Completed' | 'Pending' | 'Failed';
type TypeFilter = 'All' | 'Buy' | 'Sell' | 'Transfer';

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const map: Record<Transaction['status'], string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Pending: 'bg-amber-50 text-amber-700 border-amber-100',
    Failed: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${map[status]}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: Transaction['type'] }) {
  const map: Record<Transaction['type'], string> = {
    Buy: 'bg-emerald-500',
    Sell: 'bg-red-500',
    Transfer: 'bg-sky-500',
  };
  const icon: Record<Transaction['type'], string> = { Buy: '↑', Sell: '↓', Transfer: '⇄' };
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${map[type]}`}>
      {icon[type]}
    </div>
  );
}

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = mockTransactions.filter((tx) => {
    if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
    if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
    if (search && !tx.coinName.toLowerCase().includes(search.toLowerCase()) &&
        !tx.coinSymbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    return true;
  });

  const totalBought = mockTransactions
    .filter((t) => t.type === 'Buy' && t.status === 'Completed')
    .reduce((s, t) => s + t.total, 0);
  const totalSold = mockTransactions
    .filter((t) => t.type === 'Sell' && t.status === 'Completed')
    .reduce((s, t) => s + t.total, 0);

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Transaction History</h2>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {(['All', 'Completed', 'Pending', 'Failed'] as StatusFilter[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {(['All', 'Buy', 'Sell', 'Transfer'] as TypeFilter[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'All' || typeFilter !== 'All' || search || dateFrom || dateTo) && (
            <button
              onClick={() => { setStatusFilter('All'); setTypeFilter('All'); setSearch(''); setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No transactions match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left font-semibold">Token</th>
                    <th className="px-5 py-3 text-left font-semibold">Type</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-right font-semibold">Price</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: tx.iconColor }}
                          >
                            {tx.coinSymbol.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{tx.coinName}</p>
                            <p className="text-xs text-slate-400">{tx.coinSymbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={tx.type} />
                          <span className="text-sm font-medium text-slate-700">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">
                        {tx.quantity} {tx.coinSymbol}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">
                        ${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-800">
                        ${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{tx.date}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 shrink-0 space-y-4">
        {/* Summary Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Transactions</p>
            <p className="text-xl font-bold text-slate-800">{mockTransactions.length}</p>
          </div>
          <div className="h-px bg-slate-100" />
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Bought</p>
            <p className="text-lg font-bold text-emerald-600">
              ${totalBought.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Sold</p>
            <p className="text-lg font-bold text-red-500">
              ${totalSold.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-px bg-slate-100" />
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Net Position</p>
            <p className={`text-lg font-bold ${totalBought - totalSold >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              ${(totalBought - totalSold).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">By Status</h3>
          {(['Completed', 'Pending', 'Failed'] as const).map((s) => {
            const count = mockTransactions.filter((t) => t.status === s).length;
            const color = s === 'Completed' ? 'bg-emerald-500' : s === 'Pending' ? 'bg-amber-400' : 'bg-red-500';
            return (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-sm text-slate-600">{s}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
