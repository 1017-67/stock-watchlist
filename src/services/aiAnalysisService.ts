import type { AIAnalysis, TradeDecision } from '../types';

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
