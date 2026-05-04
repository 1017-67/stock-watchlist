import type { WatchStock } from '../types';
import { currencyForSymbol, formatCurrency, formatNumber, formatPercent } from '../utils/format';
import { EmptyState } from './EmptyState';

export function HoldingsPanel({ holdings }: { holdings: WatchStock[] }) {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>已持有</h2>
          <p>只记录事实，不急着下结论。</p>
        </div>
      </div>
      {holdings.length === 0 ? (
        <EmptyState title="还没有持仓记录" body="添加股票时选择「已持有」，这里会自动计算持仓市值和浮动盈亏。" />
      ) : (
        <div className="holdings-table">
          <div className="table-head">
            <span>股票</span>
            <span>数量</span>
            <span>均价</span>
            <span>现价</span>
            <span>市值</span>
            <span>浮动盈亏</span>
          </div>
          {holdings.map((stock) => {
            const currentPrice = stock.quote?.currentPrice ?? 0;
            const currency = stock.quote?.currency || currencyForSymbol(stock.symbol);
            const shares = stock.shares ?? 0;
            const avg = stock.avgBuyPrice ?? 0;
            const marketValue = shares * currentPrice;
            const pnl = (currentPrice - avg) * shares;
            const pnlPercent = avg > 0 ? ((currentPrice - avg) / avg) * 100 : undefined;
            return (
              <div className="table-row" key={stock.id}>
                <span><strong>{stock.symbol}</strong><small>{stock.companyName}</small></span>
                <span>{formatNumber(shares)}</span>
                <span>{formatCurrency(avg, currency)}</span>
                <span>{formatCurrency(currentPrice, currency)}</span>
                <span>{formatCurrency(marketValue, currency)}</span>
                <span className={pnl >= 0 ? 'positive' : 'negative'}>{formatCurrency(pnl, currency)} · {formatPercent(pnlPercent)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
