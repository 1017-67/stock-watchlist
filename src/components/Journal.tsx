import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { JournalEntry, TradeAction } from '../types';
import { formatCurrency } from '../utils/format';
import { EmptyState } from './EmptyState';

interface Props {
  entries: JournalEntry[];
  onUpdate: (entry: JournalEntry) => void;
}

export function Journal({ entries, onUpdate }: Props) {
  const [tickerFilter, setTickerFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<'全部' | TradeAction>('全部');
  const [expandedId, setExpandedId] = useState<string | undefined>();

  const filtered = entries.filter((entry) => {
    const tickerOk = !tickerFilter.trim() || entry.ticker.includes(tickerFilter.trim().toUpperCase());
    const actionOk = actionFilter === '全部' || entry.action === actionFilter;
    return tickerOk && actionOk;
  });

  function updateReview(entry: JournalEntry, field: 'reviewOneWeek' | 'reviewOneMonth' | 'lessons', value: string) {
    onUpdate({ ...entry, [field]: value });
  }

  return (
    <section className="panel journal-panel">
      <div className="section-header">
        <div>
          <h2>交易笔记</h2>
          <p>记录想法、检查风险、帮助复盘。</p>
        </div>
      </div>
      <div className="journal-filters">
        <input placeholder="按股票代码筛选" value={tickerFilter} onChange={(event) => setTickerFilter(event.target.value)} />
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as '全部' | TradeAction)}>
          <option>全部</option>
          <option>买入</option>
          <option>卖出</option>
          <option>继续观察</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="还没有交易笔记" body="完成一次买卖前检查后，可以把这次思考保存下来。" />
      ) : (
        <div className="journal-list">
          {filtered.map((entry) => {
            const expanded = expandedId === entry.id;
            return (
              <article key={entry.id} className="journal-entry">
                <button type="button" className="journal-summary" onClick={() => setExpandedId(expanded ? undefined : entry.id)}>
                  <span><strong>{entry.ticker}</strong>{entry.companyName && <small>{entry.companyName}</small>}</span>
                  <span>{entry.action}</span>
                  <span>{formatCurrency(Number(entry.plannedPrice || entry.currentPrice || 0))}</span>
                  <span>{entry.createdAt}</span>
                  <ChevronDown size={16} className={expanded ? 'rotated' : ''} />
                </button>
                {expanded && (
                  <div className="journal-detail">
                    <div className="detail-grid">
                      <p><strong>为什么现在要这样做？</strong>{entry.reason}</p>
                      <p><strong>核心判断</strong>{entry.thesis}</p>
                      <p><strong>目标价</strong>{entry.targetPrice || '—'}</p>
                      <p><strong>止损价</strong>{entry.stopLoss || '—'}</p>
                      <p><strong>计划持有多久</strong>{entry.timeHorizon || '—'}</p>
                      <p><strong>最大可接受亏损</strong>{entry.maxLoss || '—'}</p>
                      <p><strong>判断失效条件</strong>{entry.invalidation || '—'}</p>
                      <p><strong>当前信心</strong>{entry.confidence}</p>
                    </div>
                    {entry.aiAnalysis && (
                      <div className="journal-ai">
                        <strong>AI 思考辅助</strong>
                        <p>{entry.aiAnalysis.summary}</p>
                      </div>
                    )}
                    <label>
                      1 周后复盘
                      <textarea value={entry.reviewOneWeek} onChange={(event) => updateReview(entry, 'reviewOneWeek', event.target.value)} />
                    </label>
                    <label>
                      1 个月后复盘
                      <textarea value={entry.reviewOneMonth} onChange={(event) => updateReview(entry, 'reviewOneMonth', event.target.value)} />
                    </label>
                    <label>
                      学到什么
                      <textarea value={entry.lessons} onChange={(event) => updateReview(entry, 'lessons', event.target.value)} />
                    </label>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
