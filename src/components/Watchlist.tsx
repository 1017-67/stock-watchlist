import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { StockType, WatchStock } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';
import { EmptyState } from './EmptyState';
import { StockSearch } from './StockSearch';

interface Props {
  stocks: WatchStock[];
  selectedId?: string;
  onAdd: (stock: WatchStock) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

interface AddStockForm {
  symbol: string;
  companyName: string;
  type: StockType;
  reason: string;
  thesis: string;
  notes: string;
  shares: string;
  avgBuyPrice: string;
  buyDate: string;
}

const initialForm: AddStockForm = {
  symbol: '',
  companyName: '',
  type: 'watching',
  reason: '',
  thesis: '',
  notes: '',
  shares: '',
  avgBuyPrice: '',
  buyDate: ''
};

export function Watchlist({ stocks, selectedId, onAdd, onRemove, onSelect, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  function submit() {
    if (!form.symbol.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      symbol: form.symbol.trim().toUpperCase(),
      companyName: form.companyName.trim() || form.symbol.trim().toUpperCase(),
      type: form.type,
      reason: form.reason.trim(),
      thesis: form.thesis.trim(),
      notes: form.notes.trim(),
      shares: form.type === 'holding' ? Number(form.shares || 0) : undefined,
      avgBuyPrice: form.type === 'holding' ? Number(form.avgBuyPrice || 0) : undefined,
      buyDate: form.type === 'holding' ? form.buyDate : undefined
    });
    setForm(initialForm);
    setOpen(false);
  }

  return (
    <section className="panel watchlist-panel">
      <div className="section-header">
        <div>
          <h2>自选股</h2>
          <p>今天为什么关注它？</p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-button" onClick={onRefresh}>
            <RefreshCw size={16} />刷新行情
          </button>
          <button type="button" className="primary-button" onClick={() => setOpen((value) => !value)}>
            <Plus size={16} />添加股票
          </button>
        </div>
      </div>

      {open && (
        <div className="inline-form">
          <StockSearch
            onPick={(stock) => setForm((current) => ({ ...current, symbol: stock.symbol, companyName: stock.companyName }))}
          />
          <div className="form-grid">
            <label>
              股票代码
              <input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} />
            </label>
            <label>
              公司名称
              <input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
            </label>
            <label>
              类型
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'watching' | 'holding' })}>
                <option value="watching">自选关注</option>
                <option value="holding">已持有</option>
              </select>
            </label>
            {form.type === 'holding' && (
              <>
                <label>
                  持有数量
                  <input value={form.shares} onChange={(event) => setForm({ ...form, shares: event.target.value })} inputMode="decimal" />
                </label>
                <label>
                  平均买入价
                  <input value={form.avgBuyPrice} onChange={(event) => setForm({ ...form, avgBuyPrice: event.target.value })} inputMode="decimal" />
                </label>
                <label>
                  买入日期
                  <input type="date" value={form.buyDate} onChange={(event) => setForm({ ...form, buyDate: event.target.value })} />
                </label>
              </>
            )}
          </div>
          <label>
            关注理由
            <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          </label>
          <label>
            个人判断
            <textarea value={form.thesis} onChange={(event) => setForm({ ...form, thesis: event.target.value })} />
          </label>
          <label>
            备注
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <div className="form-actions">
            <button type="button" className="primary-button" onClick={submit}>保存</button>
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>取消</button>
          </div>
        </div>
      )}

      {stocks.length === 0 ? (
        <EmptyState title="投资笔记还没有自选股" body="先添加一个你正在观察的股票，把理由写下来。" />
      ) : (
        <div className="stock-list">
          {stocks.map((stock) => {
            const changeClass = (stock.quote?.change ?? 0) >= 0 ? 'positive' : 'negative';
            return (
              <article
                key={stock.id}
                className={`stock-row ${selectedId === stock.id ? 'selected' : ''}`}
                onClick={() => onSelect(stock.id)}
              >
                <div>
                  <strong>{stock.symbol}</strong>
                  <span>{stock.companyName}</span>
                </div>
                <div>
                  <strong>{formatCurrency(stock.quote?.currentPrice)}</strong>
                  <span className={changeClass}>
                    {formatCurrency(stock.quote?.change)} · {formatPercent(stock.quote?.changePercent)}
                  </span>
                </div>
                <p>{stock.reason || '还没有写关注理由。'}</p>
                <p>{stock.notes || '—'}</p>
                <button
                  type="button"
                  className="icon-button"
                  title="移除"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(stock.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
