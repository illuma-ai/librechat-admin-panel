import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRightLeft, Brain, ChevronRight, Clock, Coins, Hash } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { formatCost, formatLatency, formatTokens, parseChDate } from './format';
import { TypeIcon } from './traceIcons';

interface FlatNode {
  node: t.ObservationNode;
  depth: number;
  hasChildren: boolean;
  isRoot: boolean;
}

function flatten(
  nodes: t.ObservationNode[],
  collapsed: Set<string>,
  depth = 0,
  out: FlatNode[] = [],
): FlatNode[] {
  for (const [i, node] of nodes.entries()) {
    const hasChildren = node.children.length > 0;
    out.push({ node, depth, hasChildren, isRoot: depth === 0 && i === 0 });
    if (hasChildren && !collapsed.has(node.id)) flatten(node.children, collapsed, depth + 1, out);
  }
  return out;
}

function startMs(node: t.ObservationNode): number {
  const ms = parseChDate(node.startTime).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Compute the waterfall extents (earliest start + longest duration) across all rows. */
function timelineExtents(rows: FlatNode[]): { minStart: number; maxDuration: number } {
  let minStart = Infinity;
  let maxDuration = 0;
  for (const { node } of rows) {
    const s = startMs(node);
    if (s > 0 && s < minStart) minStart = s;
    if (node.latencyMs > maxDuration) maxDuration = node.latencyMs;
  }
  return { minStart: Number.isFinite(minStart) ? minStart : 0, maxDuration };
}

interface TraceSequenceProps {
  observations: t.ObservationNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function MetricChip({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: 'var(--trace-slate-muted)' }}
    >
      <Icon className="size-3 shrink-0" /> {children}
    </span>
  );
}

/** Left pane: Opik-style span tree — colored type icons, per-row metric chips, duration bars. */
export function TraceSequence({ observations, selectedId, onSelect }: TraceSequenceProps) {
  const localize = useLocalize();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const rows = useMemo(() => flatten(observations, collapsed), [observations, collapsed]);
  const { minStart, maxDuration } = useMemo(() => timelineExtents(rows), [rows]);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-(--cui-color-text-muted)">
        {localize('com_traces_no_observations')}
      </div>
    );
  }

  return (
    <div role="tree" aria-label={localize('com_traces_sequence')} className="w-full px-3 py-1.5">
      {rows.map(({ node, depth, hasChildren, isRoot }) => {
        const isCollapsed = collapsed.has(node.id);
        const selected = node.id === selectedId;
        const widthPct = maxDuration > 0 ? Math.min((node.latencyMs / maxDuration) * 100, 100) : 0;
        const offsetPct =
          maxDuration > 0 ? Math.max(((startMs(node) - minStart) / maxDuration) * 100, 0) : 0;
        const promptTok = node.inputTokens;
        const completionTok = node.outputTokens;
        return (
          <div
            key={node.id}
            role="treeitem"
            aria-selected={selected}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            onClick={() => onSelect(node.id)}
            className={cn(
              'flex cursor-pointer flex-col gap-1.5 rounded-md px-1.5 py-2',
              'hover:bg-(--cui-color-background-muted)',
              selected ? 'bg-(--cui-color-background-muted)' : '',
            )}
          >
            <div className="flex" style={{ paddingLeft: depth * 12 }}>
              <div className="mr-1 flex h-5 w-4 shrink-0 items-center justify-center">
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={
                      isCollapsed ? localize('com_traces_expand') : localize('com_traces_collapse')
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(node.id);
                    }}
                    className="flex cursor-pointer items-center rounded-sm p-0.5 text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
                  >
                    <ChevronRight
                      className={cn(
                        'size-3.5 transition-transform',
                        isCollapsed ? '' : 'rotate-90',
                      )}
                    />
                  </button>
                ) : null}
              </div>
              <div className="flex min-w-1 flex-auto flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TypeIcon type={node.type} isRoot={isRoot} />
                  <span
                    title={node.name || '—'}
                    className={cn(
                      'truncate text-[13px] text-(--cui-color-text-default)',
                      selected ? 'font-semibold' : '',
                    )}
                  >
                    {node.name || '—'}
                  </span>
                </div>
                <div className="flex h-5 items-center gap-3 overflow-hidden">
                  <MetricChip icon={Clock}>{formatLatency(node.latencyMs)}</MetricChip>
                  {node.totalTokens > 0 ? (
                    <MetricChip icon={Hash}>{formatTokens(node.totalTokens)}</MetricChip>
                  ) : null}
                  {promptTok > 0 && completionTok > 0 ? (
                    <MetricChip icon={ArrowRightLeft}>
                      {formatTokens(promptTok)}/{formatTokens(completionTok)}
                    </MetricChip>
                  ) : null}
                  {node.totalCost > 0 ? (
                    <MetricChip icon={Coins}>{formatCost(node.totalCost)}</MetricChip>
                  ) : null}
                  {node.model ? (
                    <MetricChip icon={Brain}>
                      <span className="max-w-45 truncate">{node.model}</span>
                    </MetricChip>
                  ) : null}
                </div>
              </div>
            </div>
            {maxDuration > 0 && node.latencyMs > 0 ? (
              <div className="w-full pt-1.5 pb-1 pl-4">
                <div className="relative w-full">
                  <div className="absolute inset-x-0 top-px h-px bg-(--cui-color-stroke-default)" />
                  <div
                    className="absolute top-0 h-0.5 rounded-full transition-[width,left] duration-500"
                    style={{
                      background: 'var(--cui-color-text-link, #6366f1)',
                      width: `${widthPct}%`,
                      left: `${offsetPct}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
