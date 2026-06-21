import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import {
  dashboardBreakdownsQueryOptions,
  dashboardLatencySeriesQueryOptions,
  dashboardLatencyTablesQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardTimeseriesQueryOptions,
  dashboardTracesByNameQueryOptions,
  dashboardUsageBreakdownQueryOptions,
  dashboardObservationsByLevelQueryOptions,
} from '@/server';
import { formatCost, formatTokens, formatIntervalSeconds } from '@/components/traces';
import { bucketLabel, pivotUsage, pivotCount } from './chartData';
import { DashboardCard, TotalMetric, ExpandButton, CardTabs } from './cards';
import { ModelMultiSelect } from './ModelMultiSelect';
import { HorizontalBarChart, LineTimeChart, LatencyLineChart, MultiLineChart } from './charts/recharts';
import { MetricTable } from './charts/MetricTable';

/** Resolved data bundle shared by every dashboard widget for a tenant + range. */
export interface DashboardData {
  summary?: t.DashboardSummary;
  breakdowns?: t.DashboardBreakdowns;
  tracesByName: t.NameCountRow[];
  latencyTables?: t.DashboardLatencyTables;
  usageBreakdown?: t.DashboardUsageBreakdown;
  observationsByLevel: t.LevelSeriesRow[];
  points: (t.MetricBucket & { label: string })[];
  modelLatency: (t.LatencyBucket & { label: string })[];
  range: t.TraceRange;
  isLoading: boolean;
}

/** A reusable dashboard widget rendered as a self-contained card. */
export interface WidgetDef {
  id: string;
  titleKey: string;
  Component: (props: { data: DashboardData; title: string; action?: ReactNode }) => ReactNode;
}

/** Run the dashboard aggregate queries and derive the shared, labelled data bundle. */
export function useDashboardData(
  tenant: string,
  range: t.TraceRange,
  environment: string[] = [],
): DashboardData {
  const summary = useQuery(dashboardSummaryQueryOptions(tenant, range, environment));
  const series = useQuery(dashboardTimeseriesQueryOptions(tenant, range, environment));
  const breakdowns = useQuery(dashboardBreakdownsQueryOptions(tenant, range, environment));
  const tracesByName = useQuery(dashboardTracesByNameQueryOptions(tenant, range, environment));
  const latencyTables = useQuery(dashboardLatencyTablesQueryOptions(tenant, range, environment));
  const usageBreakdown = useQuery(dashboardUsageBreakdownQueryOptions(tenant, range, environment));
  const obsByLevel = useQuery(dashboardObservationsByLevelQueryOptions(tenant, range, environment));
  const modelLat = useQuery(dashboardLatencySeriesQueryOptions(tenant, range, 'generation', environment));

  const points = useMemo(
    () => (series.data ?? []).map((b) => ({ ...b, label: bucketLabel(b.bucket, range) })),
    [series.data, range],
  );
  const modelLatency = useMemo(
    () => (modelLat.data ?? []).map((b) => ({ ...b, label: bucketLabel(b.bucket, range) })),
    [modelLat.data, range],
  );

  return {
    summary: summary.data,
    breakdowns: breakdowns.data,
    tracesByName: tracesByName.data ?? [],
    latencyTables: latencyTables.data,
    usageBreakdown: usageBreakdown.data,
    observationsByLevel: obsByLevel.data ?? [],
    points,
    modelLatency,
    range,
    isLoading: summary.isLoading || series.isLoading || breakdowns.isLoading,
  };
}


const num = (n?: number) => (n ?? 0).toLocaleString();
const compact = (n: number) => formatTokens(n); // K/M compact formatter

// ── Individual widgets (each a self-contained DashboardCard) ─────────

function TracesWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? data.tracesByName.slice(0, 20) : data.tracesByName.slice(0, 5);
  return (
    <DashboardCard title={title} headerRight={action}>
      <TotalMetric metric={compact(data.summary?.traces ?? 0)} description={localize('com_dash_total_traces')} />
      <HorizontalBarChart points={rows.map((r) => ({ name: r.name, value: r.count }))} colorIndex={0} />
      <ExpandButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} totalLength={data.tracesByName.length} maxLength={5} />
    </DashboardCard>
  );
}

function ModelCostsWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  return (
    <DashboardCard title={title} headerRight={action}>
      <TotalMetric metric={formatCost(data.summary?.cost ?? 0)} description={localize('com_dash_total_cost')} />
      <MetricTable
        rows={data.breakdowns?.modelUsage ?? []}
        rowKey={(r) => r.model}
        columns={[
          { key: 'model', header: 'Model', render: (r) => r.model },
          { key: 'tokens', header: 'Tokens', align: 'right', render: (r) => formatTokens(r.tokens) },
          { key: 'cost', header: 'USD', align: 'right', render: (r) => formatCost(r.cost) },
        ]}
      />
    </DashboardCard>
  );
}

/** Score-type glyph shown before a score name (reference: # numeric, Ⓑ boolean, Ⓒ categorical). */
function scoreTypeIcon(dataType: string): string {
  if (dataType === 'NUMERIC') return '#';
  if (dataType === 'BOOLEAN') return 'Ⓑ';
  if (dataType === 'CATEGORICAL') return 'Ⓒ';
  return '#';
}

/** Display label for a score row: "{icon} name (source)" (source lower-cased, reference parity). */
function scoreLabel(r: t.ScoreDistributionRow): string {
  const src = r.source ? ` (${r.source.toLowerCase()})` : '';
  return `${scoreTypeIcon(r.dataType)} ${r.name}${src}`;
}

function ScoresWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(false);
  const all = data.breakdowns?.scoreDistribution ?? [];
  const total = all.reduce((s, r) => s + r.count, 0);
  const rows = expanded ? all : all.slice(0, 5);
  // Categorical scores blank the Avg/0/1 cells; boolean blanks Avg; numeric shows Avg only.
  const cell = (v: number | null) => (v === null ? '—' : v.toLocaleString());
  return (
    <DashboardCard title={title} headerRight={action}>
      <TotalMetric metric={num(total)} description={localize('com_dash_total_scores')} />
      <MetricTable
        rows={rows}
        rowKey={(r) => `${r.name}::${r.source}`}
        columns={[
          { key: 'name', header: 'Name', render: (r) => scoreLabel(r) },
          { key: 'count', header: '#', align: 'right', render: (r) => r.count.toLocaleString() },
          {
            key: 'avg',
            header: 'Avg',
            align: 'right',
            render: (r) => (r.average === null ? '—' : r.average.toFixed(2)),
          },
          {
            key: 'zero',
            header: '0',
            align: 'right',
            render: (r) => (r.dataType === 'CATEGORICAL' ? '—' : cell(r.zero)),
          },
          {
            key: 'one',
            header: '1',
            align: 'right',
            render: (r) => (r.dataType === 'CATEGORICAL' ? '—' : cell(r.one)),
          },
        ]}
      />
      <ExpandButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} totalLength={all.length} maxLength={5} />
    </DashboardCard>
  );
}

/** Stable level order so colours/pills stay consistent (reference: DEFAULT/DEBUG/…/ERROR). */
const LEVEL_ORDER = ['DEFAULT', 'DEBUG', 'WARNING', 'ERROR'];

function ObservationsWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  const { data: chartData, keys } = pivotCount(
    data.observationsByLevel.map((r) => ({ bucket: r.bucket, key: r.level, count: r.count })),
    data.range,
  );
  const seriesKeys = [...keys].sort(
    (a, b) => (LEVEL_ORDER.indexOf(a) + 1 || 99) - (LEVEL_ORDER.indexOf(b) + 1 || 99),
  );
  return (
    <DashboardCard
      title={title}
      headerRight={action}
      headerChildren={<CardTabs active="level" onSelect={() => {}} tabs={[{ value: 'level', label: localize('com_dash_obs_by_level') }]} />}
    >
      <TotalMetric metric={num(data.summary?.observations)} description={localize('com_dash_total_observations')} />
      {seriesKeys.length > 0 ? (
        <MultiLineChart data={chartData} seriesKeys={seriesKeys} formatValue={(n) => n.toLocaleString()} />
      ) : (
        <LineTimeChart points={data.points.map((p) => ({ label: p.label, value: p.observations }))} valueName="Observations" colorIndex={1} />
      )}
    </DashboardCard>
  );
}

