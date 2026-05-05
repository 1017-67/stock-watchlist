import { useMemo, useState, type PointerEvent } from 'react';
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
  currency: string;
  onRangeChange: (range: PriceRange) => void;
  onRetry: () => void;
}

const chartWidth = 760;
const chartHeight = 300;
const padding = { top: 18, right: 22, bottom: 34, left: 86 };

function niceTicks(min: number, max: number) {
  if (min === max) {
    const spread = Math.max(Math.abs(min) * 0.01, 1);
    return [min - spread, min, min + spread];
  }

  const ticks = 4;
  const step = (max - min) / (ticks - 1);
  return Array.from({ length: ticks }, (_, index) => min + step * index);
}

function toPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function getUniqueTickIndexes(length: number) {
  if (length <= 1) return [0];
  const wanted = Math.min(6, length);
  return Array.from({ length: wanted }, (_, index) => Math.round((index * (length - 1)) / (wanted - 1))).filter(
    (item, index, list) => list.indexOf(item) === index
  );
}

export function PriceChart({ data, range, loading, error, currency, onRangeChange, onRetry }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const validData = data.filter((point) => Number.isFinite(point.price) && point.price > 0);
    if (validData.length === 0) {
      return {
        data: validData,
        points: [],
        linePath: '',
        areaPath: '',
        yTicks: [],
        xTickIndexes: [],
        plotWidth: chartWidth - padding.left - padding.right,
        plotHeight: chartHeight - padding.top - padding.bottom
      };
    }

    const prices = validData.map((point) => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const yPadding = Math.max((maxPrice - minPrice) * 0.08, Math.abs(maxPrice || 1) * 0.002, 0.01);
    const yMin = minPrice - yPadding;
    const yMax = maxPrice + yPadding;
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const points = validData.map((point, index) => {
      const x = padding.left + (validData.length === 1 ? plotWidth : (index / (validData.length - 1)) * plotWidth);
      const y = padding.top + ((yMax - point.price) / (yMax - yMin || 1)) * plotHeight;
      return { ...point, x, y };
    });

    const areaPath = points.length
      ? `${toPath(points)} L ${points.at(-1)?.x.toFixed(2)} ${padding.top + plotHeight} L ${points[0].x.toFixed(2)} ${padding.top + plotHeight} Z`
      : '';

    return {
      data: validData,
      points,
      linePath: toPath(points),
      areaPath,
      yTicks: niceTicks(yMin, yMax),
      xTickIndexes: getUniqueTickIndexes(validData.length),
      plotWidth,
      plotHeight
    };
  }, [data]);

  const activePoint = activeIndex === null ? undefined : chart.points[activeIndex];
  const lastPoint = chart.points.at(-1);

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (chart.points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const ratio = Math.min(1, Math.max(0, (x - padding.left) / chart.plotWidth));
    setActiveIndex(Math.round(ratio * (chart.points.length - 1)));
  }

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
      ) : chart.data.length === 0 ? (
        <div className="chart-empty">
          <span>暂时无法获取价格走势</span>
          <button type="button" onClick={onRetry}>重试</button>
        </div>
      ) : (
        <div className="svg-chart-shell">
          <svg
            className="price-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`${range} 价格走势`}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b98521" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#b98521" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {chart.yTicks.map((tick) => {
              const y = padding.top + ((chart.yTicks.at(-1)! - tick) / (chart.yTicks.at(-1)! - chart.yTicks[0] || 1)) * chart.plotHeight;
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="chart-grid-line" />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" className="chart-axis-text">
                    {formatCurrency(tick, currency)}
                  </text>
                </g>
              );
            })}

            <path d={chart.areaPath} className="chart-area" fill="url(#priceFill)" />
            <path d={chart.linePath} className="chart-line" />

            {chart.xTickIndexes.map((index) => {
              const point = chart.points[index];
              return (
                <text key={`${point.time}-${index}`} x={point.x} y={chartHeight - 8} textAnchor="middle" className="chart-axis-text">
                  {point.time}
                </text>
              );
            })}

            {activePoint && (
              <g>
                <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={padding.top + chart.plotHeight} className="chart-cursor-line" />
                <circle cx={activePoint.x} cy={activePoint.y} r="4" className="chart-dot" />
              </g>
            )}
            {lastPoint && !activePoint && <circle cx={lastPoint.x} cy={lastPoint.y} r="4" className="chart-dot" />}
          </svg>

          {activePoint && (
            <div
              className="chart-tooltip svg-chart-tooltip"
              style={{
                left: `${(activePoint.x / chartWidth) * 100}%`,
                top: `${Math.max(16, activePoint.y - 70)}px`
              }}
            >
              <div>时间：{activePoint.time}</div>
              <strong>价格：{formatCurrency(activePoint.price, currency)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
