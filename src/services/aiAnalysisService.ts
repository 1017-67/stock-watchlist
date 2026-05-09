import type { AIAnalysis, HistoryPoint, Quote, StockType, TradeDecision } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const AI_TIMEOUT_MS = 180000;

function connectionErrorMessage() {
  return '无法连接本地 AI 后端。请确认 npm run dev 正在运行，并打开 http://127.0.0.1:8787/api/ai/diagnostics 检查 Codex 连接。';
}

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

  async function fetchWithTimeout(target: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      return await fetch(target, { ...request, signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('AI 检查超时。Codex 可能还在启动或当前请求太慢，请稍后重试。');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  try {
    return await read(await fetchWithTimeout(url));
  } catch (error) {
    if (!url.startsWith('/api')) throw error;
    try {
      return await read(await fetchWithTimeout(`${API_BASE_URL}${url}`));
    } catch (fallbackError) {
      if (fallbackError instanceof TypeError) {
        throw new Error(connectionErrorMessage());
      }
      throw fallbackError;
    }
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
