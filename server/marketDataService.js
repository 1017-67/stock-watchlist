const quoteCache = new Map();
const historyCache = new Map();
const CACHE_MS = 60 * 1000;

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const YAHOO_CHART_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

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
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function fetchFinnhubWithStatus(path, params) {
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
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

export function normalizeQuote(raw, symbol) {
  const currentPrice = Number(raw.c ?? 0);
  const change = Number(raw.d ?? 0);
  const changePercent = Number(raw.dp ?? 0);

  return {
    symbol,
    currency: inferCurrency(symbol),
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

export function normalizeHistory(raw, symbol, range) {
  if (!raw || raw.s !== 'ok' || !Array.isArray(raw.t)) return [];
  return raw.t.map((time, index) => ({
    time: formatHistoryLabel(Number(time) * 1000, symbol, range),
    price: Number(raw.c[index] ?? 0),
    currency: inferCurrency(symbol),
    open: Number(raw.o[index] ?? 0),
    high: Number(raw.h[index] ?? 0),
    low: Number(raw.l[index] ?? 0),
    volume: Number(raw.v[index] ?? 0)
  })).filter((point) => Number.isFinite(point.price) && point.price > 0);
}

function inferCurrency(symbol, fallback = 'USD') {
  const normalized = symbol?.toUpperCase() || '';
  if (normalized.endsWith('.SS') || normalized.endsWith('.SZ')) return 'CNY';
  if (normalized.endsWith('.HK')) return 'HKD';
  if (normalized.endsWith('.T')) return 'JPY';
  return fallback;
}

function inferTimeZone(symbol) {
  const normalized = symbol?.toUpperCase() || '';
  if (normalized.endsWith('.SS') || normalized.endsWith('.SZ')) return 'Asia/Shanghai';
  if (normalized.endsWith('.HK')) return 'Asia/Hong_Kong';
  if (normalized.endsWith('.T')) return 'Asia/Tokyo';
  return 'America/New_York';
}

function formatHistoryLabel(timestampMs, symbol, range) {
  if (range === '1D') {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: inferTimeZone(symbol)
    }).format(new Date(timestampMs));
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: inferTimeZone(symbol)
  }).format(new Date(timestampMs));
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

  let quote = await getYahooQuote(normalizedSymbol);
  if (!quote) {
    const raw = await fetchFinnhub('/quote', { symbol: normalizedSymbol });
    quote = normalizeQuote(raw, normalizedSymbol);
  }
  writeCache(quoteCache, cacheKey, quote);
  return quote;
}

function getHistoryParams(range) {
  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  const normalizedRange = range || '1M';

  if (normalizedRange === '1D') {
    return { resolution: '5', from: now - 7 * day, to: now };
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

function getYahooParams(range) {
  if (range === '1D') return { range: '1d', interval: '5m' };
  if (range === '1W') return { range: '5d', interval: '15m' };
  if (range === '6M') return { range: '6mo', interval: '1d' };
  if (range === '1Y') return { range: '1y', interval: '1d' };
  return { range: '1mo', interval: '1d' };
}

function normalizeYahooHistory(raw, symbol, range) {
  const result = raw?.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  const closes = quote?.close;
  const volumes = quote?.volume;

  const currency = result?.meta?.currency || inferCurrency(symbol);

  if (!Array.isArray(timestamps) || !Array.isArray(closes)) return [];

  return timestamps
    .map((time, index) => ({
      time: formatHistoryLabel(Number(time) * 1000, symbol, range),
      price: Number(closes[index]),
      currency,
      volume: Number(volumes?.[index] ?? 0)
    }))
    .filter((point) => Number.isFinite(point.price) && point.price > 0);
}

async function fetchYahooChart(symbol, range) {
  const params = getYahooParams(range);
  const url = new URL(`${YAHOO_CHART_BASE_URL}/${encodeURIComponent(symbol)}`);
  url.searchParams.set('range', params.range);
  url.searchParams.set('interval', params.interval);
  url.searchParams.set('includePrePost', 'false');

  const response = await fetch(url);
  const raw = await response.json();
  return { response, raw };
}

function normalizeYahooQuote(raw, symbol) {
  const result = raw?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const closes = Array.isArray(quote?.close) ? quote.close.filter((value) => Number.isFinite(Number(value))) : [];
  const currentPrice = Number(closes.at(-1) ?? meta?.regularMarketPrice ?? 0);
  const previousClose = Number(meta?.previousClose ?? meta?.chartPreviousClose ?? 0);

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const change = previousClose ? currentPrice - previousClose : 0;
  return {
    symbol,
    currency: meta?.currency || inferCurrency(symbol),
    currentPrice,
    change,
    changePercent: previousClose ? (change / previousClose) * 100 : 0,
    high: Number(meta?.regularMarketDayHigh ?? 0),
    low: Number(meta?.regularMarketDayLow ?? 0),
    open: Number(meta?.regularMarketOpen ?? 0),
    previousClose,
    timestamp: meta?.regularMarketTime ? Number(meta.regularMarketTime) * 1000 : Date.now(),
    source: 'yahoo'
  };
}

async function getYahooQuote(symbol) {
  try {
    const { response, raw } = await fetchYahooChart(symbol, '1D');
    if (!response.ok) return null;
    return normalizeYahooQuote(raw, symbol);
  } catch {
    return null;
  }
}

async function getYahooPriceHistory(symbol, range) {
  const { response, raw } = await fetchYahooChart(symbol, range);
  const history = normalizeYahooHistory(raw, symbol, range);
  return { status: response.status, history };
}

export async function getPriceHistory(symbol, range) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error('symbol is required');

  const cacheKey = `history:${normalizedSymbol}:${range || '1M'}`;
  const cached = readCache(historyCache, cacheKey);
  if (cached) return cached;

  const requestedRange = range || '1M';
  const finnhub = await fetchFinnhubWithStatus('/stock/candle', {
    symbol: normalizedSymbol,
    ...getHistoryParams(requestedRange)
  });

  let history = finnhub.status === 200 ? normalizeHistory(finnhub.body, normalizedSymbol, requestedRange) : [];

  if (history.length === 0) {
    const yahoo = await getYahooPriceHistory(normalizedSymbol, requestedRange);
    history = yahoo.history;
    if (history.length === 0) {
      console.warn('[market-history]', {
        symbol: normalizedSymbol,
        range: requestedRange,
        rawStatus: `finnhub:${finnhub.status}, yahoo:${yahoo.status}`,
        normalizedLength: 0
      });
    }
  }

  writeCache(historyCache, cacheKey, history);
  return history;
}

export async function getCompanyProfile(symbol) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error('symbol is required');
  return fetchFinnhub('/stock/profile2', { symbol: normalizedSymbol });
}
