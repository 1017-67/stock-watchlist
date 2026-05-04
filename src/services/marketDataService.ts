import type { HistoryPoint, PriceRange, Quote } from '../types';

const MARKET_ERROR = '暂时无法获取实时行情，请稍后再试。';

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || MARKET_ERROR);
  return data as T;
}

export async function searchSymbols(query: string) {
  if (!query.trim()) return [];
  const data = await getJson<{ results: Array<{ symbol: string; description: string; displaySymbol: string; type: string }> }>(
    `/api/market/search?q=${encodeURIComponent(query)}`
  );
  return data.results;
}

export async function getQuote(symbol: string) {
  const data = await getJson<{ quote: Quote }>(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`);
  return data.quote;
}

export async function getPriceHistory(symbol: string, range: PriceRange) {
  const data = await getJson<HistoryPoint[] | { history: HistoryPoint[] }>(
    `/api/market/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`
  );
  return Array.isArray(data) ? data : data.history;
}
