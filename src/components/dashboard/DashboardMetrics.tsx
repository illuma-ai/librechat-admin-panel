import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import {
  dashboardBreakdownsQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardTimeseriesQueryOptions,
} from '@/server';
import { formatCost, formatTokens, parseChDate, useTracingTenant } from '@/components/traces';
import { Widget, StatCard } from './cards';
import { TimeSeriesChart } from './charts/TimeSeriesChart';
import { BarList } from './charts/BarList';

interface DashboardMetricsProps {
  tenant: string;
  range: t.TraceRange;
  onTenant: (tenant: string) => void;
  onRange: (range: t.TraceRange) => void;
}

const RANGE_KEYS: { value: t.TraceRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'com_traces_range_24h' },
  { value: '7d', labelKey: 'com_traces_range_7d' },
  { value: '30d', labelKey: 'com_traces_range_30d' },
  { value: 'all', labelKey: 'com_traces_range_all' },
];

/** Compact bucket-axis label: time-of-day for the 24h range, else month/day. */
function bucketLabel(bucket: string, range: t.TraceRange): string {
  const d = parseChDate(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  if (range === '24h') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Observability dashboard (reference Home parity): tenant + time-range controls,
 * a KPI row, time-series charts (traces / cost / tokens / observations) and
 * breakdown widgets (model usage, scores). All metrics derive from the existing
 * telemetry via tenant-scoped server aggregates.
 */
export function DashboardMetrics({ tenant, range, onTenant, onRange }: DashboardMetricsProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);

  const summary = useQuery(dashboardSummaryQueryOptions(effectiveTenant, range));
  const series = useQuery(dashboardTimeseriesQueryOptions(effectiveTenant, range));
  const breakdowns = useQuery(dashboardBreakdownsQueryOptions(effectiveTenant, range));

  const buckets = useMemo(() => series.data ?? [], [series.data]);
  const points = useMemo(
    () =>
      buckets.map((b) => ({ label: bucketLabel(b.bucket, range), ...b })),
    [buckets, range],
  );
  const s = summary.data;

  const modelRows: t.BarRow[] = (breakdowns.data?.modelUsage ?? []).map((m) => ({
    label: m.model,
    value: m.cost,
    display: formatCost(m.cost),
  }));
  const scoreRows: t.BarRow[] = (breakdowns.data?.scoreDistribution ?? []).map((sc) => ({
    label: sc.average === null ? sc.name : `${sc.name} (avg ${sc.average.toFixed(2)})`,
    value: sc.count,
    display: sc.count.toLocaleString(),
  }));
  const userRows: t.BarRow[] = (breakdowns.data?.userConsumption ?? []).map((u) => ({
    label: u.userId,
    value: u.cost,
    display: formatCost(u.cost),
  }));
  const latency = breakdowns.data?.latency;
  const formatSeconds = (n: number) => `${n.toFixed(2)}s`;

  return (
    <section aria-label={localize('com_dash_metrics')} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-(--ui-color-text-default)">
          {localize('com_dash_metrics')}
        </h2>
        <div className="flex items-center gap-2">
          <Select
            value={effectiveTenant}
            onSelect={onTenant}
            options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
          />
          <Select
            value={range}
            onSelect={(value) => onRange(value as t.TraceRange)}
            options={RANGE_KEYS.map((opt) => ({ value: opt.value, label: localize(opt.labelKey) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={localize('com_dash_kpi_traces')} value={(s?.traces ?? 0).toLocaleString()} />
        <StatCard
          label={localize('com_dash_kpi_observations')}
          value={(s?.observations ?? 0).toLocaleString()}
        />
        <StatCard label={localize('com_dash_kpi_users')} value={(s?.users ?? 0).toLocaleString()} />
        <StatCard label={localize('com_dash_kpi_cost')} value={formatCost(s?.cost ?? 0)} />
        <StatCard label={localize('com_dash_kpi_tokens')} value={formatTokens(s?.tokens ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Widget title={localize('com_dash_w_traces')}>
          <TimeSeriesChart points={points.map((p) => ({ label: p.label, value: p.traces }))} />
        </Widget>
        <Widget title={localize('com_dash_w_cost')}>
          <TimeSeriesChart
            points={points.map((p) => ({ label: p.label, value: p.cost }))}
            formatValue={formatCost}
          />
        </Widget>
        <Widget title={localize('com_dash_w_tokens')}>
          <TimeSeriesChart
            points={points.map((p) => ({ label: p.label, value: p.tokens }))}
            formatValue={formatTokens}
          />
        </Widget>
        <Widget title={localize('com_dash_w_observations')}>
          <TimeSeriesChart points={points.map((p) => ({ label: p.label, value: p.observations }))} />
        </Widget>
        <Widget title={localize('com_dash_w_model_usage')}>
          <BarList rows={modelRows} />
        </Widget>
        <Widget title={localize('com_dash_w_scores')}>
          <BarList rows={scoreRows} />
        </Widget>
        <Widget title={localize('com_dash_w_user_consumption')}>
          <BarList rows={userRows} />
        </Widget>
        <Widget title={localize('com_dash_w_latency')}>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="p50" value={formatSeconds(latency?.p50 ?? 0)} />
            <StatCard label="p95" value={formatSeconds(latency?.p95 ?? 0)} />
            <StatCard label="p99" value={formatSeconds(latency?.p99 ?? 0)} />
          </div>
        </Widget>
      </div>
    </section>
  );
}
