import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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

function lastItem<T>(items: T[]) {
  return items.length ? items[items.length - 1] : undefined;
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
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const chart = useMemo(() => {
    const validData = data.filter((point) => Number.isFinite(point.price) && point.price > 0);
    if (validData.length === 0) {
      return {
        data: validData,
        points: [],
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

    return {
      data: validData,
      points,
      yTicks: niceTicks(yMin, yMax),
      xTickIndexes: getUniqueTickIndexes(validData.length),
      plotWidth,
      plotHeight
    };
  }, [data]);

  const activePoint = activeIndex === null ? undefined : chart.points[activeIndex];
  const lastPoint = lastItem(chart.points);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell || chart.points.length === 0) return;

    const currentCanvas = canvas;
    const currentShell = shell;

    function draw() {
      const width = Math.max(currentShell.clientWidth, 320);
      const height = chartHeight;
      const dpr = window.devicePixelRatio || 1;
      currentCanvas.width = Math.round(width * dpr);
      currentCanvas.height = Math.round(height * dpr);
      currentCanvas.style.width = `${width}px`;
      currentCanvas.style.height = `${height}px`;

      const context = currentCanvas.getContext('2d');
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const scaleX = width / chartWidth;
      const bottom = padding.top + chart.plotHeight;

      context.font = '12px ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      context.textBaseline = 'middle';
      context.fillStyle = '#7f766a';
      context.strokeStyle = '#eadfce';
      context.lineWidth = 1;
      context.setLineDash([3, 5]);

      chart.yTicks.forEach((tick) => {
        const lastTick = lastItem(chart.yTicks) ?? tick;
        const y = padding.top + ((lastTick - tick) / (lastTick - chart.yTicks[0] || 1)) * chart.plotHeight;
        context.beginPath();
        context.moveTo(padding.left * scaleX, y);
        context.lineTo((chartWidth - padding.right) * scaleX, y);
        context.stroke();
        context.textAlign = 'right';
        context.fillText(formatCurrency(tick, currency), padding.left * scaleX - 12, y + 1);
      });

      context.setLineDash([]);
      const gradient = context.createLinearGradient(0, padding.top, 0, bottom);
      gradient.addColorStop(0, 'rgba(185, 133, 33, 0.22)');
      gradient.addColorStop(1, 'rgba(185, 133, 33, 0.02)');

      context.beginPath();
      chart.points.forEach((point, index) => {
        const x = point.x * scaleX;
        if (index === 0) context.moveTo(x, point.y);
        else context.lineTo(x, point.y);
      });
      context.lineTo((lastItem(chart.points)?.x ?? padding.left) * scaleX, bottom);
      context.lineTo(chart.points[0].x * scaleX, bottom);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      chart.points.forEach((point, index) => {
        const x = point.x * scaleX;
        if (index === 0) context.moveTo(x, point.y);
        else context.lineTo(x, point.y);
      });
      context.strokeStyle = '#b98521';
      context.lineWidth = 2.5;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();

      context.fillStyle = '#7f766a';
      context.textAlign = 'center';
      chart.xTickIndexes.forEach((index) => {
        const point = chart.points[index];
        context.fillText(point.time, point.x * scaleX, chartHeight - 10);
      });

      const point = activePoint || lastPoint;
      if (point) {
        const x = point.x * scaleX;
        if (activePoint) {
          context.strokeStyle = '#c7b8a0';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, padding.top);
          context.lineTo(x, bottom);
          context.stroke();
        }
        context.beginPath();
        context.arc(x, point.y, 4, 0, Math.PI * 2);
        context.fillStyle = '#b98521';
        context.fill();
        context.strokeStyle = '#fffefa';
        context.lineWidth = 2;
        context.stroke();
      }
    }

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [activePoint, chart, currency, lastPoint]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
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
      {!loading && !error && chart.data.length > 0 && (
        <div className="chart-meta">已加载 {chart.data.length} 个价格点</div>
      )}
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
        <div
          ref={shellRef}
          className="canvas-chart-shell"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <canvas ref={canvasRef} className="price-canvas" role="img" aria-label={`${range} 价格走势`} />

          {activePoint && (
            <div
              className="chart-tooltip canvas-chart-tooltip"
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
