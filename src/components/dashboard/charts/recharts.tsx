import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
/**
 * Clickable-legend series toggle (reference parity: legend pills hide/show a series).
 * Returns the hidden set plus the `onClick`/`formatter` props for a recharts `Legend`
 * — clicking a legend item toggles that series; hidden items dim to 40% opacity.
 */
function useLegendToggle() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const legendProps = {
    wrapperStyle: { fontSize: 11, cursor: 'pointer' },
    onClick: (o: { dataKey?: string | number; value?: string }) =>
      toggle(String(o.dataKey ?? o.value ?? '')),
    formatter: (value: string, entry: { dataKey?: string | number }) => (
      <span style={{ opacity: hidden.has(String(entry?.dataKey ?? value)) ? 0.4 : 1 }}>{value}</span>
    ),
  } as const;
  return { hidden, legendProps };
}

/**
 * recharts wrappers matching the reference dashboard's chart styles, themed with
 * `--ui-color-*` tokens. Distinct multi-series hues (latency percentiles) come from
 * one palette defined here — the single source for data-series colors.
 */

const AXIS = 'var(--ui-color-text-muted)';
const GRID = 'var(--ui-color-stroke-default)';

/**
 * Single source for data-series colours — a vibrant, gradient-friendly palette
 * (neumorphism / glassmorphism inspired) replacing the all-green look. Each entry
 * has a `solid` (line strokes / legend) and a `from`→`to` pair (bar/area gradients).
 */
export const CHART_PALETTE = [
  { solid: '#6366f1', from: '#818cf8', to: '#4f46e5' }, // indigo
  { solid: '#06b6d4', from: '#22d3ee', to: '#0891b2' }, // cyan
  { solid: '#10b981', from: '#34d399', to: '#059669' }, // emerald
  { solid: '#f59e0b', from: '#fbbf24', to: '#d97706' }, // amber
  { solid: '#ec4899', from: '#f472b6', to: '#db2777' }, // pink
  { solid: '#8b5cf6', from: '#a78bfa', to: '#7c3aed' }, // violet
] as const;

export const SERIES_COLORS = CHART_PALETTE.map((p) => p.solid);

/** Reusable SVG gradient defs (bar = vertical from→to; area = solid→transparent). */
function ChartGradients() {
  return (
    <defs>
      {CHART_PALETTE.map((p, i) => (
        <linearGradient key={`g${i}`} id={`chart-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
      ))}
      {CHART_PALETTE.map((p, i) => (
        <linearGradient key={`a${i}`} id={`chart-area-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.solid} stopOpacity={0.35} />
          <stop offset="100%" stopColor={p.solid} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  );
}

const grad = (i: number) => `url(#chart-grad-${((i % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length})`;
const area = (i: number) => `url(#chart-area-${((i % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length})`;
const solid = (i: number) => CHART_PALETTE[((i % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length].solid;

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--ui-color-background-default)',
  border: '1px solid var(--ui-color-stroke-default)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--ui-color-text-default)',
} as const;

const AXIS_TICK = { fill: AXIS, fontSize: 11 } as const;

/** Floor height so a chart stays readable on a content-sized (Home) card. */
const CHART_MIN_HEIGHT = 180;

/**
 * Fill-height chart frame: the chart grows to fill its card (so it adapts to a custom
 * dashboard's grid-cell height) but keeps a readable floor on content-sized cards.
 * `flex-1 min-h-0` lets it expand inside a flex card; `minHeight` is the floor.
 */
function ChartFrame({ children }: { children: ReactElement }) {
  return (
    <div className="min-h-0 w-full flex-1" style={{ minHeight: CHART_MIN_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export interface BarTimePoint {
  label: string;
  value: number;
}

/** Bar chart of a single metric over time (reference "Traces" / "Observations by time"). */
export function BarTimeChart({
  points,
  valueName,
  formatValue,
  colorIndex = 0,
}: {
  points: BarTimePoint[];
  valueName: string;
  formatValue?: (n: number) => string;
  colorIndex?: number;
}) {
  if (points.length === 0) return <EmptyChart />;
  return (
    <ChartFrame>
      <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [formatValue ? formatValue(Number(v)) : Number(v).toLocaleString(), valueName]}
        />
        <Bar dataKey="value" name={valueName} fill={grad(colorIndex)} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export interface HBarPoint {
  name: string;
  value: number;
}

/** Pie chart of a categorical breakdown (reference PIE) — one slice per palette hue. */
export function PieBreakdownChart({
  points,
  formatValue,
}: {
  points: HBarPoint[];
  formatValue?: (n: number) => string;
}) {
  if (points.length === 0) return <EmptyChart />;
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());
  return (
    <ChartFrame>
      <RePieChart>
        <Pie data={points} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={1}>
          {points.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RePieChart>
    </ChartFrame>
  );
}

/** Horizontal bar list (reference Traces / User consumption — grouped by name). */
export function HorizontalBarChart({
  points,
  formatValue,
  colorIndex = 2,
}: {
  points: HBarPoint[];
  formatValue?: (n: number) => string;
  colorIndex?: number;
}) {
  if (points.length === 0) return <EmptyChart />;
  const height = Math.max(160, points.length * 36 + 32);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => (formatValue ? formatValue(Number(v)) : Number(v).toLocaleString())}
        />
        <Bar dataKey="value" fill={grad(colorIndex)} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => (formatValue ? formatValue(Number(v)) : Number(v).toLocaleString())}
            className="fill-(--ui-color-text-muted) text-[11px]"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single smooth gradient area over time (reference Observations by time). */
export function LineTimeChart({
  points,
  valueName,
  formatValue,
  colorIndex = 1,
}: {
  points: BarTimePoint[];
  valueName: string;
  formatValue?: (n: number) => string;
  colorIndex?: number;
}) {
  if (points.length === 0) return <EmptyChart />;
  return (
    <ChartFrame>
      <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [formatValue ? formatValue(Number(v)) : Number(v).toLocaleString(), valueName]}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={valueName}
          stroke={solid(colorIndex)}
          strokeWidth={2}
          fill={area(colorIndex)}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartFrame>
  );
}

/** Multi-line chart over time, one line per series key (reference Model Usage). */
export function MultiLineChart({
  data,
  seriesKeys,
  formatValue,
}: {
  data: Record<string, number | string>[];
  seriesKeys: string[];
  formatValue?: (n: number) => string;
}) {
  const { hidden, legendProps } = useLegendToggle();
  if (data.length === 0 || seriesKeys.length === 0) return <EmptyChart />;
  return (
    <ChartFrame>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => (formatValue ? formatValue(Number(v)) : Number(v).toLocaleString())}
        />
        <Legend {...legendProps} />
        {seriesKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            hide={hidden.has(key)}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

function EmptyChart() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 items-center justify-center text-sm text-(--ui-color-text-muted)"
      style={{ minHeight: CHART_MIN_HEIGHT }}
    >
      No data
    </div>
  );
}
