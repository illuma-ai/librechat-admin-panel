import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import { Download, FoldVertical, Network, UnfoldVertical } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { EmptyState, LoadingState } from '@/components/shared';
import { traceDetailQueryOptions } from '@/server';
import { TraceDetailPane } from './TraceDetailPane';
import { TraceGraph } from './TraceGraph';
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

/** Trigger a client-side download of the trace detail data as `trace-<id>.json`. */
function downloadTraceJson(traceId: string, data: t.TraceDetail) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trace-${traceId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Langfuse trace detail: left observation tree + right detail pane (shared by drawer + page). */
export function TraceDetailContent({ tenant, traceId }: TraceDetailContentProps) {
  const localize = useLocalize();
  const { data, isLoading } = useQuery(traceDetailQueryOptions(tenant, traceId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [timeline, setTimeline] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);

  const rootId = data?.observations[0]?.id ?? null;
  useEffect(() => {
    setSelectedId(rootId);
  }, [rootId]);

  const nodeById = useMemo(() => indexById(data?.observations ?? []), [data?.observations]);
  const totals = useMemo(
    () => aggregateTotals(data?.observations ?? [], data?.latencyMs ?? 0),
    [data?.observations, data?.latencyMs],
  );

  const handleDownload = useCallback(() => {
    if (data) downloadTraceJson(traceId, data);
  }, [data, traceId]);

  // v4 layout persistence: remember the drawer split width across opens (client-only storage).
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'trace-detail-layout',
    panelIds: ['trace-nav', 'trace-detail'],
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  });

  // Programmatic collapse of the nav panel (Langfuse's header panel-toggle). The
  // toggle lives in the right detail pane so it stays reachable when collapsed.
  const navPanelRef = usePanelRef();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const toggleNav = useCallback(() => {
    const panel = navPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, [navPanelRef]);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message={localize('com_traces_not_found_desc')} />;

  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null;
  const isRoot = !selectedNode || selectedNode.id === rootId;
  const graphAvailable = data.graph.nodes.length > 0;

  return (
    <Group
      orientation="horizontal"
      id="trace-detail-layout"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className="h-full min-h-0 w-full"
    >
      {/* Left navigation panel — draggable + collapsible, mirroring Langfuse TraceLayoutDesktop. */}
      <Panel
        id="trace-nav"
        panelRef={navPanelRef}
        collapsible
        collapsedSize="0px"
        minSize="260px"
        defaultSize="450px"
        onResize={() => setNavCollapsed(navPanelRef.current?.isCollapsed() ?? false)}
        className="flex min-h-0 flex-col overflow-hidden"
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-(--cui-color-stroke-default) px-2 py-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={localize('com_traces_search')}
            className="h-7 min-w-0 flex-1 bg-transparent px-1 text-xs text-(--cui-color-text-default) outline-none placeholder:text-(--cui-color-text-muted)"
            aria-label={localize('com_traces_search')}
          />
          <button
            type="button"
            onClick={() => setExpandSignal((n) => n + 1)}
            title={localize('com_traces_expand_all')}
            aria-label={localize('com_traces_expand_all')}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
          >
            <UnfoldVertical className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapseSignal((n) => n + 1)}
            title={localize('com_traces_collapse_all')}
            aria-label={localize('com_traces_collapse_all')}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
          >
            <FoldVertical className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title={localize('com_traces_download_json')}
            aria-label={localize('com_traces_download_json')}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
          >
            <Download className="size-3.5" />
          </button>
          {graphAvailable ? (
            <button
              type="button"
              onClick={() => setShowGraph((v) => !v)}
              title={localize('com_traces_tab_graph')}
              aria-label={localize('com_traces_tab_graph')}
              aria-pressed={showGraph}
              className={cn(
                'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm',
                showGraph
                  ? 'bg-(--cui-color-background-muted) text-(--cui-color-text-default)'
                  : 'text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)',
              )}
            >
              <Network className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTimeline((v) => !v)}
            className={cn(
              'flex h-7 shrink-0 cursor-pointer items-center rounded-sm px-2 text-xs',
              timeline
                ? 'bg-(--cui-color-background-muted) text-(--cui-color-text-default)'
                : 'text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)',
            )}
          >
            {localize('com_traces_timeline')}
          </button>
        </div>
        {/* Langfuse renders the agent graph as toggleable secondary content above the
            observation tree in the left navigation panel (not as a right-pane tab). */}
        {showGraph && graphAvailable ? (
          <div className="h-2/5 min-h-0 shrink-0 overflow-hidden border-b border-(--cui-color-stroke-default)">
            <TraceGraph graph={data.graph} />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto">
          <TraceSequence
            observations={data.observations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            timeline={timeline}
            collapseAllSignal={collapseSignal}
            expandAllSignal={expandSignal}
          />
        </div>
      </Panel>
      {/* Draggable resize handle (double-click to collapse), mirroring Langfuse. A wide
          transparent `after` overlay makes the 1px divider easy to grab. */}
      <Separator className="relative z-10 w-px shrink-0 cursor-col-resize touch-none bg-(--cui-color-stroke-default) transition-colors select-none after:absolute after:inset-y-0 after:-left-1.5 after:z-10 after:w-4 after:content-[''] hover:bg-(--cui-color-primary-default) data-resize-handle-active:bg-(--cui-color-primary-default)" />
      <Panel id="trace-detail" minSize="40%" defaultSize="60%" className="flex min-h-0 flex-col">
        <TraceDetailPane
          trace={data.trace}
          totals={totals}
          node={selectedNode}
          isRoot={isRoot}
          observations={data.observations}
          navCollapsed={navCollapsed}
          onToggleNav={toggleNav}
        />
      </Panel>
    </Group>
  );
}
