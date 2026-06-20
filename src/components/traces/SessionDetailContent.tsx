import { useQuery } from '@tanstack/react-query';
import { Coins, Hash, Clock, ListTree, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { EmptyState, LoadingState } from '@/components/shared';
import { sessionDetailQueryOptions } from '@/server/sessionDetail';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { EnvBadge, IOPreviewCell, TokenBadge } from './cells';
import { formatCost, formatLatency, formatTimestamp, formatTokens } from './format';

interface SessionDetailContentProps {
  tenant: string;
  sessionId: string;
  /** Open one of the session's traces (drawer routes to /traces; page can deep-link). */
  onOpenTrace?: (traceId: string) => void;
}

interface MetricProps {
  icon: ReactNode;
  label: string;
  value: string;
}

/** A single labelled metric tile in the session header (reference session stats). */
function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-(--cui-color-stroke-default) px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-(--cui-color-text-muted)">
        {icon}
        {label}
      </span>
      <span className="font-mono text-sm text-(--cui-color-text-default)">{value}</span>
    </div>
  );
}

/** reference session detail: metrics header + the session's traces list (shared by drawer + page). */
export function SessionDetailContent({
  tenant,
  sessionId,
  onOpenTrace,
}: SessionDetailContentProps) {
  const localize = useLocalize();
  const { data, isLoading } = useQuery(sessionDetailQueryOptions(tenant, sessionId));

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message={localize('com_traces_not_found_desc')} />;

  const iconClass = 'size-3.5';
  const columns: DataTableColumn<t.TraceListItem>[] = [
    {
      id: 'timestamp',
      header: localize('com_traces_col_timestamp'),
      width: 160,
      render: (r) => formatTimestamp(r.timestamp),
    },
    {
      id: 'name',
      header: localize('com_traces_col_name'),
      width: 150,
      render: (r) => r.name || '—',
    },
    {
      id: 'input',
      header: localize('com_traces_input'),
      width: 220,
      render: (r) => <IOPreviewCell raw={r.input} variant="input" />,
    },
    {
      id: 'output',
      header: localize('com_traces_output'),
      width: 220,
      render: (r) => <IOPreviewCell raw={r.output} variant="output" />,
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
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-(--cui-color-stroke-default) p-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          icon={<Coins className={iconClass} />}
          label={localize('com_traces_metric_cost')}
          value={formatCost(data.totalCost)}
        />
        <Metric
          icon={<Hash className={iconClass} />}
          label={localize('com_traces_col_tokens')}
          value={formatTokens(data.totalTokens)}
        />
        <Metric
          icon={<ListTree className={iconClass} />}
          label={localize('com_traces_col_traces')}
          value={formatTokens(data.traceCount)}
        />
        <Metric
          icon={<Clock className={iconClass} />}
          label={localize('com_traces_col_duration')}
          value={formatLatency(data.durationMs)}
        />
        <Metric
          icon={<Users className={iconClass} />}
          label={localize('com_traces_col_users')}
          value={data.users.length > 0 ? data.users.join(', ') : '—'}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <DataTable
          columns={columns}
          rows={data.traces}
          rowKey={(r) => r.id}
          onRowClick={onOpenTrace ? (r) => onOpenTrace(r.id) : undefined}
          emptyMessage={localize('com_traces_none')}
        />
      </div>
    </div>
  );
}
