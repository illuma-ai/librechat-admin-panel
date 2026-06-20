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
} from './cells';
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

  // Langfuse column order + default visibility (defaultHidden columns appear in
  // the Columns menu but are hidden until enabled).
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
      width: 160,
      render: (r) => r.name || '—',
    },
    {
      id: 'input',
      header: localize('com_traces_input'),
      width: 240,
      render: (r) => <IOPreviewCell raw={r.input} variant="input" />,
    },
    {
      id: 'output',
      header: localize('com_traces_output'),
      width: 240,
      render: (r) => <IOPreviewCell raw={r.output} variant="output" />,
    },
    {
      id: 'levels',
      header: localize('com_traces_col_levels'),
      width: 120,
      render: (r) => <LevelCountsCell errors={r.errors} warnings={r.warnings} />,
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
      width: 170,
      render: (r) => <TokenBadge input={r.inputTokens} output={r.outputTokens} total={r.tokens} />,
    },
    {
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 110,
      render: (r) => formatCost(r.cost),
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 110,
      render: (r) => <EnvBadge value={r.environment} />,
    },
    {
      id: 'tags',
      header: localize('com_traces_tags'),
      width: 130,
      render: (r) => <TagsCell tags={r.tags} />,
    },
    {
      id: 'metadata',
      header: localize('com_traces_metadata'),
      width: 110,
      render: (r) => <MetadataCell metadata={r.metadata} />,
    },
    {
      id: 'user',
      header: localize('com_traces_col_user'),
      width: 200,
      defaultHidden: true,
      render: (r) => <UserCell user={userMap.get(r.userId)} fallback={r.userId} />,
    },
    {
      id: 'session',
      header: localize('com_traces_session'),
      width: 160,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.sessionId}>
          {r.sessionId || '—'}
        </span>
      ),
    },
    {
      id: 'model',
      header: localize('com_traces_col_model'),
      width: 200,
      defaultHidden: true,
      render: (r) => <ModelCell model={r.model} />,
    },
    {
      id: 'obs',
      header: localize('com_traces_metric_observations'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatTokens(r.observations),
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
      width: 120,
      defaultHidden: true,
      render: (r) => formatTokens(r.outputTokens),
    },
    {
      id: 'inputCost',
      header: localize('com_traces_col_input_cost'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatCost(r.inputCost),
    },
    {
      id: 'outputCost',
      header: localize('com_traces_col_output_cost'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatCost(r.outputCost),
    },
    {
      id: 'release',
      header: localize('com_traces_col_release'),
      width: 110,
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
      width: 110,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.id}>
          {r.id.slice(0, 8)}
        </span>
      ),
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
        <TraceDrawer tenant={effectiveTenant} traceId={selectedTraceId} onClose={onCloseTrace} />
      }
    >
      <DataTable
        columns={columns}
        hiddenColumnIds={columnVisibility.hidden}
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
