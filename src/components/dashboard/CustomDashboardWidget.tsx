import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { widgetDataQueryOptions } from '@/server';
import { MEASURE_META } from '@/server/widget.logic';
import { formatCost, formatTokens } from '@/components/traces';
import { DashboardCard } from './cards';
import { WidgetChart } from './charts/WidgetChart';
import { useWidgets } from './useWidgets';

/** Value formatter for a measure (cost/tokens/latency → formatted, else compact number). */
export function measureFormatter(measure: t.WidgetMeasure): (n: number) => string {
  if (measure === 'cost') return formatCost;
  if (measure === 'tokens') return formatTokens;
  if (measure === 'latency') return (n) => `${n.toFixed(2)}s`;
  return (n) => n.toLocaleString();
}

/**
 * Renders a saved custom widget (from the builder) as a dashboard card: loads its
 * config from `useWidgets`, runs its query for the dashboard's tenant + range, and
 * renders the result via `WidgetChart`. Returns null if the widget was deleted.
 */
export function CustomDashboardWidget({
  widgetId,
  tenant,
  range,
  action,
}: {
  widgetId: string;
  tenant: string;
  range: t.TraceRange;
  action?: ReactNode;
}) {
  const { get } = useWidgets();
  const cfg = get(widgetId);
  const preview = useQuery(
    widgetDataQueryOptions({
      tenantId: tenant,
      range,
      view: cfg?.view ?? 'observations',
      measure: cfg?.measure ?? 'count',
      aggregation: cfg?.aggregation ?? 'count',
      dimension: cfg?.dimension ?? 'none',
      chartType: cfg?.chartType ?? 'line',
    }),
  );
  if (!cfg) return null;
  return (
    <DashboardCard title={cfg.name} description={cfg.description || undefined} headerRight={action}>
      <WidgetChart
        data={preview.data}
        chartType={cfg.chartType}
        range={range}
        formatValue={measureFormatter(cfg.measure)}
        valueName={MEASURE_META[cfg.measure].label}
      />
    </DashboardCard>
  );
}
