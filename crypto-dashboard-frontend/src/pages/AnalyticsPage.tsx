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
    <div className="space-y-6">
      {/* Portfolio Performance Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Portfolio Performance</h2>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              ${lastValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-1 text-sm font-semibold ${
                isPositive ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {isPositive ? '▲' : '▼'}{' '}
              ${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2 })} (
              {Math.abs(changePct).toFixed(2)}%)
            </span>
          </div>
          {/* Time Filter Buttons */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {TIME_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeFilter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
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
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
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
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Asset Distribution</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
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
                  contentStyle={{ borderRadius: '12px', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3 min-w-0">
              {assetDistribution.map((a) => (
                <div key={a.symbol} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: a.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 truncate">{a.name}</span>
                      <span className="text-sm font-semibold text-slate-800 ml-2">
                        {a.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Token Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Token Performance</h2>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 pb-2 border-b border-slate-100">
              <span>Token</span>
              <span className="text-right">7D</span>
              <span className="text-right">30D</span>
            </div>
            {tokenPerformance.map((t) => (
              <div
                key={t.symbol}
                className="grid grid-cols-[1fr_80px_80px] items-center px-2 py-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: t.iconColor }}
                  >
                    {t.symbol.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <ChangeBadge value={t.change7d} />
                </div>
                <div className="text-right">
                  <ChangeBadge value={t.change30d} />
                </div>
              </div>
            ))}
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
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          : 'bg-red-50 text-red-500 border border-red-100'
      }`}
    >
      {positive ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}