type UsageTab = 'cost_model' | 'cost_type' | 'usage_model' | 'usage_type';

function ModelUsageWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  const [tab, setTab] = useState<UsageTab>('cost_model');
  const metric: 'cost' | 'tokens' = tab.startsWith('cost') ? 'cost' : 'tokens';
  const dim: 'model' | 'type' = tab.endsWith('model') ? 'model' : 'type';
  const rows = data.usageBreakdown ? data.usageBreakdown[dim] : [];
  const { data: chartData, keys } = pivotUsage(rows, metric, data.range);
  const isCost = metric === 'cost';

  // "All models" header control filters the model-dimension series (reference parity).
  // Distinct model names come from the model breakdown; default = all selected.
  const allModels = useMemo(() => {
    const seen: string[] = [];
    for (const r of data.usageBreakdown?.model ?? []) if (!seen.includes(r.key)) seen.push(r.key);
    return seen;
  }, [data.usageBreakdown]);
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const selected = selectedModels ?? allModels;
  // Only the model-dimension tabs are filtered by the model selector.
  const visibleKeys = dim === 'model' ? keys.filter((k) => selected.includes(k)) : keys;

  return (
    <DashboardCard
      title={title}
      headerRight={
        <div className="flex items-center gap-2">
          <ModelMultiSelect options={allModels} selected={selected} onChange={setSelectedModels} />
          {action}
        </div>
      }
      headerChildren={
        <CardTabs
          active={tab}
          onSelect={setTab}
          tabs={[
            { value: 'cost_model', label: localize('com_dash_tab_cost_model') },
            { value: 'cost_type', label: localize('com_dash_tab_cost_type') },
            { value: 'usage_model', label: localize('com_dash_tab_usage_model') },
            { value: 'usage_type', label: localize('com_dash_tab_usage_type') },
          ]}
        />
      }
    >
      <TotalMetric
        metric={isCost ? formatCost(data.summary?.cost ?? 0) : formatTokens(data.summary?.tokens ?? 0)}
        description={isCost ? localize('com_dash_total_cost') : localize('com_dash_total_tokens')}
      />
      <MultiLineChart data={chartData} seriesKeys={visibleKeys} formatValue={isCost ? formatCost : formatTokens} />
    </DashboardCard>
  );
}

function UserConsumptionWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  const [tab, setTab] = useState<'cost' | 'traces'>('cost');
  const [expanded, setExpanded] = useState(false);
  const all = data.breakdowns?.userConsumption ?? [];
  const rows = expanded ? all : all.slice(0, 5);
  const isCost = tab === 'cost';
  return (
    <DashboardCard
      title={title}
      headerRight={action}
      headerChildren={
        <CardTabs
          active={tab}
          onSelect={setTab}
          tabs={[
            { value: 'cost', label: localize('com_dash_tab_token_cost') },
            { value: 'traces', label: localize('com_dash_tab_trace_count') },
          ]}
        />
      }
    >
      <TotalMetric metric={formatCost(data.summary?.cost ?? 0)} description={localize('com_dash_total_cost')} />
      <HorizontalBarChart
        points={rows.map((r) => ({ name: r.userId, value: isCost ? r.cost : r.traces }))}
        formatValue={isCost ? formatCost : (n) => n.toLocaleString()}
        colorIndex={4}
      />
      <ExpandButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} totalLength={all.length} maxLength={5} />
    </DashboardCard>
  );
}

function latencyColumns(withType: boolean) {
  const cols = [
    {
      key: 'name',
      header: 'Name',
      render: (r: t.LatencyTableRow) =>
        withType && r.type ? (
          <span>
            <span className="mr-1 rounded-sm bg-(--ui-color-background-muted) px-1 text-[10px] uppercase">{r.type}</span>
            {r.name}
          </span>
        ) : (
          r.name
        ),
    },
    { key: 'p50', header: 'p50', align: 'right' as const, render: (r: t.LatencyTableRow) => formatIntervalSeconds(r.p50) },
    { key: 'p90', header: 'p90', align: 'right' as const, render: (r: t.LatencyTableRow) => formatIntervalSeconds(r.p90) },
    { key: 'p95', header: 'p95', align: 'right' as const, render: (r: t.LatencyTableRow) => formatIntervalSeconds(r.p95) },
    { key: 'p99', header: 'p99', align: 'right' as const, render: (r: t.LatencyTableRow) => formatIntervalSeconds(r.p99) },
  ];
  return cols;
}

