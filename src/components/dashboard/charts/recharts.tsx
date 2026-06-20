import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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
const ACCENT = 'var(--ui-color-accent)';

/** Distinct, fixed hues for multi-series charts (p50/p90/p95/p99 etc.). */
export const SERIES_COLORS = ['#1eb980', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

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
}: {
  points: BarTimePoint[];
  valueName: string;
  formatValue?: (n: number) => string;
}) {
  if (points.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [formatValue ? formatValue(Number(v)) : Number(v).toLocaleString(), valueName]}
        />
        <Bar dataKey="value" name={valueName} fill={ACCENT} radius={[2, 2, 0, 0]} />
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
}: {
  points: HBarPoint[];
  formatValue?: (n: number) => string;
}) {
  if (points.length === 0) return <EmptyChart />;
  const height = Math.max(160, points.length * 36 + 32);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
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
        <Bar dataKey="value" fill={ACCENT} radius={[0, 2, 2, 0]}>
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

/** Single smooth line over time (reference Observations by time). */
export function LineTimeChart({
  points,
  valueName,
  formatValue,
}: {
  points: BarTimePoint[];
  valueName: string;
  formatValue?: (n: number) => string;
}) {
  if (points.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [formatValue ? formatValue(Number(v)) : Number(v).toLocaleString(), valueName]}
        />
        <Line type="monotone" dataKey="value" name={valueName} stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
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
