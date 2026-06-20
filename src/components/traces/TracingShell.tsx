import { useState } from 'react';
import { Select } from '@clickhouse/click-ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { Pagination, SearchInput } from '@/components/shared';
import { AutoRefreshControl, type RefreshInterval } from './AutoRefreshControl';
import { SearchTypeSelect, type SearchType } from './SearchTypeSelect';

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
  /**
   * Search-scope mode shown in the SearchTypeSelect next to the search box.
   * Optional/controlled: when omitted, the shell keeps its own UI-only state
   * (default "IDs / Names"). Does not yet affect the query — see full-text wiring.
   */
  searchType?: SearchType;
  onSearchType?: (searchType: SearchType) => void;
  /** Tab bar slot (Traces/Observations use TracingTabs; Sessions passes none). */
  tabs?: ReactNode;
  /** Extra toolbar controls (columns menu, …). */
  toolbarExtra?: ReactNode;
  /** Left filter sidebar (Langfuse facet panel); a "Hide filters" toggle is shown when set. */
  filterSidebar?: ReactNode;
  /** Number of active filters, shown on the toggle. */
  activeFilterCount?: number;
  children: ReactNode;
  drawer?: ReactNode;
}

/**
 * Shared Tracing page layout (Langfuse): tabs → toolbar (Hide-filters + search +
 * tenant + range + extras) → [filter sidebar | full-width table] → pagination.
 * The page title lives in the top-nav header. Presentational; the page owns
 * tenant resolution and the query.
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
  searchType,
  onSearchType,
  tabs,
  toolbarExtra,
  filterSidebar,
  activeFilterCount = 0,
  children,
  drawer,
}: TracingShellProps) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const fetching =
    useIsFetching({ queryKey: ['traces'] }) +
    useIsFetching({ queryKey: ['observations'] }) +
    useIsFetching({ queryKey: ['sessions'] });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(null);
  const [internalSearchType, setInternalSearchType] = useState<SearchType>('metadata');
  const activeSearchType = searchType ?? internalSearchType;
  const handleSearchType = onSearchType ?? setInternalSearchType;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['traces'] });
    queryClient.invalidateQueries({ queryKey: ['observations'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {tabs}

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-(--cui-color-stroke-default) px-3 py-2">
        {filterSidebar ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-(--cui-color-stroke-default) px-2 text-sm text-(--cui-color-text-default) hover:bg-(--cui-color-background-muted)"
          >
            {filtersOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
            {filtersOpen
              ? localize('com_traces_hide_filters')
              : localize('com_traces_show_filters')}
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-(--cui-color-background-muted) px-1.5 text-xs">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <div className="flex min-w-65 flex-1 items-stretch">
          <div className="min-w-0 flex-1">
            <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
          </div>
          <SearchTypeSelect value={activeSearchType} onChange={handleSearchType} />
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
        <AutoRefreshControl
          onRefresh={refresh}
          fetching={fetching > 0}
          interval={refreshInterval}
          onInterval={setRefreshInterval}
        />
        {toolbarExtra}
      </div>

      {/* Body: filter sidebar (collapsible) + table */}
      <div className="flex min-h-0 flex-1">
        {filterSidebar && filtersOpen ? (
          <aside className="w-64 shrink-0 overflow-auto border-r border-(--cui-color-stroke-default)">
            {filterSidebar}
          </aside>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-(--cui-color-stroke-default) px-3 py-1.5">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPage} />
      </div>
      {drawer}
    </div>
  );
}
