import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { formatLatency, formatTokenCounts, usdFormatter } from './format';
import { TypeIcon, typeVisual } from './traceIcons';

/** Parse a CH (`YYYY-MM-DD HH:MM:SS.mmm`) or ISO timestamp to epoch ms (NaN if absent). */
function epochMs(value: string): number {
  if (!value) return NaN;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const zoned = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return Date.parse(zoned);
}

interface TimeBounds {
  start: number;
  span: number;
}

/** Trace time window (earliest start → latest end) for timeline bar positioning. */
function computeBounds(nodes: t.ObservationNode[]): TimeBounds {
  let start = Infinity;
  let end = -Infinity;
  const walk = (ns: t.ObservationNode[]) => {
    for (const n of ns) {
      const s = epochMs(n.startTime);
      const e = epochMs(n.endTime) || s;
      if (!Number.isNaN(s)) start = Math.min(start, s);
      if (!Number.isNaN(e)) end = Math.max(end, e);
      walk(n.children);
    }
  };
  walk(nodes);
  if (!Number.isFinite(start)) return { start: 0, span: 0 };
  return { start, span: Math.max(0, end - start) };
}

const clampPct = (n: number) => Math.min(100, Math.max(0, n));

interface FlatNode {
  node: t.ObservationNode;
  depth: number;
  hasChildren: boolean;
  isRoot: boolean;
  isLast: boolean;
  /** For each ancestor column, whether that ancestor has a following sibling (draw guide line). */
  ancestorLines: boolean[];
}

function flatten(
  nodes: t.ObservationNode[],
  collapsed: Set<string>,
  depth = 0,
  ancestorLines: boolean[] = [],
  out: FlatNode[] = [],
): FlatNode[] {
  nodes.forEach((node, i) => {
    const hasChildren = node.children.length > 0;
    const isLast = i === nodes.length - 1;
    out.push({ node, depth, hasChildren, isRoot: depth === 0 && i === 0, isLast, ancestorLines });
    if (hasChildren && !collapsed.has(node.id)) {
      flatten(node.children, collapsed, depth + 1, [...ancestorLines, !isLast], out);
    }
  });
  return out;
}

/** Collect every node id in the tree (used to collapse/expand all at once). */
function collectIds(nodes: t.ObservationNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    out.push(node.id);
    collectIds(node.children, out);
  }
  return out;
}

/**
 * Keep a node if its name matches the filter, or if any descendant matches —
 * so ancestors of a hit stay visible (mirrors the reference tree search).
 */
function matchesFilter(node: t.ObservationNode, needle: string): boolean {
  if (!needle) return true;
  const name = (node.name || node.type).toLowerCase();
  if (name.includes(needle)) return true;
  return node.children.some((child) => matchesFilter(child, needle));
}

function filterTree(nodes: t.ObservationNode[], needle: string): t.ObservationNode[] {
  if (!needle) return nodes;
  return nodes
    .filter((node) => matchesFilter(node, needle))
    .map((node) => ({ ...node, children: filterTree(node.children, needle) }));
}

interface TraceSequenceProps {
  observations: t.ObservationNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Monotonically-increasing signals from the toolbar to collapse/expand the whole tree. */
  collapseAllSignal?: number;
  expandAllSignal?: number;
  /** Case-insensitive name filter; non-matching branches are hidden. */
  filter?: string;
  /** Timeline (waterfall) mode — render a duration bar lane per node (the reference `view=timeline`). */
  timeline?: boolean;
}

/** A single waterfall bar: positioned by start offset, sized by duration, colored by type. */
function TimelineBar({ node, bounds }: { node: t.ObservationNode; bounds: TimeBounds }) {
  const start = epochMs(node.startTime);
  const span = bounds.span;
  const offsetPct = span > 0 && !Number.isNaN(start) ? clampPct(((start - bounds.start) / span) * 100) : 0;
  const durMs = node.latencyMs > 0 ? node.latencyMs : 0;
  const widthPct = span > 0 ? Math.max(1.5, clampPct((durMs / span) * 100)) : 100;
  const color = typeVisual(node.type).color;
  return (
    <div className="relative mt-1 h-3.5 w-full overflow-hidden rounded-sm bg-(--cui-color-background-muted)">
      <div
        className="absolute top-0 bottom-0 rounded-sm opacity-80"
        style={{ left: `${offsetPct}%`, width: `${Math.min(widthPct, 100 - offsetPct)}%`, backgroundColor: color }}
      />
      {node.latencyMs > 0 ? (
        <span
          className="absolute top-1/2 -translate-y-1/2 px-1 text-[10px] text-(--cui-color-text-muted)"
          style={{ left: `${Math.min(offsetPct, 80)}%` }}
        >
          {formatLatency(node.latencyMs)}
        </span>
      ) : null}
    </div>
  );
}

