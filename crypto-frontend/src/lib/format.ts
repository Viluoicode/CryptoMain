/** Format số thành USD: 1234.5 → "$1,234.50" */
export function formatUSD(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value)
}

/** Format phần trăm: 12.345 → "+12.35%" */
export function formatPct(value: number, digits = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

/** Format số lượng coin: 0.00012345 → "0.00012345" */
export function formatQty(value: number): string {
  if (value >= 1) return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return value.toFixed(8).replace(/\.?0+$/, '')
}

/** Format datetime: ISO string → "Jan 1, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Format market cap: 1_234_567_890 → "$1.23B" */
export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`
  return formatUSD(value, 0)
}
