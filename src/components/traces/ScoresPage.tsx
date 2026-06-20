import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { scoresListQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { ColumnsMenu } from './ColumnsMenu';
import { useTracingTenant } from './useTracingTenant';
import { useColumnVisibility } from './useColumnVisibility';
import { EnvBadge } from './cells';
import { formatTimestamp, scoreDisplayValue } from './format';

interface ScoresPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onOpenTrace: (traceId: string) => void;
}

const monoCell = (value: string, title?: string) => (
  <span className="truncate font-mono text-xs" title={title ?? value}>
    {value || '—'}
  </span>
);

/**
 * Scores list (reference parity) — a flat table of every feedback/eval score, each
 * joined to its trace for the trace name / session / user columns. Server-side
 * paginated; a trace id opens that trace.
 */
export function ScoresPage({
  tenant,
  search,
  range,
  page,
  pageSize,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onOpenTrace,
}: ScoresPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const query = useQuery(
    scoresListQueryOptions({ tenantId: effectiveTenant, search, range, page, pageSize }),
  );

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<t.ScoreListItem>[] = [
    {
      id: 'timestamp',
      header: localize('com_traces_col_time'),
      width: 170,
      render: (r) => formatTimestamp(r.timestamp),
    },
    {
      id: 'name',
      header: localize('com_traces_scores_name'),
      width: 160,
      render: (r) => (
        <span className="truncate font-medium text-(--ui-color-text-default)" title={r.name}>
          {r.name}
        </span>
      ),
    },
    {
      id: 'value',
      header: localize('com_traces_scores_value'),
      width: 110,
      render: (r) => scoreDisplayValue(r),
    },
    {
      id: 'dataType',
      header: localize('com_scores_col_data_type'),
      width: 120,
      render: (r) => (
        <span className="rounded-sm bg-(--ui-color-background-muted) px-1 text-xs">
          {r.dataType || '—'}
        </span>
      ),
    },
    {
      id: 'source',
      header: localize('com_traces_scores_source'),
      width: 120,
      render: (r) => r.source || '—',
    },
    {
      id: 'comment',
      header: localize('com_traces_scores_comment'),
      width: 240,
      render: (r) => (
        <span className="truncate text-(--ui-color-text-muted)" title={r.comment ?? ''}>
          {r.comment || '—'}
        </span>
      ),
    },
    {
      id: 'trace',
      header: localize('com_scores_col_trace'),
      width: 130,
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTrace(r.traceId);
          }}
          className="truncate font-mono text-xs text-(--ui-color-text-link) hover:underline"
          title={r.traceId}
        >
          {r.traceId.slice(0, 8) || '—'}
        </button>
      ),
    },
    {
      id: 'traceName',
      header: localize('com_scores_col_trace_name'),
      width: 160,
      render: (r) => monoCell(r.traceName),
    },
    {
      id: 'observation',
      header: localize('com_scores_col_observation'),
      width: 120,
      defaultHidden: true,
      render: (r) => monoCell(r.observationId ? r.observationId.slice(0, 8) : '', r.observationId),
    },
    {
      id: 'session',
      header: localize('com_traces_session'),
      width: 150,
      defaultHidden: true,
      render: (r) => monoCell(r.sessionId),
    },
    {
      id: 'user',
      header: localize('com_traces_col_user'),
      width: 150,
      defaultHidden: true,
      render: (r) => monoCell(r.userId),
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 120,
      defaultHidden: true,
      render: (r) => <EnvBadge value={r.environment} />,
    },
  ];

  const columnVisibility = useColumnVisibility('scores', columns);

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
      searchPlaceholder={localize('com_scores_search_placeholder')}
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
        rowKey={(r) => r.id}
        loading={query.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
