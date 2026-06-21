import type * as t from '@/types';
import { bucketLabel } from '../chartData';
import { BarTimeChart, HorizontalBarChart, LineTimeChart, MultiLineChart } from './recharts';
import { MetricTable } from './MetricTable';

interface WidgetChartProps {
  data?: t.WidgetData;
  chartType: t.WidgetChartType;
  range: t.TraceRange;
  /** Formats the measure value (e.g. cost/tokens/latency). */
  formatValue?: (n: number) => string;
  valueName?: string;
}

/** Pivot time-series series points into recharts multi-line rows + the series keys. */
function pivotSeries(points: t.WidgetDataPoint[], range: t.TraceRange) {
  const byBucket = new Map<string, Record<string, number | string>>();
  const keys: string[] = [];
  for (const p of points) {
    const key = p.series ?? '';
    if (key && !keys.includes(key)) keys.push(key);
    const b = String(p.bucket ?? '');
    const row = byBucket.get(b) ?? { bucket: b, label: bucketLabel(b, range) };
    row[key] = p.value;
    byBucket.set(b, row);
  }
  return {
    data: [...byBucket.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket))),
    keys,
  };
}

/**
 * Renders a custom widget's normalized data per chart type (reference chart-library):
 * big number, line/bar over time (split by series when present), horizontal bar, or
 * table. Themed via the shared recharts wrappers.
 */
export function WidgetChart({ data, chartType, range, formatValue, valueName = 'Value' }: WidgetChartProps) {
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());
  if (!data) {
    return <div className="flex h-48 items-center justify-center text-sm text-(--ui-color-text-muted)">Loading…</div>;
  }

  if (chartType === 'number') {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1">
        <span className="text-4xl font-bold text-(--ui-color-text-default)">{fmt(data.total ?? 0)}</span>
        <span className="text-sm text-(--ui-color-text-muted)">{valueName}</span>
      </div>
    );
  }

  if (chartType === 'hbar') {
    return (
      <HorizontalBarChart
        points={data.points.map((p) => ({ name: p.label ?? '—', value: p.value }))}
        formatValue={fmt}
      />
    );
  }

  if (chartType === 'table') {
    return (
      <MetricTable
        rows={data.points}
        rowKey={(r, i) => `${r.label ?? ''}-${i}`}
        columns={[
          { key: 'label', header: 'Name', render: (r) => r.label ?? '—' },
          { key: 'value', header: valueName, align: 'right', render: (r) => fmt(r.value) },
        ]}
      />
    );
  }

  // line / bar over time
  const hasSeries = data.points.some((p) => p.series);
  if (hasSeries) {
    const { data: chartData, keys } = pivotSeries(data.points, range);
    return <MultiLineChart data={chartData} seriesKeys={keys} formatValue={fmt} />;
  }
  const points = data.points.map((p) => ({ label: bucketLabel(String(p.bucket ?? ''), range), value: p.value }));
  return chartType === 'bar' ? (
    <BarTimeChart points={points} valueName={valueName} formatValue={fmt} />
  ) : (
    <LineTimeChart points={points} valueName={valueName} formatValue={fmt} />
  );
}
