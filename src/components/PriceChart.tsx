import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
}

export function PriceChart({ data, range, loading, error, onRangeChange }: Props) {
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
        <div className="soft-error">{error}</div>
      ) : data.length === 0 ? (
        <div className="soft-error">暂无可用历史价格。1日走势可能受免费行情权限限制。</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 18, right: 18, left: 0, bottom: 8 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} minTickGap={28} />
            <YAxis
              width={68}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(Number(value))}
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), '价格']}
              labelFormatter={(label) => `日期：${label}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #ded8cf', boxShadow: 'none' }}
            />
            <Line type="monotone" dataKey="price" stroke="#7b5f3d" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
