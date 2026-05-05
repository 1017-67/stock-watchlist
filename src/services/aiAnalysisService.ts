import type { AIAnalysis, HistoryPoint, Quote, StockType, TradeDecision } from '../types';

export async function analyzeTrade(decision: TradeDecision): Promise<AIAnalysis> {
  const response = await fetch('/api/ai/analyze-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'AI 暂时不可用，但你仍然可以保存这次思考记录。');
  }
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
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'AI 暂时不可用，但你仍然可以继续记录自己的想法。');
  }
  return data.answer;
}
