import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  dashboardBreakdownsQueryOptions,
  dashboardLatencySeriesQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardTimeseriesQueryOptions,
} from '@/server';
import { formatCost, formatTokens, parseChDate } from '@/components/traces';
import { Widget } from './cards';
import { BarTimeChart, LatencyLineChart } from './charts/recharts';
import { MetricTable } from './charts/MetricTable';

/** Resolved data bundle shared by every dashboard widget for a tenant + range. */
export interface DashboardData {
  summary?: t.DashboardSummary;
  breakdowns?: t.DashboardBreakdowns;
  points: (t.MetricBucket & { label: string })[];
  latencyPoints: (t.LatencyBucket & { label: string })[];
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

/** Run the dashboard aggregate queries and derive the shared, labelled data bundle. */
export function useDashboardData(tenant: string, range: t.TraceRange): DashboardData {
  const summary = useQuery(dashboardSummaryQueryOptions(tenant, range));
  const series = useQuery(dashboardTimeseriesQueryOptions(tenant, range));
  const breakdowns = useQuery(dashboardBreakdownsQueryOptions(tenant, range));
  const latency = useQuery(dashboardLatencySeriesQueryOptions(tenant, range));

  const points = useMemo(
    () => (series.data ?? []).map((b) => ({ ...b, label: bucketLabel(b.bucket, range) })),
    [series.data, range],
  );
  const latencyPoints = useMemo(
    () => (latency.data ?? []).map((b) => ({ ...b, label: bucketLabel(b.bucket, range) })),
    [latency.data, range],
  );

  return {
    summary: summary.data,
    breakdowns: breakdowns.data,
    points,
    latencyPoints,
    isLoading: summary.isLoading || series.isLoading || breakdowns.isLoading || latency.isLoading,
  };
}

const barPoints = (d: DashboardData, key: 'traces' | 'cost' | 'tokens' | 'observations') =>
  d.points.map((p) => ({ label: p.label, value: p[key] }));

/**
 * Widget catalog mirroring the reference dashboard: time-series bar charts, a
 * multi-line latency-percentile chart, and breakdown tables (model costs, model
 * latencies, scores, user consumption). Each renders from the shared `DashboardData`
 * so a custom dashboard runs the queries once and renders a chosen subset.
 */
export const WIDGET_CATALOG: WidgetDef[] = [
  {
    id: 'traces',
    titleKey: 'com_dash_w_traces',
    render: (d) => <BarTimeChart points={barPoints(d, 'traces')} valueName="Traces" />,
  },
  {
    id: 'observations',
    titleKey: 'com_dash_w_observations',
    render: (d) => <BarTimeChart points={barPoints(d, 'observations')} valueName="Observations" />,
  },
  {
    id: 'cost',
    titleKey: 'com_dash_w_cost',
    render: (d) => <BarTimeChart points={barPoints(d, 'cost')} valueName="Cost" formatValue={formatCost} />,
  },
  {
    id: 'trace_latency',
    titleKey: 'com_dash_w_latency',
    render: (d) => <LatencyLineChart points={d.latencyPoints} />,
  },
  {
    id: 'model_costs',
    titleKey: 'com_dash_w_model_costs',
    render: (d) => (
      <MetricTable
        rows={d.breakdowns?.modelUsage ?? []}
        rowKey={(r) => r.model}
        columns={[
          { key: 'model', header: 'Model', render: (r) => r.model },
          { key: 'tokens', header: 'Tokens', align: 'right', render: (r) => formatTokens(r.tokens) },
          { key: 'cost', header: 'USD', align: 'right', render: (r) => formatCost(r.cost) },
        ]}
      />
    ),
  },
  {
    id: 'model_latency',
    titleKey: 'com_dash_w_model_latencies',
    render: (d) => (
      <MetricTable
        rows={d.breakdowns?.modelLatency ?? []}
        rowKey={(r) => r.model}
        columns={[
          { key: 'model', header: 'Model', render: (r) => r.model },
          { key: 'p50', header: 'p50', align: 'right', render: (r) => `${r.p50.toFixed(2)}s` },
          { key: 'p95', header: 'p95', align: 'right', render: (r) => `${r.p95.toFixed(2)}s` },
          { key: 'p99', header: 'p99', align: 'right', render: (r) => `${r.p99.toFixed(2)}s` },
        ]}
      />
    ),
  },
  {
    id: 'scores',
    titleKey: 'com_dash_w_scores',
    render: (d) => (
      <MetricTable
        rows={d.breakdowns?.scoreDistribution ?? []}
        rowKey={(r) => r.name}
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name },
          { key: 'count', header: 'Count', align: 'right', render: (r) => r.count.toLocaleString() },
          {
            key: 'avg',
            header: 'Avg',
            align: 'right',
            render: (r) => (r.average === null ? '—' : r.average.toFixed(2)),
          },
        ]}
      />
    ),
  },
  {
    id: 'user_consumption',
    titleKey: 'com_dash_w_user_consumption',
    render: (d) => (
      <MetricTable
        rows={d.breakdowns?.userConsumption ?? []}
        rowKey={(r) => r.userId}
        columns={[
          { key: 'user', header: 'User', render: (r) => r.userId },
          { key: 'traces', header: 'Traces', align: 'right', render: (r) => r.traces.toLocaleString() },
          { key: 'cost', header: 'Token cost', align: 'right', render: (r) => formatCost(r.cost) },
        ]}
      />
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
