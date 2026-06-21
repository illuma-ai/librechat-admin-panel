import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

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

const CHART_HEIGHT = 220;

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
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
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
    </ResponsiveContainer>
  );
}

export interface LatencyPoint {
  label: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/** Multi-line latency percentiles over time (reference "Trace latency percentiles"). */
export function LatencyLineChart({ points }: { points: LatencyPoint[] }) {
  if (points.length === 0) return <EmptyChart />;
  const lines: { key: keyof LatencyPoint; color: string }[] = [
    { key: 'p50', color: SERIES_COLORS[0] },
    { key: 'p90', color: SERIES_COLORS[1] },
    { key: 'p95', color: SERIES_COLORS[2] },
    { key: 'p99', color: SERIES_COLORS[3] },
  ];
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} unit="s" />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${Number(v).toFixed(2)}s`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.key.toUpperCase()}
            stroke={l.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface HBarPoint {
  name: string;
  value: number;
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
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
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
    </ResponsiveContainer>
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
  if (data.length === 0 || seriesKeys.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => (formatValue ? formatValue(Number(v)) : Number(v).toLocaleString())}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {seriesKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div
      className="flex items-center justify-center text-sm text-(--ui-color-text-muted)"
      style={{ height: CHART_HEIGHT }}
    >
      No data
    </div>
  );
}
