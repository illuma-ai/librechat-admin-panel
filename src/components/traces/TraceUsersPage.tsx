import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { traceUsersQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { TraceFilterSidebar } from './TraceFilterSidebar';
import { ColumnsMenu } from './ColumnsMenu';
import { ViewsMenu } from './ViewsMenu';
import { useTracingTenant } from './useTracingTenant';
import { useColumnVisibility } from './useColumnVisibility';
import { EnvBadge } from './cells';
import { formatCost, formatTimestamp, formatTokens } from './format';

interface TraceUsersPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  filters: t.TraceFacetFilters;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onFilters: (patch: Partial<t.TraceFacetFilters>) => void;
  onApplyView: (state: Record<string, unknown>) => void;
  onOpenUser: (userId: string) => void;
}

/**
 * Users list (reference parity) — LLM end-users aggregated from their traces.
 * Mirrors the Sessions page shell: tenant + search + time range + an Environment
 * filter, server-side paginated. A user id opens the Traces tab filtered to that
 * user (reuses the existing trace user facet).
 */
export function TraceUsersPage({
  tenant,
  search,
  range,
  page,
  pageSize,
  filters,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onFilters,
  onApplyView,
  onOpenUser,
}: TraceUsersPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const query = useQuery(
    traceUsersQueryOptions({
      tenantId: effectiveTenant,
      search,
      range,
      page,
      pageSize,
      environment: filters.environment,
    }),
  );

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<t.TraceUserListItem>[] = [
    {
      id: 'userId',
      header: localize('com_users_col_id'),
      width: 320,
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenUser(r.userId);
          }}
          className="truncate font-mono text-xs text-(--ui-color-text-link) hover:underline"
          title={r.userId}
        >
          {r.userId}
        </button>
      ),
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 130,
      render: (r) => <EnvBadge value={r.environment} />,
    },
    {
      id: 'firstEvent',
      header: localize('com_users_first_event'),
      width: 180,
      render: (r) => formatTimestamp(r.firstEvent),
    },
    {
      id: 'lastEvent',
      header: localize('com_users_last_event'),
      width: 180,
      render: (r) => formatTimestamp(r.lastEvent),
    },
    {
      id: 'totalEvents',
      header: localize('com_users_total_events'),
      width: 120,
      render: (r) => formatTokens(r.totalEvents),
    },
    {
      id: 'totalTokens',
      header: localize('com_users_total_tokens'),
      width: 130,
      render: (r) => formatTokens(r.totalTokens),
    },
    {
      id: 'totalCost',
      header: localize('com_users_total_cost'),
      width: 120,
      render: (r) => formatCost(r.totalCost),
    },
  ];

  const columnVisibility = useColumnVisibility('trace-users', columns);

  return (
    <TracingShell
      tenant={effectiveTenant}
      tenants={tenants}
      onTenant={onTenant}
      search={search}
      onSearch={onSearch}
      range={range}
      onRange={onRange}
      page={page}
      totalPages={totalPages}
      onPage={onPage}
      searchPlaceholder={localize('com_users_search_placeholder')}
      filterSidebar={
        <TraceFilterSidebar
          tenant={effectiveTenant}
          filters={filters}
          onChange={onFilters}
          facets={['environment']}
        />
      }
      views={
        <ViewsMenu
          tableKey="trace-users"
          current={{ q: search, range, env: filters.environment }}
          onApply={onApplyView}
        />
      }
      toolbarExtra={
        <ColumnsMenu
          columns={columns}
          hidden={columnVisibility.hidden}
          onToggle={columnVisibility.toggle}
          visibleCount={columnVisibility.visibleCount}
          total={columnVisibility.total}
        />
      }
    >
      <DataTable
        columns={columns}
        hiddenColumnIds={columnVisibility.hidden}
        rows={query.data?.rows ?? []}
        rowKey={(r) => r.userId}
        loading={query.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
