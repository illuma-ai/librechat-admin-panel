import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Select, Button } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { widgetDataQueryOptions } from '@/server';
import { VIEW_META, MEASURE_META, CHART_TYPES, normalizeWidget, chartSupportsBreakdown } from '@/server/widget.logic';
import { formatCost, formatTokens, useTracingTenant } from '@/components/traces';
import { DashboardCard } from './cards';
import { WidgetChart } from './charts/WidgetChart';
import { useWidgets } from './useWidgets';

interface WidgetBuilderPageProps {
  widgetId?: string;
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

const VIEW_LABELS: Record<t.WidgetView, string> = {
  traces: 'Traces',
  observations: 'Observations',
  scores: 'Scores',
};
const AGG_LABELS: Record<t.WidgetAggregation, string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  max: 'Max',
  p50: 'p50',
  p95: 'p95',
  p99: 'p99',
};
const DIM_LABELS: Record<t.WidgetDimension, string> = {
  none: 'None',
  name: 'Name',
  model: 'Model',
  type: 'Type',
  user: 'User',
  environment: 'Environment',
};

function measureFormatter(measure: t.WidgetMeasure): (n: number) => string {
  if (measure === 'cost') return formatCost;
  if (measure === 'tokens') return formatTokens;
  if (measure === 'latency') return (n) => `${n.toFixed(2)}s`;
  return (n) => n.toLocaleString();
}

/**
 * Custom widget builder (scoped port of the reference WidgetForm): pick a view,
 * measure + aggregation, optional breakdown dimension and chart type, with a live
 * preview, then save. Saved widgets live in `useWidgets` (localStorage).
 */
export function WidgetBuilderPage({ widgetId, tenant, range, onTenant, onRange }: WidgetBuilderPageProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const { get, save } = useWidgets();
  const existing = widgetId ? get(widgetId) : undefined;

  const [name, setName] = useState(existing?.name ?? 'New widget');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [view, setView] = useState<t.WidgetView>(existing?.view ?? 'observations');
  const [measure, setMeasure] = useState<t.WidgetMeasure>(existing?.measure ?? 'count');
  const [aggregation, setAggregation] = useState<t.WidgetAggregation>(existing?.aggregation ?? 'count');
  const [dimension, setDimension] = useState<t.WidgetDimension>(existing?.dimension ?? 'none');
  const [chartType, setChartType] = useState<t.WidgetChartType>(existing?.chartType ?? 'line');

  // Keep the combination valid whenever a higher-level field changes.
  const norm = useMemo(
    () => normalizeWidget({ view, measure, aggregation, dimension, chartType }),
    [view, measure, aggregation, dimension, chartType],
  );

  const config = {
    view,
    measure: norm.measure,
    aggregation: norm.aggregation,
    dimension: norm.dimension,
    chartType,
  };
  const preview = useQuery(widgetDataQueryOptions({ tenantId: effectiveTenant, range, ...config }));

  const inputClass =
    'w-full rounded-md border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-3 py-2 text-sm text-(--ui-color-text-default) outline-none focus:border-(--ui-color-accent)';
  const field = (label: string, control: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-(--ui-color-text-muted)">{label}</span>
      {control}
    </label>
  );

  const onSave = () => {
    const id = save({ name: name.trim() || 'Untitled widget', description, ...config }, widgetId);
    navigate({ to: '/widgets/$id', params: { id }, search: { tenant: effectiveTenant, range } });
  };

  return (
    <div role="region" aria-label={localize('com_widget_new')} className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <Link
        to="/dashboards"
        search={{}}
        className="inline-flex w-fit items-center gap-1 text-sm text-(--ui-color-text-muted) no-underline hover:text-(--ui-color-text-default)"
      >
        <ChevronLeft className="size-4" />
        {localize('com_dash_widgets')}
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Configuration */}
        <DashboardCard title={localize('com_widget_config')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field(localize('com_dash_col_name'), <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />)}
            {field(
              localize('com_dash_col_description'),
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />,
            )}
            {field(
              localize('com_widget_view'),
              <Select
                value={view}
                onSelect={(v) => setView(v as t.WidgetView)}
                options={(Object.keys(VIEW_META) as t.WidgetView[]).map((v) => ({ value: v, label: VIEW_LABELS[v] }))}
              />,
            )}
            {field(
              localize('com_widget_metric'),
              <Select
                value={norm.measure}
                onSelect={(v) => setMeasure(v as t.WidgetMeasure)}
                options={VIEW_META[view].measures.map((m) => ({ value: m, label: MEASURE_META[m].label }))}
              />,
            )}
            {/* Aggregation only when the measure has a real choice (count is fixed). */}
            {norm.measure !== 'count' &&
              field(
                localize('com_widget_aggregation'),
                <Select
                  value={norm.aggregation}
                  onSelect={(v) => setAggregation(v as t.WidgetAggregation)}
                  options={MEASURE_META[norm.measure].aggs.map((a) => ({ value: a, label: AGG_LABELS[a] }))}
                />,
              )}
            {/* Breakdown only for chart types that support it (hidden for Big Number). */}
            {chartSupportsBreakdown(chartType) &&
              field(
                localize('com_widget_dimension'),
                <Select
                  value={norm.dimension}
                  onSelect={(v) => setDimension(v as t.WidgetDimension)}
                  options={VIEW_META[view].dimensions.map((d) => ({ value: d, label: DIM_LABELS[d] }))}
                />,
              )}
            {field(
              localize('com_widget_chart_type'),
              <Select
                value={chartType}
                onSelect={(v) => setChartType(v as t.WidgetChartType)}
                options={CHART_TYPES.map((c) => ({ value: c.value, label: c.label }))}
              />,
            )}
            {field(
              localize('com_widget_range'),
              <Select
                value={range}
                onSelect={(v) => onRange(v as t.TraceRange)}
                options={RANGE_KEYS.map((opt) => ({ value: opt.value, label: localize(opt.labelKey) }))}
              />,
            )}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="w-52">
              <Select
                value={effectiveTenant}
                onSelect={onTenant}
                options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
              />
            </div>
            <Button onClick={onSave} label={localize('com_ui_save')} />
          </div>
        </DashboardCard>

        {/* Live preview */}
        <DashboardCard title={name || localize('com_widget_preview')} description={DIM_LABELS[norm.dimension] !== 'None' ? `${MEASURE_META[norm.measure].label} • ${DIM_LABELS[norm.dimension]}` : MEASURE_META[norm.measure].label}>
          <WidgetChart
            data={preview.data}
            chartType={chartType}
            range={range}
            formatValue={measureFormatter(norm.measure)}
            valueName={MEASURE_META[norm.measure].label}
          />
        </DashboardCard>
      </div>
    </div>
  );
}
