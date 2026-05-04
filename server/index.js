import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getPriceHistory,
  getQuote,
  searchSymbols
} from './marketDataService.js';
import { analyzeTradeDecision } from './codexAnalysisService.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'] }));
app.use(express.json({ limit: '1mb' }));

function marketError(res) {
  res.status(503).json({
    error: 'MARKET_DATA_UNAVAILABLE',
    message: '暂时无法获取实时行情，请稍后再试。'
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    marketProvider: process.env.FINNHUB_API_KEY ? 'finnhub' : 'missing',
    aiProvider: 'lunaris-codex-or-placeholder'
  });
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

app.listen(port, '127.0.0.1', () => {
  console.log(`投资笔记 API running at http://127.0.0.1:${port}`);
});
