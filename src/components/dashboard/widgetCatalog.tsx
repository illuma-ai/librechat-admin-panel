import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
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
  traceLatency: (t.LatencyBucket & { label: string })[];
  generationLatency: (t.LatencyBucket & { label: string })[];
  observationLatency: (t.LatencyBucket & { label: string })[];
  isLoading: boolean;
}

/** A reusable dashboard widget. `showAllTo` adds a header link; `placeholder` marks WIP. */
export interface WidgetDef {
  id: string;
  titleKey: string;
  render: (d: DashboardData) => ReactNode;
  showAllTo?: string;
  placeholder?: boolean;
}

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
  const traceLat = useQuery(dashboardLatencySeriesQueryOptions(tenant, range, 'trace'));
  const genLat = useQuery(dashboardLatencySeriesQueryOptions(tenant, range, 'generation'));
  const obsLat = useQuery(dashboardLatencySeriesQueryOptions(tenant, range, 'observation'));

  const label = (b: { bucket: string }) => bucketLabel(b.bucket, range);
  const points = useMemo(
    () => (series.data ?? []).map((b) => ({ ...b, label: label(b) })),
    [series.data, range],
  );
  const withLabel = (rows?: t.LatencyBucket[]) => (rows ?? []).map((b) => ({ ...b, label: label(b) }));

  return {
    summary: summary.data,
    breakdowns: breakdowns.data,
    points,
    traceLatency: useMemo(() => withLabel(traceLat.data), [traceLat.data, range]),
    generationLatency: useMemo(() => withLabel(genLat.data), [genLat.data, range]),
    observationLatency: useMemo(() => withLabel(obsLat.data), [obsLat.data, range]),
    isLoading: summary.isLoading || series.isLoading || breakdowns.isLoading,
  };
}

const barPoints = (d: DashboardData, key: 'traces' | 'cost' | 'tokens' | 'observations') =>
  d.points.map((p) => ({ label: p.label, value: p[key] }));

/** Model Usage widget with Cost / Usage (tokens) tabs over time (reference parity). */
function ModelUsageWidget({ data }: { data: DashboardData }) {
  const localize = useLocalize();
  const [tab, setTab] = useState<'cost' | 'tokens'>('cost');
  const tabBtn = (active: boolean) =>
    `rounded px-2 py-0.5 text-xs ${active ? 'bg-(--ui-color-background-muted) text-(--ui-color-text-default)' : 'text-(--ui-color-text-muted)'}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <button type="button" className={tabBtn(tab === 'cost')} onClick={() => setTab('cost')}>
          {localize('com_dash_tab_cost')}
        </button>
        <button type="button" className={tabBtn(tab === 'tokens')} onClick={() => setTab('tokens')}>
          {localize('com_dash_tab_usage')}
        </button>
      </div>
      {tab === 'cost' ? (
        <BarTimeChart points={barPoints(data, 'cost')} valueName="Cost" formatValue={formatCost} />
      ) : (
        <BarTimeChart points={barPoints(data, 'tokens')} valueName="Tokens" formatValue={formatTokens} />
      )}
    </div>
  );
}

function PlaceholderBody() {
  const localize = useLocalize();
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-(--ui-color-stroke-default) text-sm text-(--ui-color-text-muted)">
      {localize('com_dash_coming_soon')}
    </div>
  );
}

/**
 * Widget catalog mirroring the reference dashboard 1:1 (Traces, Model costs, Scores,
 * Observations by time, Model Usage [tabbed], User consumption, Trace/Generation/
 * Observation latency percentiles, Model latencies, Scores Analytics). Each renders
 * from the shared `DashboardData`; computable widgets are live, the rest are
 * labelled placeholders.
 */
export const WIDGET_CATALOG: WidgetDef[] = [
  {
    id: 'traces',
    titleKey: 'com_dash_w_traces',
    showAllTo: '/traces',
    render: (d) => <BarTimeChart points={barPoints(d, 'traces')} valueName="Traces" />,
  },
  {
    id: 'model_costs',
    titleKey: 'com_dash_w_model_costs',
    showAllTo: '/observations',
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
    id: 'scores',
    titleKey: 'com_dash_w_scores',
    showAllTo: '/scores',
    render: (d) => (
      <MetricTable
        rows={d.breakdowns?.scoreDistribution ?? []}
        rowKey={(r) => r.name}
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name },
          { key: 'count', header: 'Count', align: 'right', render: (r) => r.count.toLocaleString() },
          { key: 'avg', header: 'Avg', align: 'right', render: (r) => (r.average === null ? '—' : r.average.toFixed(2)) },
        ]}
      />
    ),
  },
  {
    id: 'observations',
    titleKey: 'com_dash_w_observations',
    render: (d) => <BarTimeChart points={barPoints(d, 'observations')} valueName="Observations" />,
  },
  {
    id: 'model_usage',
    titleKey: 'com_dash_w_model_usage',
    render: (d) => <ModelUsageWidget data={d} />,
  },
  {
    id: 'user_consumption',
    titleKey: 'com_dash_w_user_consumption',
    showAllTo: '/trace-users',
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
  { id: 'trace_latency', titleKey: 'com_dash_w_latency', render: (d) => <LatencyLineChart points={d.traceLatency} /> },
  {
    id: 'generation_latency',
    titleKey: 'com_dash_w_gen_latency',
    render: (d) => <LatencyLineChart points={d.generationLatency} />,
  },
  {
    id: 'observation_latency',
    titleKey: 'com_dash_w_obs_latency',
    render: (d) => <LatencyLineChart points={d.observationLatency} />,
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
  { id: 'scores_analytics', titleKey: 'com_dash_w_scores_analytics', placeholder: true, render: () => <PlaceholderBody /> },
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
  const localize = useLocalize();
  const def = WIDGET_BY_ID.get(id);
  if (!def) return null;
  const showAll =
    def.showAllTo && !action ? (
      <a
        href={def.showAllTo}
        className="ml-auto text-xs text-(--ui-color-text-link) no-underline hover:underline"
      >
        {localize('com_dash_show_all')}
      </a>
    ) : undefined;
  return (
    <Widget title={title} info={action ?? showAll}>
      {def.render(data)}
    </Widget>
  );
}
