import { mockUser, mockHoldings, mockTransactions } from '../data/mockData';

function StatCard({ title, value, change, isPositive }: { title: string; value: string; change?: string; isPositive?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {change && (
        <p className={`text-sm mt-1 font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? '▲' : '▼'} {change}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const totalInvested = mockHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const unrealizedPnl = mockUser.totalBalance - totalInvested;
  const pnlPercent = ((unrealizedPnl / totalInvested) * 100).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Portfolio Value"
          value={`$${mockUser.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={`$${mockUser.balanceChange.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${mockUser.balanceChangePercent}%)`}
          isPositive={mockUser.balanceChange > 0}
        />
        <StatCard
          title="Total Invested"
          value={`$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          title="Unrealized P&L"
          value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={`${pnlPercent}% all time`}
          isPositive={unrealizedPnl >= 0}
        />
        <StatCard
          title="Assets Held"
          value={`${mockHoldings.length}`}
          change="Active holdings"
          isPositive={true}
        />
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">My Holdings</h2>
          <a href="/portfolio" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View All →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                <th className="px-6 py-3 text-left font-medium">Asset</th>
                <th className="px-6 py-3 text-right font-medium">Price</th>
                <th className="px-6 py-3 text-right font-medium">Holdings</th>
                <th className="px-6 py-3 text-right font-medium">Value</th>
                <th className="px-6 py-3 text-right font-medium">24h Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockHoldings.map((holding) => (
                <tr key={holding.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: holding.iconColor }}
                      >
                        {holding.symbol.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{holding.name}</p>
                        <p className="text-xs text-slate-400">{holding.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700">
                    ${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {holding.quantity} {holding.symbol}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-medium ${
                        holding.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {holding.change24h >= 0 ? '▲' : '▼'} {Math.abs(holding.change24h).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View All →
          </a>
        </div>
        <div className="divide-y divide-slate-50">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                    tx.type === 'Buy' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                >
                  {tx.type === 'Buy' ? '↑' : '↓'}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {tx.type} {tx.coinName}
                  </p>
                  <p className="text-xs text-slate-400">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tx.type === 'Buy' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'Buy' ? '+' : '-'}${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">
                  {tx.quantity} {tx.coinSymbol} @ ${tx.price.toLocaleString('en-US')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
