import { Bot, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { analyzeTrade } from '../services/aiAnalysisService';
import { runLocalTradeChecks } from '../services/analysisService';
import type { AIAnalysis, JournalEntry, TradeDecision, WatchStock } from '../types';
import { nowLabel } from '../utils/format';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { LocalTradeChecks } from './LocalTradeChecks';

const basisOptions = ['基本面', '技术面', '新闻事件', '估值', '情绪波动', '其他'];
const emotionOptions = ['FOMO', '恐慌', '冲动交易'];

function makeDecision(stock?: WatchStock): TradeDecision {
  return {
    ticker: stock?.symbol || '',
    companyName: stock?.companyName || '',
    action: '继续观察',
    currentPrice: stock?.quote?.currentPrice ? String(stock.quote.currentPrice) : '',
    plannedPrice: '',
    reason: '',
    thesis: stock?.thesis || '',
    targetPrice: '',
    stopLoss: '',
    timeHorizon: '',
    maxLoss: '',
    invalidation: '',
    basis: [],
    confidence: '中',
    emotionalFlags: [],
    sellReason: ''
  };
}

interface Props {
  selectedStock?: WatchStock;
  onSave: (entry: JournalEntry) => void;
}

export function TradeDecisionForm({ selectedStock, onSave }: Props) {
  const [decision, setDecision] = useState<TradeDecision>(() => makeDecision(selectedStock));
  const [analysis, setAnalysis] = useState<AIAnalysis | undefined>();
  const [aiError, setAiError] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const localResult = useMemo(() => runLocalTradeChecks(decision), [decision]);

  useEffect(() => {
    if (!selectedStock) return;
    setDecision((current) => ({
      ...current,
      ticker: selectedStock.symbol,
      companyName: selectedStock.companyName,
      currentPrice: selectedStock.quote?.currentPrice ? String(selectedStock.quote.currentPrice) : current.currentPrice,
      thesis: current.ticker === selectedStock.symbol ? current.thesis : selectedStock.thesis || ''
    }));
    setAnalysis(undefined);
    setAiError('');
  }, [selectedStock]);

  function update(field: keyof TradeDecision, value: string | string[]) {
    setDecision((current) => ({ ...current, [field]: value }));
  }

  function toggleList(field: 'basis' | 'emotionalFlags', value: string) {
    setDecision((current) => {
      const list = current[field];
      return { ...current, [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  function fillFromSelected() {
    const next = makeDecision(selectedStock);
    setDecision(next);
    setAnalysis(undefined);
    setAiError('');
  }

  async function askAi() {
    setLoadingAi(true);
    setAiError('');
    try {
      setAnalysis(await analyzeTrade(decision));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 暂时不可用，但你仍然可以保存这次思考记录。');
    } finally {
      setLoadingAi(false);
    }
  }

  function save() {
    onSave({
      ...decision,
      id: crypto.randomUUID(),
      createdAt: nowLabel(),
      localAnalysis: localResult,
      aiAnalysis: analysis,
      reviewOneWeek: '',
      reviewOneMonth: '',
      lessons: ''
    });
  }

  return (
    <section className="panel trade-panel">
      <div className="section-header">
        <div>
          <h2>买卖前检查</h2>
          <p>先想清楚，再下决定。</p>
        </div>
        {selectedStock && <button type="button" className="ghost-button" onClick={fillFromSelected}>使用当前选中股票</button>}
      </div>

      <div className="form-grid">
        <label>
          股票代码
          <input value={decision.ticker} onChange={(event) => update('ticker', event.target.value.toUpperCase())} />
        </label>
        <label>
          操作
          <select value={decision.action} onChange={(event) => update('action', event.target.value)}>
            <option>买入</option>
            <option>卖出</option>
            <option>继续观察</option>
          </select>
        </label>
        <label>
          当前价格
          <input value={decision.currentPrice} onChange={(event) => update('currentPrice', event.target.value)} inputMode="decimal" />
        </label>
        <label>
          计划买入/卖出价格
          <input value={decision.plannedPrice} onChange={(event) => update('plannedPrice', event.target.value)} inputMode="decimal" />
        </label>
        <label>
          止损价是多少？
          <input value={decision.stopLoss} onChange={(event) => update('stopLoss', event.target.value)} inputMode="decimal" />
        </label>
        <label>
          计划持有多久？
          <input value={decision.timeHorizon} onChange={(event) => update('timeHorizon', event.target.value)} />
        </label>
        <label>
          你能接受的最大亏损是多少？
          <input value={decision.maxLoss} onChange={(event) => update('maxLoss', event.target.value)} />
        </label>
      </div>

      <label>
        为什么现在要这样做？
        <textarea value={decision.reason} onChange={(event) => update('reason', event.target.value)} />
      </label>
      <label>
        你的核心判断是什么？
        <textarea value={decision.thesis} onChange={(event) => update('thesis', event.target.value)} />
      </label>
      <label>
        什么情况说明我判断错了？
        <textarea value={decision.invalidation} onChange={(event) => update('invalidation', event.target.value)} />
      </label>

      {decision.action === '卖出' && (
        <label>
          这次卖出主要是因为
          <select value={decision.sellReason} onChange={(event) => update('sellReason', event.target.value)}>
            <option value="">请选择</option>
            <option>判断失效</option>
            <option>目标达成</option>
            <option>组合再平衡</option>
            <option>情绪影响</option>
          </select>
        </label>
      )}

      <div className="choice-block">
        <span>这次决定主要基于：</span>
        <div className="choice-row">
          {basisOptions.map((item) => (
            <label key={item} className="checkbox-line">
              <input type="checkbox" checked={decision.basis.includes(item)} onChange={() => toggleList('basis', item)} />
              {item}
            </label>
          ))}
        </div>
      </div>

      <div className="choice-block">
        <span>当前信心：</span>
        <div className="segmented">
          {(['低', '中', '高'] as const).map((item) => (
            <button key={item} type="button" className={decision.confidence === item ? 'active' : ''} onClick={() => update('confidence', item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="choice-block">
        <span>是否存在 FOMO、恐慌、冲动交易？</span>
        <div className="choice-row">
          {emotionOptions.map((item) => (
            <label key={item} className="checkbox-line">
              <input type="checkbox" checked={decision.emotionalFlags.includes(item)} onChange={() => toggleList('emotionalFlags', item)} />
              {item}
            </label>
          ))}
        </div>
      </div>

      <LocalTradeChecks result={localResult} />

      <div className="ai-section">
        <div className="section-header compact">
          <div>
            <h2>AI 思考辅助</h2>
            <p>检查推理质量，不替你做决定。</p>
          </div>
          <button type="button" className="primary-button" onClick={askAi} disabled={loadingAi}>
            <Bot size={16} />{loadingAi ? '检查中…' : '让 AI 帮我检查这次决定'}
          </button>
        </div>
        <AIAnalysisPanel analysis={analysis} error={aiError} />
      </div>

      <div className="form-actions">
        <button type="button" className="primary-button" onClick={save}><Save size={16} />保存到交易笔记</button>
      </div>
    </section>
  );
}
