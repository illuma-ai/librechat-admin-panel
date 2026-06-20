import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TUser } from 'librechat-data-provider';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { tracesQueryOptions, usersQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { TracingTabs } from './TracingTabs';
import { TraceFilterSidebar } from './TraceFilterSidebar';
import { TraceDrawer } from './TraceDrawer';
import { UserCell } from './UserCell';
import { useTracingTenant } from './useTracingTenant';
import { EnvBadge, ModelCell, TokenBadge } from './cells';
import { formatCost, formatLatency, formatTime, formatTokens } from './format';

interface TracesPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  filters: t.TraceFacetFilters;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onOpenTrace: (traceId: string) => void;
  onCloseTrace: () => void;
  onFilters: (patch: Partial<t.TraceFacetFilters>) => void;
}

export function TracesPage({
  tenant,
  search,
  range,
  page,
  pageSize,
  selectedTraceId,
  filters,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onOpenTrace,
  onCloseTrace,
  onFilters,
}: TracesPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const tracesQuery = useQuery(
    tracesQueryOptions({
      tenantId: effectiveTenant,
      search,
      range,
      page,
      pageSize,
      environment: filters.environment,
      name: filters.name,
      userId: filters.userId,
      tags: filters.tags,
    }),
  );
  const usersQuery = useQuery(usersQueryOptions);

  const userMap = useMemo(() => {
    const map = new Map<string, TUser>();
    for (const user of usersQuery.data ?? []) map.set(user.id, user);
    return map;
  }, [usersQuery.data]);

  const total = tracesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<t.TraceListItem>[] = [
    {
      id: 'timestamp',
      header: localize('com_traces_col_time'),
      width: 160,
      render: (r) => formatTime(r.timestamp),
    },
    {
      id: 'name',
      header: localize('com_traces_col_name'),
      width: 180,
      render: (r) => r.name || '—',
    },
    {
      id: 'user',
      header: localize('com_traces_col_user'),
      width: 210,
      render: (r) => <UserCell user={userMap.get(r.userId)} fallback={r.userId} />,
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 120,
      render: (r) => <EnvBadge value={r.environment} />,
    },
    {
      id: 'latency',
      header: localize('com_traces_col_latency'),
      width: 90,
      render: (r) => formatLatency(r.latencyMs),
    },
    {
      id: 'tokens',
      header: localize('com_traces_col_tokens'),
      width: 180,
      render: (r) => <TokenBadge input={r.inputTokens} output={r.outputTokens} total={r.tokens} />,
    },
    {
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 110,
      render: (r) => formatCost(r.cost),
    },
    {
      id: 'model',
      header: localize('com_traces_col_model'),
      width: 200,
      render: (r) => <ModelCell model={r.model} />,
    },
    {
      id: 'obs',
      header: localize('com_traces_metric_observations'),
      width: 110,
      render: (r) => formatTokens(r.observations),
    },
  ];

  return (
    <TracingShell
      tabs={<TracingTabs active="traces" />}
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
      searchPlaceholder={localize('com_traces_search_placeholder')}
      activeFilterCount={
        filters.environment.length +
        filters.name.length +
        filters.userId.length +
        filters.tags.length
      }
      filterSidebar={
        <TraceFilterSidebar tenant={effectiveTenant} filters={filters} onChange={onFilters} />
      }
      drawer={
        <TraceDrawer tenant={effectiveTenant} traceId={selectedTraceId} onClose={onCloseTrace} />
      }
    >
      <DataTable
        columns={columns}
        rows={tracesQuery.data?.rows ?? []}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenTrace(r.id)}
        selectedId={selectedTraceId}
        loading={tracesQuery.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
