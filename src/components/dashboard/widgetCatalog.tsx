import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  dashboardBreakdownsQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardTimeseriesQueryOptions,
} from '@/server';
import { formatCost, formatTokens, parseChDate } from '@/components/traces';
import { Widget, StatCard } from './cards';
import { TimeSeriesChart } from './charts/TimeSeriesChart';
import { BarList } from './charts/BarList';

/** Resolved data bundle shared by every dashboard widget for a tenant + range. */
export interface DashboardData {
  summary?: t.DashboardSummary;
  breakdowns?: t.DashboardBreakdowns;
  points: (t.MetricBucket & { label: string })[];
  isLoading: boolean;
}

/** A reusable dashboard widget: stable id + title key + a renderer over the data. */
export interface WidgetDef {
  id: string;
  titleKey: string;
  render: (d: DashboardData) => ReactNode;
}

/** Compact bucket-axis label: time-of-day for the 24h range, else month/day. */
function bucketLabel(bucket: string, range: t.TraceRange): string {
  const d = parseChDate(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  if (range === '24h') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Run the three dashboard aggregate queries and derive the shared data bundle. */
export function useDashboardData(tenant: string, range: t.TraceRange): DashboardData {
  const summary = useQuery(dashboardSummaryQueryOptions(tenant, range));
  const series = useQuery(dashboardTimeseriesQueryOptions(tenant, range));
  const breakdowns = useQuery(dashboardBreakdownsQueryOptions(tenant, range));

  const points = useMemo(
    () => (series.data ?? []).map((b) => ({ ...b, label: bucketLabel(b.bucket, range) })),
    [series.data, range],
  );

  return {
    summary: summary.data,
    breakdowns: breakdowns.data,
    points,
    isLoading: summary.isLoading || series.isLoading || breakdowns.isLoading,
  };
}

const seriesPoints = (d: DashboardData, key: 'traces' | 'cost' | 'tokens' | 'observations') =>
  d.points.map((p) => ({ label: p.label, value: p[key] }));

const modelRows = (d: DashboardData): t.BarRow[] =>
  (d.breakdowns?.modelUsage ?? []).map((m) => ({
    label: m.model,
    value: m.cost,
    display: formatCost(m.cost),
  }));

const scoreRows = (d: DashboardData): t.BarRow[] =>
  (d.breakdowns?.scoreDistribution ?? []).map((sc) => ({
    label: sc.average === null ? sc.name : `${sc.name} (avg ${sc.average.toFixed(2)})`,
    value: sc.count,
    display: sc.count.toLocaleString(),
  }));

const userRows = (d: DashboardData): t.BarRow[] =>
  (d.breakdowns?.userConsumption ?? []).map((u) => ({
    label: u.userId,
    value: u.cost,
    display: formatCost(u.cost),
  }));

const seconds = (n: number) => `${n.toFixed(2)}s`;

/**
 * The curated widget catalog — the building blocks for both the Home dashboard and
 * any custom dashboard. Each widget renders from the shared `DashboardData` so a
 * custom dashboard just runs the same queries once and renders a chosen subset.
 */
export const WIDGET_CATALOG: WidgetDef[] = [
  { id: 'traces', titleKey: 'com_dash_w_traces', render: (d) => <TimeSeriesChart points={seriesPoints(d, 'traces')} /> },
  {
    id: 'cost',
    titleKey: 'com_dash_w_cost',
    render: (d) => <TimeSeriesChart points={seriesPoints(d, 'cost')} formatValue={formatCost} />,
  },
  {
    id: 'tokens',
    titleKey: 'com_dash_w_tokens',
    render: (d) => <TimeSeriesChart points={seriesPoints(d, 'tokens')} formatValue={formatTokens} />,
  },
  {
    id: 'observations',
    titleKey: 'com_dash_w_observations',
    render: (d) => <TimeSeriesChart points={seriesPoints(d, 'observations')} />,
  },
  { id: 'model_usage', titleKey: 'com_dash_w_model_usage', render: (d) => <BarList rows={modelRows(d)} /> },
  { id: 'scores', titleKey: 'com_dash_w_scores', render: (d) => <BarList rows={scoreRows(d)} /> },
  { id: 'user_consumption', titleKey: 'com_dash_w_user_consumption', render: (d) => <BarList rows={userRows(d)} /> },
  {
    id: 'latency',
    titleKey: 'com_dash_w_latency',
    render: (d) => (
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="p50" value={seconds(d.breakdowns?.latency.p50 ?? 0)} />
        <StatCard label="p95" value={seconds(d.breakdowns?.latency.p95 ?? 0)} />
        <StatCard label="p99" value={seconds(d.breakdowns?.latency.p99 ?? 0)} />
      </div>
    ),
  },
];

export const WIDGET_BY_ID = new Map(WIDGET_CATALOG.map((w) => [w.id, w]));

/** Render a single catalog widget (by id) as a titled card; null if unknown id. */
export function CatalogWidget({
  id,
  data,
  title,
  action,
}: {
  id: string;
  data: DashboardData;
  title: string;
  action?: ReactNode;
}) {
  const def = WIDGET_BY_ID.get(id);
  if (!def) return null;
  return (
    <Widget title={title} info={action}>
      {def.render(data)}
    </Widget>
  );
}
