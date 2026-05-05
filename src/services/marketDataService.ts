import type { HistoryPoint, PriceRange, Quote } from '../types';

const MARKET_ERROR = '暂时无法获取实时行情，请稍后再试。';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 12000;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(MARKET_ERROR);
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || MARKET_ERROR);
  return data as T;
}

async function getJson<T>(url: string): Promise<T> {
  async function fetchWithTimeout(target: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(target, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  try {
    return await readJsonResponse<T>(await fetchWithTimeout(url));
  } catch (error) {
    if (!url.startsWith('/api')) throw error;
    return readJsonResponse<T>(await fetchWithTimeout(`${API_BASE_URL}${url}`));
  }
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
