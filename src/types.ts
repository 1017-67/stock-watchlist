export type StockType = 'watching' | 'holding';
export type TradeAction = '买入' | '卖出' | '继续观察';
export type Confidence = '低' | '中' | '高';
export type PriceRange = '1D' | '1W' | '1M' | '6M' | '1Y';

export interface Quote {
  symbol: string;
  currency?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp: number;
  source: string;
}

export interface HistoryPoint {
  time: string;
  price: number;
  currency?: string;
  volume?: number;
}

export interface WatchStock {
  id: string;
  symbol: string;
  companyName: string;
  type: StockType;
  reason: string;
  thesis: string;
  notes: string;
  shares?: number;
  avgBuyPrice?: number;
  buyDate?: string;
  quote?: Quote;
}

export interface TradeDecision {
  ticker: string;
  companyName: string;
  action: TradeAction;
  currentPrice: string;
  plannedPrice: string;
  reason: string;
  thesis: string;
  targetPrice: string;
  stopLoss: string;
  timeHorizon: string;
  maxLoss: string;
  invalidation: string;
  basis: string[];
  confidence: Confidence;
  emotionalFlags: string[];
  sellReason: string;
}

export interface LocalCheckResult {
  status: 'good' | 'needs-work';
  items: Array<{ label: string; level: 'ok' | 'warn'; detail?: string }>;
  rewardRisk?: number;
}

export interface AIAnalysis {
  summary: string;
  strengths: string[];
  risks: string[];
  missingInfo: string[];
  questionsToConsider: string[];
  emotionCheck: string;
  riskManagementCheck: string;
  finalReminder: string;
  provider?: string;
}

export interface JournalEntry extends TradeDecision {
  id: string;
  createdAt: string;
  localAnalysis: LocalCheckResult;
  aiAnalysis?: AIAnalysis;
  reviewOneWeek: string;
  reviewOneMonth: string;
  lessons: string;
}
