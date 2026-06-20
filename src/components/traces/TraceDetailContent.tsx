import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { EmptyState, LoadingState } from '@/components/shared';
import { traceDetailQueryOptions } from '@/server';
import { TraceDetailPane } from './TraceDetailPane';
import { TraceSequence } from './TraceSequence';

interface TraceDetailContentProps {
  tenant: string;
  traceId: string;
}

/** Index observations by id so a selected row resolves to its node. */
function indexById(nodes: t.ObservationNode[], map = new Map<string, t.ObservationNode>()) {
  for (const node of nodes) {
    map.set(node.id, node);
    indexById(node.children, map);
  }
  return map;
}

/** Sum token/cost across the whole tree for the trace-level badges. */
function aggregateTotals(nodes: t.ObservationNode[], rootLatencyMs: number) {
  let totalCost = 0;
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const node of indexById(nodes).values()) {
    totalCost += node.totalCost;
    totalTokens += node.totalTokens;
    inputTokens += node.inputTokens;
    outputTokens += node.outputTokens;
  }
  return { latencyMs: rootLatencyMs, totalCost, totalTokens, inputTokens, outputTokens };
}

/** Langfuse trace detail: left observation tree + right detail pane (shared by drawer + page). */
export function TraceDetailContent({ tenant, traceId }: TraceDetailContentProps) {
  const localize = useLocalize();
  const { data, isLoading } = useQuery(traceDetailQueryOptions(tenant, traceId));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rootId = data?.observations[0]?.id ?? null;
  useEffect(() => {
    setSelectedId(rootId);
  }, [rootId]);

  const nodeById = useMemo(() => indexById(data?.observations ?? []), [data?.observations]);
  const totals = useMemo(
    () => aggregateTotals(data?.observations ?? [], data?.latencyMs ?? 0),
    [data?.observations, data?.latencyMs],
  );

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message={localize('com_traces_not_found_desc')} />;

  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null;
  const isRoot = !selectedNode || selectedNode.id === rootId;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="flex min-h-0 flex-col border-b border-(--cui-color-stroke-default) md:w-[44%] md:max-w-130 md:min-w-75 md:border-r md:border-b-0">
        <div className="flex shrink-0 items-center justify-between border-b border-(--cui-color-stroke-default) px-3 py-2 text-xs font-semibold tracking-wide text-(--cui-color-text-muted) uppercase">
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
        <TraceDetailPane
          trace={data.trace}
          totals={totals}
          node={selectedNode}
          isRoot={isRoot}
          graph={data.graph}
        />
      </div>
    </div>
  );
}
