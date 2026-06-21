import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { traceFilterOptionsQueryOptions } from '@/server';
import { useTracingTenant } from '@/components/traces';
import { useDashboardData, WIDGET_CATALOG, CatalogWidget } from './widgetCatalog';
import { DashboardFilters } from './DashboardFilters';

interface DashboardMetricsProps {
  tenant: string;
  range: t.TraceRange;
  environment: string;
  onTenant: (tenant: string) => void;
  onRange: (range: t.TraceRange) => void;
  onEnvironment: (environment: string) => void;
}

const RANGE_KEYS: { value: t.TraceRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'com_traces_range_24h' },
  { value: '7d', labelKey: 'com_traces_range_7d' },
  { value: '30d', labelKey: 'com_traces_range_30d' },
  { value: 'all', labelKey: 'com_traces_range_all' },
];

/**
 * Observability dashboard (reference Home parity): tenant + time-range controls over
 * a grid of the full widget catalog (time-series bars, latency-percentile lines, and
 * breakdown tables). All metrics derive from tenant-scoped server aggregates; custom
 * dashboards reuse the same catalog.
 */
export function DashboardMetrics({
  tenant,
  range,
  environment,
  onTenant,
  onRange,
  onEnvironment,
}: DashboardMetricsProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const filterOptions = useQuery(traceFilterOptionsQueryOptions(effectiveTenant));
  const [filters, setFilters] = useState<t.DashboardTraceFilter[]>([]);
  const data = useDashboardData(effectiveTenant, range, environment ? [environment] : [], filters);

  const envOptions = [
    { value: '', label: localize('com_dash_all_environments') },
    ...(filterOptions.data?.environments ?? []).map((e) => ({ value: e.value, label: e.value })),
  ];

  return (
    <section aria-label={localize('com_dash_metrics')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-52">
          <Select
            value={effectiveTenant}
            onSelect={onTenant}
            options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
          />
        </div>
        <div className="w-44">
          <Select
            value={range}
            onSelect={(value) => onRange(value as t.TraceRange)}
            options={RANGE_KEYS.map((opt) => ({ value: opt.value, label: localize(opt.labelKey) }))}
          />
        </div>
        <div className="w-44">
          <Select value={environment} onSelect={onEnvironment} options={envOptions} />
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-6">
        {WIDGET_CATALOG.map((w) => (
          <div key={w.id} className={`col-span-1 ${w.span}`}>
            <CatalogWidget id={w.id} data={data} title={localize(w.titleKey)} />
          </div>
        ))}
      </div>
    </section>
  );
}