/** reference observation tree — connector lines, colored type icons, per-node metrics. */
export function TraceSequence({
  observations,
  selectedId,
  onSelect,
  collapseAllSignal = 0,
  expandAllSignal = 0,
  filter = '',
  timeline = false,
}: TraceSequenceProps) {
  const localize = useLocalize();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const bounds = useMemo(() => computeBounds(observations), [observations]);

  useEffect(() => {
    if (collapseAllSignal > 0) setCollapsed(new Set(collectIds(observations)));
  }, [collapseAllSignal, observations]);

  useEffect(() => {
    if (expandAllSignal > 0) setCollapsed(new Set());
  }, [expandAllSignal]);

  const needle = filter.trim().toLowerCase();
  const visible = useMemo(() => filterTree(observations, needle), [observations, needle]);
  const rows = useMemo(() => flatten(visible, collapsed), [visible, collapsed]);

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
    <div role="tree" aria-label={localize('com_traces_sequence')} className="flex flex-col py-1">
      {rows.map(({ node, depth, hasChildren, isRoot, isLast, ancestorLines }) => {
        const isCollapsed = collapsed.has(node.id);
        const selected = node.id === selectedId;
        const tokenText = formatTokenCounts(node.inputTokens, node.outputTokens, node.totalTokens);
        const showCostPrefix = isRoot || hasChildren;
        const showMetrics = node.latencyMs > 0 || tokenText || node.totalCost > 0;
        return (
          <div
            key={node.id}
            role="treeitem"
            aria-selected={selected}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            onClick={() => onSelect(node.id)}
            className={cn(
              'relative flex w-full cursor-pointer pr-1 pl-2',
              selected
                ? 'bg-(--cui-color-background-muted)'
                : 'hover:bg-(--cui-color-background-hover)',
            )}
          >
            {/* ancestor indent guides */}
            {depth > 0 ? (
              <div className="flex shrink-0">
                {Array.from({ length: depth - 1 }, (_, i) => (
                  <div key={i} className="relative w-5">
                    {ancestorLines[i] ? (
                      <div className="absolute top-0 bottom-0 left-3 w-px bg-(--cui-color-stroke-default)" />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {/* immediate connector (elbow) */}
            {depth > 0 ? (
              <div className="relative w-5 shrink-0">
                <div
                  className={cn(
                    'absolute top-0 left-3 w-px bg-(--cui-color-stroke-default)',
                    isLast ? 'h-3' : 'bottom-3',
                  )}
                />
                {!isLast ? (
                  <div className="absolute top-3 bottom-0 left-3 w-px bg-(--cui-color-stroke-default)" />
                ) : null}
                <div className="absolute top-3 left-3 h-px w-2 bg-(--cui-color-stroke-default)" />
              </div>
            ) : null}

            {/* type icon + downward child connector */}
            <div className="relative flex w-6 shrink-0 flex-col py-1.5">
              <div className="relative z-10 flex h-4 items-center justify-center">
                <TypeIcon type={node.type} isRoot={isRoot} isSmall />
              </div>
              {hasChildren && !isCollapsed ? (
                <div className="absolute top-3 bottom-0 left-1/2 w-px bg-(--cui-color-stroke-default)" />
              ) : null}
            </div>

            {/* content: name + metrics */}
            <div className="flex min-w-0 flex-1 flex-col py-1 pr-1 pl-1">
              <span
                className="truncate text-xs text-(--cui-color-text-default)"
                title={node.name || node.type}
              >
                {node.name || `Unnamed ${node.type}`}
              </span>
              {timeline ? <TimelineBar node={node} bounds={bounds} /> : null}
              {!timeline && showMetrics ? (
                <div className="flex flex-wrap gap-x-2 text-xs text-(--cui-color-text-muted)">
                  {node.latencyMs > 0 ? <span>{formatLatency(node.latencyMs)}</span> : null}
                  {tokenText ? <span>{tokenText}</span> : null}
                  {node.totalCost > 0 ? (
                    <span>
                      {showCostPrefix ? '∑ ' : ''}
                      {usdFormatter(node.totalCost)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* expand/collapse chevron */}
            {hasChildren ? (
              <div className="flex items-center justify-end py-1 pr-1">
                <button
                  type="button"
                  aria-label={
                    isCollapsed ? localize('com_traces_expand') : localize('com_traces_collapse')
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
                >
                  <ChevronRight
                    className={cn('size-4 transition-transform', isCollapsed ? '' : 'rotate-90')}
                  />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
