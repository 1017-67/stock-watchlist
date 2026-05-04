import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint, PriceRange } from '../types';
import { formatCurrency } from '../utils/format';
import { LoadingState } from './LoadingState';

const ranges: Array<{ value: PriceRange; label: string }> = [
  { value: '1D', label: '1日' },
  { value: '1W', label: '1周' },
  { value: '1M', label: '1月' },
  { value: '6M', label: '6月' },
  { value: '1Y', label: '1年' }
];

interface Props {
  data: HistoryPoint[];
  range: PriceRange;
  loading: boolean;
  error?: string;
  onRangeChange: (range: PriceRange) => void;
  onRetry: () => void;
}

export function PriceChart({ data, range, loading, error, onRangeChange, onRetry }: Props) {
  return (
    <div className="chart-block">
      <div className="range-tabs">
        {ranges.map((item) => (
          <button
            key={item.value}
            type="button"
            className={range === item.value ? 'active' : ''}
            onClick={() => onRangeChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoadingState label="正在加载价格走势…" />
      ) : error ? (
        <div className="chart-empty">
          <span>暂时无法获取价格走势</span>
          <button type="button" onClick={onRetry}>重试</button>
        </div>
      ) : data.length === 0 ? (
        <div className="chart-empty">
          <span>暂时无法获取价格走势</span>
          <button type="button" onClick={onRetry}>重试</button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 18, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b98521" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#b98521" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eadfce" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7f766a' }} minTickGap={28} />
            <YAxis
              width={68}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#7f766a' }}
              tickFormatter={(value) => formatCurrency(Number(value))}
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), '价格']}
              labelFormatter={(label) => `时间：${label}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #ded8cf', boxShadow: 'none' }}
            />
            <Area type="monotone" dataKey="price" stroke="#b98521" strokeWidth={2} fill="url(#priceFill)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
