import type { AIAnalysis, HistoryPoint, Quote, StockType, TradeDecision } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function postJson<T>(url: string, body: unknown, fallbackMessage: string): Promise<T> {
  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };

  async function read(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error(fallbackMessage);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || fallbackMessage);
    return data as T;
  }

  try {
    return await read(await fetch(url, request));
  } catch (error) {
    if (!url.startsWith('/api')) throw error;
    return read(await fetch(`${API_BASE_URL}${url}`, request));
  }
}

export async function analyzeTrade(decision: TradeDecision): Promise<AIAnalysis> {
  const data = await postJson<{ analysis: AIAnalysis }>(
    '/api/ai/analyze-trade',
    decision,
    'AI 暂时不可用，但你仍然可以保存这次思考记录。'
  );
  return data.analysis;
}

export interface AskAiContext {
  selectedStock?: {
    symbol: string;
    companyName: string;
    type: StockType;
    reason: string;
    thesis: string;
    notes: string;
    quote?: Quote;
  };
  recentHistory?: HistoryPoint[];
}

export async function askAiQuestion(message: string, context: AskAiContext): Promise<string> {
  const data = await postJson<{ answer: string }>(
    '/api/ai/chat',
    { message, context },
    'AI 暂时不可用，但你仍然可以继续记录自己的想法。'
  );
  return data.answer;
}
