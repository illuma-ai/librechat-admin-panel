import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { sessionsQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { TraceFilterSidebar } from './TraceFilterSidebar';
import { SessionDrawer } from './SessionDrawer';
import { ColumnsMenu } from './ColumnsMenu';
import { ViewsMenu } from './ViewsMenu';
import { useTracingTenant } from './useTracingTenant';
import { useColumnVisibility } from './useColumnVisibility';
import { EnvBadge } from './cells';
import { formatCost, formatLatency, formatTimestamp, formatTokens } from './format';

interface SessionsPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  selectedSessionId: string | null;
  filters: t.TraceFacetFilters;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onFilters: (patch: Partial<t.TraceFacetFilters>) => void;
  onApplyView: (state: Record<string, unknown>) => void;
  onOpenSession: (sessionId: string) => void;
  onCloseSession: () => void;
  onOpenTrace: (traceId: string) => void;
}

export function SessionsPage({
  tenant,
  search,
  range,
  page,
  pageSize,
  selectedSessionId,
  filters,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onFilters,
  onApplyView,
  onOpenSession,
  onCloseSession,
  onOpenTrace,
}: SessionsPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const query = useQuery(
    sessionsQueryOptions({
      tenantId: effectiveTenant,
      search,
      range,
      page,
      pageSize,
      environment: filters.environment,
      userId: filters.userId,
      tokensMin: filters.tokensMin,
      tokensMax: filters.tokensMax,
      costMin: filters.costMin,
      costMax: filters.costMax,
      durationMin: filters.durationMin,
      durationMax: filters.durationMax,
      traceCountMin: filters.traceCountMin,
      traceCountMax: filters.traceCountMax,
    }),
  );

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<t.SessionListItem>[] = [
    {
      id: 'id',
      header: localize('com_traces_col_session_id'),
      width: 300,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.id}>
          {r.id}
        </span>
      ),
    },
    {
      id: 'timestamp',
      header: localize('com_traces_col_time'),
      width: 160,
      render: (r) => formatTimestamp(r.timestamp),
    },
    {
      id: 'traces',
      header: localize('com_traces_col_traces'),
      width: 90,
      render: (r) => formatTokens(r.traceCount),
    },
    {
      id: 'users',
      header: localize('com_traces_col_users'),
      width: 90,
      render: (r) => formatTokens(r.userCount),
    },
    {
      id: 'duration',
      header: localize('com_traces_col_duration'),
      width: 110,
      render: (r) => formatLatency(r.durationMs),
    },
    {
      id: 'tokens',
      header: localize('com_traces_col_tokens'),
      width: 120,
      render: (r) => formatTokens(r.totalTokens),
    },
    {
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 110,
      render: (r) => formatCost(r.totalCost),
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 120,
      render: (r) => <EnvBadge value={r.environment} />,
    },
  ];

  const columnVisibility = useColumnVisibility('sessions', columns);

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
      searchPlaceholder={localize('com_traces_session_search_placeholder')}
      filterSidebar={
        <TraceFilterSidebar
          tenant={effectiveTenant}
          filters={filters}
          onChange={onFilters}
          facets={['environment', 'user', 'tracesCount', 'duration', 'tokens', 'cost']}
        />
      }
      views={
        <ViewsMenu
          tableKey="sessions"
          current={{ q: search, range, env: filters.environment, user: filters.userId }}
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
      drawer={
        <SessionDrawer
          tenant={effectiveTenant}
          sessionId={selectedSessionId}
          onClose={onCloseSession}
          onOpenTrace={onOpenTrace}
        />
      }
    >
      <DataTable
        columns={columns}
        hiddenColumnIds={columnVisibility.hidden}
        rows={query.data?.rows ?? []}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenSession(r.id)}
        selectedId={selectedSessionId}
        loading={query.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
