import { Select } from '@clickhouse/click-ui';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { Pagination, SearchInput } from '@/components/shared';

const RANGE_OPTIONS: { value: t.TraceRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'com_traces_range_24h' },
  { value: '7d', labelKey: 'com_traces_range_7d' },
  { value: '30d', labelKey: 'com_traces_range_30d' },
  { value: 'all', labelKey: 'com_traces_range_all' },
];

interface TracingShellProps {
  tenant: string;
  tenants: string[];
  onTenant: (tenant: string) => void;
  search: string;
  onSearch: (search: string) => void;
  range: t.TraceRange;
  onRange: (range: t.TraceRange) => void;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  searchPlaceholder: string;
  /** Tab bar slot (Traces/Observations use TracingTabs; Sessions passes none). */
  tabs?: ReactNode;
  /** Extra toolbar controls (filters, columns, …). */
  toolbarExtra?: ReactNode;
  children: ReactNode;
  drawer?: ReactNode;
}

/**
 * Shared Tracing page layout (Langfuse hierarchy): tabs → toolbar (search +
 * tenant + range + extras) → full-width table → pagination. The page title lives
 * in the global top-nav header. Presentational; the page owns tenant resolution
 * (`useTracingTenant`) and the data query.
 */
export function TracingShell({
  tenant,
  tenants,
  onTenant,
  search,
  onSearch,
  range,
  onRange,
  page,
  totalPages,
  onPage,
  searchPlaceholder,
  tabs,
  toolbarExtra,
  children,
  drawer,
}: TracingShellProps) {
  const localize = useLocalize();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {tabs}

      {/* Toolbar: search + tenant + time range + extra controls */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-(--cui-color-stroke-default) px-3 py-2">
        <div className="min-w-65 flex-1">
          <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select
            value={tenant}
            onSelect={onTenant}
            placeholder={localize('com_traces_select_tenant')}
            options={tenants.map((tn) => ({ value: tn, label: tn }))}
            disabled={tenants.length === 0}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <Select
            value={range}
            onSelect={(value) => onRange(value as t.TraceRange)}
            options={RANGE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: localize(opt.labelKey),
            }))}
          />
        </div>
        {toolbarExtra}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>

      <div className="flex shrink-0 justify-end border-t border-(--cui-color-stroke-default) px-3 py-1.5">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPage} />
      </div>
      {drawer}
    </div>
  );
}
