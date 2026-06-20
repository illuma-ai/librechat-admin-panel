import { useState } from 'react';
import type { ReactNode } from 'react';
import type * as t from '@/types';

interface TimeSeriesChartProps {
  points: t.TimeSeriesPoint[];
  /** Formats the value for the hover tooltip + y-axis max (e.g. cost/tokens). */
  formatValue?: (n: number) => string;
  height?: number;
  /** Optional unit/legend label shown under the chart. */
  caption?: ReactNode;
}

const VIEW_W = 600;
const VIEW_H = 200;

/**
 * Dependency-free responsive area+line chart. Geometry is drawn in a fixed
 * viewBox and stretched to the container width (`preserveAspectRatio="none"`);
 * strokes stay crisp via `vector-effect="non-scaling-stroke"`. Axis labels and the
 * hover tooltip live in an HTML overlay positioned by percentage, so nothing
 * depends on measuring the rendered width. Themed only with `--ui-color-*` tokens.
 */
export function TimeSeriesChart({
  points,
  formatValue = (n) => n.toLocaleString(),
  height = 200,
  caption,
}: TimeSeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-(--ui-color-text-muted)"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number) => (n === 1 ? VIEW_W / 2 : (i / (n - 1)) * VIEW_W);
  const y = (v: number) => VIEW_H - (v / max) * (VIEW_H - 8) - 4;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${x(n - 1)} ${VIEW_H} L ${x(0)} ${VIEW_H} Z`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
  };

  const hoverPoint = hover === null ? null : points[hover];

  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative w-full"
        style={{ height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="tsc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ui-color-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--ui-color-accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#tsc-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--ui-color-accent)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {hoverPoint && (
            <line
              x1={x(hover as number)}
              y1={0}
              x2={x(hover as number)}
              y2={VIEW_H}
              stroke="var(--ui-color-text-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {hoverPoint && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-sm border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2 py-1 text-xs whitespace-nowrap shadow-sm"
            style={{ left: `${n === 1 ? 50 : ((hover as number) / (n - 1)) * 100}%` }}
          >
            <div className="font-medium text-(--ui-color-text-default)">
              {formatValue(hoverPoint.value)}
            </div>
            <div className="text-(--ui-color-text-muted)">{hoverPoint.label}</div>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-(--ui-color-text-muted)">
        <span>{points[0].label}</span>
        {caption}
        <span>{points[n - 1].label}</span>
      </div>
    </div>
  );
}
