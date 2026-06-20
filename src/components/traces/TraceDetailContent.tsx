import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@clickhouse/click-ui';
import { Brain, Calendar, Clock, Coins, Hash, Layers, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { EmptyState, LoadingState } from '@/components/shared';
import { traceDetailQueryOptions } from '@/server';
import { TraceNodeDetail } from './TraceNodeDetail';
import { TraceSequence } from './TraceSequence';
import { formatCost, formatLatency, formatTime, formatTokens } from './format';

interface TraceDetailContentProps {
  tenant: string;
  traceId: string;
}

function Metric({
  icon: Icon,
  value,
  title,
}: {
  icon: typeof Clock;
  value: string;
  title?: string;
}) {
  if (!value) return null;
  return (
    <span
      title={title}
      className="flex items-center gap-1.5 font-medium whitespace-nowrap"
      style={{ color: 'var(--trace-slate-muted)' }}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="text-(--cui-color-text-default)">{value}</span>
    </span>
  );
}

/** Index observations by id so a selected row can resolve to its node. */
function indexById(nodes: t.ObservationNode[], map = new Map<string, t.ObservationNode>()) {
  for (const node of nodes) {
    map.set(node.id, node);
    indexById(node.children, map);
  }
  return map;
}

/** Trace header + inline metrics + sequence/detail split. Shared by drawer and deep-link page. */
export function TraceDetailContent({ tenant, traceId }: TraceDetailContentProps) {
  const localize = useLocalize();
  const { data, isLoading } = useQuery(traceDetailQueryOptions(tenant, traceId));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rootId = data?.observations[0]?.id ?? null;
  // Default the selection to the root span (its output carries the full exchange).
  useEffect(() => {
    setSelectedId(rootId);
  }, [rootId]);

  const nodeById = useMemo(() => indexById(data?.observations ?? []), [data?.observations]);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message={localize('com_traces_not_found_desc')} />;

  const { trace } = data;
  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null;
  const isRootSelected = !selectedNode || selectedNode.id === rootId;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b border-(--cui-color-stroke-default) px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-(--cui-color-text-default)">
            {trace.name || trace.id}
          </h2>
          {trace.tags.map((tag) => (
            <Badge key={tag} text={tag} state="neutral" size="sm" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <Metric
            icon={Calendar}
            value={formatTime(trace.timestamp)}
            title={localize('com_traces_col_time')}
          />
          <Metric
            icon={Clock}
            value={formatLatency(data.latencyMs)}
            title={localize('com_traces_col_latency')}
          />
          <Metric
            icon={Hash}
            value={formatTokens(data.totalTokens)}
            title={localize('com_traces_col_tokens')}
          />
          <Metric
            icon={Coins}
            value={formatCost(data.totalCost)}
            title={localize('com_traces_col_cost')}
          />
          <Metric
            icon={Layers}
            value={formatTokens(data.observationCount)}
            title={localize('com_traces_metric_observations')}
          />
          <Metric icon={Brain} value={data.model} title={localize('com_traces_col_model')} />
          <Metric
            icon={MessageSquare}
            value={trace.sessionId}
            title={localize('com_traces_session')}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 flex-col border-b border-(--cui-color-stroke-default) md:w-[40%] md:max-w-115 md:min-w-70 md:border-r md:border-b-0">
          <div className="border-b border-(--cui-color-stroke-default) px-4 py-2 text-xs font-semibold tracking-wide text-(--cui-color-text-muted) uppercase">
            {localize('com_traces_sequence')}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <TraceSequence
              observations={data.observations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <TraceNodeDetail
            node={isRootSelected ? null : selectedNode}
            conversation={data.conversation}
            traceName={trace.name || trace.id}
          />
        </div>
      </div>
    </div>
  );
}