function makeLatencyTableWidget(pick: (t: t.DashboardLatencyTables) => t.LatencyTableRow[], withType: boolean) {
  return function LatencyTableWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
    const rows = data.latencyTables ? pick(data.latencyTables) : [];
    return (
      <DashboardCard title={title} headerRight={action}>
        <MetricTable rows={rows} rowKey={(r) => r.name} columns={latencyColumns(withType)} />
      </DashboardCard>
    );
  };
}

function ModelLatenciesWidget({ data, title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  return (
    <DashboardCard title={title} description={localize('com_dash_model_lat_sub')} headerRight={action}>
      <LatencyLineChart points={data.modelLatency} />
    </DashboardCard>
  );
}

function PlaceholderWidget({ title, action }: { data: DashboardData; title: string; action?: ReactNode }) {
  const localize = useLocalize();
  return (
    <DashboardCard title={title} description={localize('com_dash_scores_analytics_sub')} headerRight={action}>
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-(--ui-color-stroke-default) text-sm text-(--ui-color-text-muted)">
        {localize('com_dash_coming_soon')}
      </div>
    </DashboardCard>
  );
}

/**
 * Catalog mirroring the reference dashboard, ordered so every row fills the 6-col
 * grid exactly (no ragged rows):
 *   row1: Traces(2) + Model costs(2) + Scores(2)
 *   row2: Observations(3) + Model Usage(3)
 *   row3: User consumption(3) + Scores Analytics(3)
 *   row4: Trace(2) + Generation(2) + Observation(2) latency tables
 *   row5: Model latencies(6)
 */
export const WIDGET_CATALOG: (WidgetDef & { span: string })[] = [
  { id: 'traces', titleKey: 'com_dash_w_traces', span: 'xl:col-span-2', Component: TracesWidget },
  { id: 'model_costs', titleKey: 'com_dash_w_model_costs', span: 'xl:col-span-2', Component: ModelCostsWidget },
  { id: 'scores', titleKey: 'com_dash_w_scores', span: 'xl:col-span-2', Component: ScoresWidget },
  { id: 'observations', titleKey: 'com_dash_w_observations', span: 'xl:col-span-3', Component: ObservationsWidget },
  { id: 'model_usage', titleKey: 'com_dash_w_model_usage', span: 'xl:col-span-3', Component: ModelUsageWidget },
  { id: 'user_consumption', titleKey: 'com_dash_w_user_consumption', span: 'xl:col-span-3', Component: UserConsumptionWidget },
  { id: 'scores_analytics', titleKey: 'com_dash_w_scores_analytics', span: 'xl:col-span-3', Component: PlaceholderWidget },
  {
    id: 'trace_latency',
    titleKey: 'com_dash_w_latency',
    span: 'xl:col-span-2',
    Component: makeLatencyTableWidget((t) => t.trace, false),
  },
  {
    id: 'generation_latency',
    titleKey: 'com_dash_w_gen_latency',
    span: 'xl:col-span-2',
    Component: makeLatencyTableWidget((t) => t.generation, false),
  },
  {
    id: 'observation_latency',
    titleKey: 'com_dash_w_obs_latency',
    span: 'xl:col-span-2',
    Component: makeLatencyTableWidget((t) => t.observation, true),
  },
  { id: 'model_latency', titleKey: 'com_dash_w_model_latencies', span: 'xl:col-span-full', Component: ModelLatenciesWidget },
];

export const WIDGET_BY_ID = new Map(WIDGET_CATALOG.map((w) => [w.id, w]));

/** Render a catalog widget (by id) as a self-contained card; null for unknown ids. */
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
  return <def.Component data={data} title={title} action={action} />;
}
