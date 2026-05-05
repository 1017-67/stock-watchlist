import { RefreshCw } from 'lucide-react';
import type { HistoryPoint, PriceRange, WatchStock } from '../types';
import { currencyForSymbol, formatCurrency, formatPercent } from '../utils/format';
import { PriceChart } from './PriceChart';

interface Props {
  stock?: WatchStock;
  history: HistoryPoint[];
  range: PriceRange;
  loadingHistory: boolean;
  chartError?: string;
  onRangeChange: (range: PriceRange) => void;
  onRetryHistory: () => void;
  onRefresh: () => void;
  onRecord: (stock: WatchStock) => void;
}

export function StockDetailPanel({
  stock,
  history,
  range,
  loadingHistory,
  chartError,
  onRangeChange,
  onRetryHistory,
  onRefresh,
  onRecord
}: Props) {
  if (!stock) {
    return (
      <section className="panel detail-panel">
        <div className="empty-state">
          <h3>选择一只股票查看价格走势</h3>
          <p>这不是预测工具，而是帮你把想法写清楚。</p>
        </div>
      </section>
    );
  }

  const changeClass = (stock.quote?.change ?? 0) >= 0 ? 'positive' : 'negative';
  const currency = stock.quote?.currency || currencyForSymbol(stock.symbol);

  return (
    <section className="panel detail-panel">
      <div className="detail-top">
        <div>
          <h2>{stock.symbol}</h2>
          <p>{stock.companyName}</p>
        </div>
        <div className="quote-large">
          <strong>{formatCurrency(stock.quote?.currentPrice, currency)}</strong>
          <span className={changeClass}>
            {formatCurrency(stock.quote?.change, currency)} · {formatPercent(stock.quote?.changePercent)}
          </span>
        </div>
      </div>

      <PriceChart
        data={history}
        range={range}
        loading={loadingHistory}
        error={chartError}
        currency={currency}
        symbol={stock.symbol}
        onRangeChange={onRangeChange}
        onRetry={onRetryHistory}
      />

      <div className="detail-notes">
        <div>
          <h3>关注理由</h3>
          <p>{stock.reason || '还没有写。'}</p>
        </div>
        <div>
          <h3>个人判断</h3>
          <p>{stock.thesis || '还没有写。'}</p>
        </div>
        <div>
          <h3>备注</h3>
          <p>{stock.notes || '—'}</p>
        </div>
      </div>

      {stock.type === 'holding' && (
        <div className="holding-summary">
          <span>持有数量：{stock.shares || 0}</span>
          <span>平均买入价：{formatCurrency(stock.avgBuyPrice, currency)}</span>
          <span>买入日期：{stock.buyDate || '—'}</span>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="primary-button" onClick={() => onRecord(stock)}>记录一次买卖想法</button>
        <button type="button" className="ghost-button" onClick={onRefresh}><RefreshCw size={16} />刷新行情</button>
      </div>
    </section>
  );
}
