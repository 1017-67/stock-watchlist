export function formatCurrency(value?: number, currency = 'USD') {
  if (value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function currencyForSymbol(symbol?: string, fallback = 'USD') {
  const normalized = symbol?.toUpperCase() || '';
  if (normalized.endsWith('.SS') || normalized.endsWith('.SZ')) return 'CNY';
  if (normalized.endsWith('.HK')) return 'HKD';
  if (normalized.endsWith('.T')) return 'JPY';
  return fallback;
}

export function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatNumber(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
}

export function nowLabel(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
