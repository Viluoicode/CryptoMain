import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { portfolioHistory, assetDistribution, tokenPerformance } from '../data/mockData';

const TIME_FILTERS = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;
type TimeFilter = typeof TIME_FILTERS[number];

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export default function AnalyticsPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('1M');
  const chartData = portfolioHistory[activeFilter];
  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const firstValue = chartData[0]?.value ?? 0;
  const change = lastValue - firstValue;
  const changePct = firstValue > 0 ? (change / firstValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen">
      {/* Portfolio Performance Chart */}
      <div className="bg-[#151924] rounded-xl border border-slate-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
            <p className="text-3xl font-bold text-white mt-2">
              ${lastValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-2 text-sm font-semibold ${
                isPositive ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {isPositive ? '▲' : '▼'}{' '}
              ${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2 })} (
              {Math.abs(changePct).toFixed(2)}%)
            </span>
          </div>
          {/* Time Filter Buttons */}
          <div className="flex gap-2 bg-[#1A1F2D] rounded-lg p-1">
            {TIME_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeFilter === f
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Tooltip
              formatter={(v) => {
                const num = typeof v === 'number' ? v : 0;
                return [`$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Portfolio Value'] as [string, string];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#1E293B',
                color: '#fff',
                fontSize: 12,
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Asset Distribution + Token Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Asset Distribution</h2>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={assetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {assetDistribution.map((entry) => (
                    <Cell key={entry.symbol} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => {
                    const num = typeof v === 'number' ? v : 0;
                    return [`$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Value'] as [string, string];
                  }}
                  contentStyle={{ 
                      borderRadius: '8px', 
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: 12 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4 min-w-0 w-full">
              {assetDistribution.map((a) => (
                <div key={a.symbol} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: a.color }}
                        />
                        <span className="text-sm font-medium text-white truncate">{a.name}</span>
                     </div>
                     <span className="text-sm font-semibold text-slate-300">
                        {a.percentage.toFixed(1)}%
                     </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Token Performance */}
        <div className="bg-[#151924] rounded-xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Token Performance</h2>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-800">
                  <th className="pb-3 px-2">Token</th>
                  <th className="pb-3 px-2 text-right">7D</th>
                  <th className="pb-3 px-2 text-right">30D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tokenPerformance.map((t) => (
                  <tr key={t.symbol} className="hover:bg-[#1A1F2D]/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: t.iconColor }}
                        >
                          {t.symbol.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-xs text-slate-400">{t.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <ChangeBadge value={t.change7d} />
                    </td>
                    <td className="py-4 px-2 text-right">
                      <ChangeBadge value={t.change30d} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        positive
          ? 'text-emerald-500'
          : 'text-red-500'
      }`}
    >
      {positive ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}
