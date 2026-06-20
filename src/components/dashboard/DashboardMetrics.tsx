import { Select } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { formatCost, formatTokens, useTracingTenant } from '@/components/traces';
import { StatCard } from './cards';
import { useDashboardData, WIDGET_CATALOG, CatalogWidget } from './widgetCatalog';

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

/**
 * Observability dashboard (reference Home parity): tenant + time-range controls, a
 * KPI row, and the full widget catalog (time-series + breakdowns). Both the KPIs and
 * widgets derive from the existing telemetry via tenant-scoped aggregates; custom
 * dashboards reuse the same catalog.
 */
export function DashboardMetrics({ tenant, range, onTenant, onRange }: DashboardMetricsProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const data = useDashboardData(effectiveTenant, range);
  const s = data.summary;

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
        {WIDGET_CATALOG.map((w) => (
          <CatalogWidget key={w.id} id={w.id} data={data} title={localize(w.titleKey)} />
        ))}
      </div>
    </section>
  );
}
