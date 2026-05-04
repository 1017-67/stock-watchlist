const quoteCache = new Map();
const historyCache = new Map();
const CACHE_MS = 60 * 1000;

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

function getFinnhubKey() {
  return process.env.FINNHUB_API_KEY?.trim();
}

function readCache(cache, key) {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.createdAt > CACHE_MS) return null;
  return hit.value;
}

function writeCache(cache, key, value) {
  cache.set(key, { createdAt: Date.now(), value });
}

async function fetchFinnhub(path, params) {
  const token = getFinnhubKey();
  if (!token) {
    const error = new Error('FINNHUB_API_KEY is missing');
    error.code = 'MISSING_MARKET_KEY';
    throw error;
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  Object.entries({ ...params, token }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Finnhub request failed: ${response.status}`);
    error.code = 'MARKET_PROVIDER_ERROR';
    throw error;
  }
  return response.json();
}

export function normalizeQuote(raw, symbol) {
  const currentPrice = Number(raw.c ?? 0);
  const change = Number(raw.d ?? 0);
  const changePercent = Number(raw.dp ?? 0);

  return {
    symbol,
    currentPrice,
    change,
    changePercent,
    high: Number(raw.h ?? 0),
    low: Number(raw.l ?? 0),
    open: Number(raw.o ?? 0),
    previousClose: Number(raw.pc ?? 0),
    timestamp: raw.t ? Number(raw.t) * 1000 : Date.now(),
    source: 'finnhub'
  };
}

export function normalizeHistory(raw) {
  if (!raw || raw.s !== 'ok' || !Array.isArray(raw.t)) return [];
  return raw.t.map((time, index) => ({
    date: new Date(Number(time) * 1000).toISOString().slice(0, 10),
    price: Number(raw.c[index] ?? 0),
    open: Number(raw.o[index] ?? 0),
    high: Number(raw.h[index] ?? 0),
    low: Number(raw.l[index] ?? 0),
    volume: Number(raw.v[index] ?? 0)
  }));
}

export async function searchSymbols(query) {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const data = await fetchFinnhub('/search', { q: trimmed });
  return (data.result ?? []).slice(0, 12).map((item) => ({
    symbol: item.symbol,
    description: item.description,
    displaySymbol: item.displaySymbol,
    type: item.type,
    source: 'finnhub'
  }));
}

export async function getQuote(symbol) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error('symbol is required');

  const cacheKey = `quote:${normalizedSymbol}`;
  const cached = readCache(quoteCache, cacheKey);
  if (cached) return cached;

  const raw = await fetchFinnhub('/quote', { symbol: normalizedSymbol });
  const quote = normalizeQuote(raw, normalizedSymbol);
  writeCache(quoteCache, cacheKey, quote);
  return quote;
}

function getHistoryParams(range) {
  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  const normalizedRange = range || '1M';

  if (normalizedRange === '1D') {
    return { resolution: '30', from: now - day, to: now };
  }
  if (normalizedRange === '1W') {
    return { resolution: '60', from: now - 7 * day, to: now };
  }
  if (normalizedRange === '6M') {
    return { resolution: 'D', from: now - 183 * day, to: now };
  }
  if (normalizedRange === '1Y') {
    return { resolution: 'D', from: now - 365 * day, to: now };
  }
  return { resolution: 'D', from: now - 31 * day, to: now };
}

export async function getPriceHistory(symbol, range) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error('symbol is required');

  const cacheKey = `history:${normalizedSymbol}:${range || '1M'}`;
  const cached = readCache(historyCache, cacheKey);
  if (cached) return cached;

  const raw = await fetchFinnhub('/stock/candle', {
    symbol: normalizedSymbol,
    ...getHistoryParams(range)
  });
  const history = normalizeHistory(raw);
  writeCache(historyCache, cacheKey, history);
  return history;
}

export async function getCompanyProfile(symbol) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error('symbol is required');
  return fetchFinnhub('/stock/profile2', { symbol: normalizedSymbol });
}
