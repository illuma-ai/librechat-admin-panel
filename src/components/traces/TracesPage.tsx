import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TUser } from 'librechat-data-provider';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { tracesQueryOptions, usersQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn, OrderBy } from './DataTable';
import { TracingShell } from './TracingShell';
import { TracingTabs } from './TracingTabs';
import { TraceFilterSidebar } from './TraceFilterSidebar';
import { TraceDrawer } from './TraceDrawer';
import { ColumnsMenu } from './ColumnsMenu';
import { UserCell } from './UserCell';
import { useTracingTenant } from './useTracingTenant';
import { useColumnVisibility } from './useColumnVisibility';
import {
  EnvBadge,
  IOPreviewCell,
  LevelCountsCell,
  MetadataCell,
  ModelCell,
  TagsCell,
  TokenBadge,
  TypeCell,
} from './cells';
import { formatCost, formatLatency, formatTimestamp, formatTokens } from './format';

interface TracesPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  filters: t.TraceFacetFilters;
  orderBy: OrderBy | null;
  searchType: t.TraceSearchType;
  onSort: (key: string) => void;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onSearchType: (searchType: t.TraceSearchType) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
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
  orderBy,
  searchType,
  onSort,
  onTenant,
  onSearch,
  onSearchType,
  onRange,
  onPage,
  onPageSize,
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
      type: filters.type,
      level: filters.level,
      tags: filters.tags,
      latencyMin: filters.latencyMin,
      latencyMax: filters.latencyMax,
      costMin: filters.costMin,
      costMax: filters.costMax,
      tokensMin: filters.tokensMin,
      tokensMax: filters.tokensMax,
      searchType,
      orderBy: orderBy ? { column: orderBy.id, dir: orderBy.dir } : undefined,
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

  // Prev/next trace navigation (K/J) across the current page's rows.
  const rows = tracesQuery.data?.rows ?? [];
  const selectedIndex = selectedTraceId ? rows.findIndex((r) => r.id === selectedTraceId) : -1;
  const prevTrace = selectedIndex > 0 ? rows[selectedIndex - 1] : undefined;
  const nextTrace =
    selectedIndex >= 0 && selectedIndex < rows.length - 1 ? rows[selectedIndex + 1] : undefined;

  // the reference UI column order + default visibility (defaultHidden columns appear in
  // the Columns menu but are hidden until enabled).
  const columns: DataTableColumn<t.TraceListItem>[] = [
    {
      id: 'timestamp',
      header: localize('com_traces_col_timestamp'),
      width: 150,
      sortable: true,
      render: (r) => formatTimestamp(r.timestamp),
    },
    {
      id: 'type',
      header: localize('com_traces_col_type'),
      width: 110,
      render: (r) => <TypeCell type={r.type} />,
    },
    {
      id: 'name',
      header: localize('com_traces_col_name'),
      width: 150,
      sortable: true,
      render: (r) => r.name || '—',
    },
    {
      id: 'input',
      header: localize('com_traces_input'),
      width: 400,
      render: (r) => <IOPreviewCell raw={r.input} variant="input" />,
    },
    {
      id: 'output',
      header: localize('com_traces_output'),
      width: 400,
      render: (r) => <IOPreviewCell raw={r.output} variant="output" />,
    },
    {
      id: 'levels',
      header: localize('com_traces_col_levels'),
      width: 150,
      render: (r) => <LevelCountsCell errors={r.errors} warnings={r.warnings} />,
    },
    {
      id: 'latency',
      header: localize('com_traces_col_latency'),
      width: 100,
      sortable: true,
      render: (r) => formatLatency(r.latencyMs),
    },
    {
      id: 'tokens',
      header: localize('com_traces_col_tokens'),
      width: 180,
      sortable: true,
      render: (r) => <TokenBadge input={r.inputTokens} output={r.outputTokens} total={r.tokens} />,
    },
    {
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 130,
      sortable: true,
      render: (r) => formatCost(r.cost),
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 150,
      render: (r) => <EnvBadge value={r.environment} />,
    },
    {
      id: 'tags',
      header: localize('com_traces_tags'),
      width: 150,
      render: (r) => <TagsCell tags={r.tags} />,
    },
    {
      id: 'metadata',
      header: localize('com_traces_metadata'),
      width: 400,
      render: (r) => <MetadataCell metadata={r.metadata} />,
    },
    {
      id: 'session',
      header: localize('com_traces_session'),
      width: 150,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.sessionId}>
          {r.sessionId || '—'}
        </span>
      ),
    },
    {
      id: 'user',
      header: localize('com_traces_col_user'),
      width: 150,
      defaultHidden: true,
      render: (r) => <UserCell user={userMap.get(r.userId)} fallback={r.userId} />,
    },
    {
      id: 'model',
      header: localize('com_traces_col_model'),
      width: 150,
      defaultHidden: true,
      render: (r) => <ModelCell model={r.model} />,
    },
    {
      id: 'obs',
      header: localize('com_traces_metric_observations'),
      width: 120,
      defaultHidden: true,
      render: (r) => formatTokens(r.observations),
    },
    {
      id: 'release',
      header: localize('com_traces_col_release'),
      width: 100,
      defaultHidden: true,
      render: (r) => r.release || '—',
    },
    {
      id: 'version',
      header: localize('com_traces_col_version'),
      width: 100,
      defaultHidden: true,
      render: (r) => r.version || '—',
    },
    {
      id: 'id',
      header: localize('com_traces_col_trace_id'),
      width: 90,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.id}>
          {r.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'inputCost',
      header: localize('com_traces_col_input_cost'),
      width: 100,
      defaultHidden: true,
      render: (r) => formatCost(r.inputCost),
    },
    {
      id: 'outputCost',
      header: localize('com_traces_col_output_cost'),
      width: 100,
      defaultHidden: true,
      render: (r) => formatCost(r.outputCost),
    },
    {
      id: 'inputTokens',
      header: localize('com_traces_col_input_tokens'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatTokens(r.inputTokens),
    },
    {
      id: 'outputTokens',
      header: localize('com_traces_col_output_tokens'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatTokens(r.outputTokens),
    },
  ];

  const columnVisibility = useColumnVisibility('traces', columns);

  return (
    <TracingShell
      tabs={<TracingTabs active="traces" />}
      tenant={effectiveTenant}
      tenants={tenants}
      onTenant={onTenant}
      search={search}
      onSearch={onSearch}
      searchType={searchType}
      onSearchType={onSearchType}
      range={range}
      onRange={onRange}
      page={page}
      totalPages={totalPages}
      onPage={onPage}
      pageSize={pageSize}
      onPageSize={onPageSize}
      searchPlaceholder={localize('com_traces_search_placeholder')}
      activeFilterCount={
        filters.environment.length +
        filters.name.length +
        filters.userId.length +
        filters.type.length +
        filters.level.length +
        filters.tags.length +
        (filters.latencyMin !== undefined || filters.latencyMax !== undefined ? 1 : 0) +
        (filters.costMin !== undefined || filters.costMax !== undefined ? 1 : 0) +
        (filters.tokensMin !== undefined || filters.tokensMax !== undefined ? 1 : 0)
      }
      filterSidebar={
        <TraceFilterSidebar tenant={effectiveTenant} filters={filters} onChange={onFilters} />
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
        <TraceDrawer
          tenant={effectiveTenant}
          traceId={selectedTraceId}
          onClose={onCloseTrace}
          onPrev={prevTrace ? () => onOpenTrace(prevTrace.id) : undefined}
          onNext={nextTrace ? () => onOpenTrace(nextTrace.id) : undefined}
        />
      }
    >
      <DataTable
        columns={columns}
        hiddenColumnIds={columnVisibility.hidden}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenTrace(r.id)}
        selectedId={selectedTraceId}
        loading={tracesQuery.isLoading}
        emptyMessage={localize('com_traces_none')}
        orderBy={orderBy}
        onSort={onSort}
      />
    </TracingShell>
  );
}
