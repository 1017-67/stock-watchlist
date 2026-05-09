import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getPriceHistory,
  getQuote,
  searchSymbols
} from './marketDataService.js';
import { analyzeTradeDecision, askInvestmentQuestion, getAiDiagnostics, getAiProviderStatus } from './codexAnalysisService.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

function isAllowedLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return (
      ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(host) ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedLocalOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));

function marketError(res) {
  res.status(503).json({
    error: 'MARKET_DATA_UNAVAILABLE',
    message: '暂时无法获取实时行情，请稍后再试。'
  });
}

app.get('/api/health', async (_req, res) => {
  const aiDiagnostics = await getAiDiagnostics();
  res.json({
    ok: true,
    marketProvider: process.env.FINNHUB_API_KEY ? 'finnhub' : 'missing',
    aiProvider: getAiProviderStatus(),
    codexConnected: aiDiagnostics.codex.connected
  });
});

app.get('/api/ai/diagnostics', async (_req, res) => {
  res.json(await getAiDiagnostics());
});

app.get('/api/market/search', async (req, res) => {
  try {
    res.json({ results: await searchSymbols(String(req.query.q || '')) });
  } catch {
    marketError(res);
  }
});

app.get('/api/market/quote', async (req, res) => {
  try {
    res.json({ quote: await getQuote(String(req.query.symbol || '')) });
  } catch {
    marketError(res);
  }
});

app.get('/api/market/history', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '');
    const range = String(req.query.range || '1M');
    const history = await getPriceHistory(symbol, range);
    res.json(history);
  } catch {
    marketError(res);
  }
});

app.post('/api/ai/analyze-trade', async (req, res) => {
  try {
    const analysis = await analyzeTradeDecision(req.body || {});
    res.json({ analysis });
  } catch {
    res.status(503).json({
      error: 'AI_UNAVAILABLE',
      message: 'AI 暂时不可用，但你仍然可以保存这次思考记录。'
    });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const result = await askInvestmentQuestion(req.body || {});
    res.json(result);
  } catch {
    res.status(503).json({
      error: 'AI_UNAVAILABLE',
      message: 'AI 暂时不可用，但你仍然可以继续记录自己的想法。'
    });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`投资笔记 API running at http://127.0.0.1:${port}`);
});
