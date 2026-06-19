import { useMemo, useState } from 'react';
import { Badge, Icon } from '@clickhouse/click-ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { formatCost, formatLatency, formatTokens, observationBadgeState } from './format';

interface FlatNode {
  node: t.ObservationNode;
  depth: number;
  hasChildren: boolean;
}

/** Depth-first flatten, skipping the subtrees of collapsed nodes. */
function flatten(
  nodes: t.ObservationNode[],
  collapsed: Set<string>,
  depth = 0,
  out: FlatNode[] = [],
): FlatNode[] {
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    out.push({ node, depth, hasChildren });
    if (hasChildren && !collapsed.has(node.id)) flatten(node.children, collapsed, depth + 1, out);
  }
  return out;
}

interface TraceSequenceProps {
  observations: t.ObservationNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Left pane: the span/observation tree. Rows select into the detail panel. */
export function TraceSequence({ observations, selectedId, onSelect }: TraceSequenceProps) {
  const localize = useLocalize();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const rows = useMemo(() => flatten(observations, collapsed), [observations, collapsed]);

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
      {rows.map(({ node, depth, hasChildren }) => {
        const isCollapsed = collapsed.has(node.id);
        const selected = node.id === selectedId;
        return (
          <div
            key={node.id}
            role="treeitem"
            aria-selected={selected}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            onClick={() => onSelect(node.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 py-1.5 pr-2 text-left text-sm',
              'border-l-2 hover:bg-(--cui-color-background-hover)',
              selected
                ? 'border-l-(--cui-color-stroke-intense) bg-(--cui-color-background-selected)'
                : 'border-l-transparent',
            )}
            style={{ paddingLeft: depth * 16 + 6 }}
          >
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
                className="flex shrink-0 cursor-pointer items-center text-(--cui-color-text-muted)"
              >
                <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size="sm" />
              </button>
            ) : (
              <span className="shrink-0" style={{ width: 16 }} />
            )}
            <Badge text={node.type} state={observationBadgeState(node.type)} size="sm" />
            <span className="truncate font-medium text-(--cui-color-text-default)">
              {node.name || '—'}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2.5 pl-2 text-xs text-(--cui-color-text-muted)">
              {node.totalTokens > 0 ? <span>{formatTokens(node.totalTokens)}</span> : null}
              {node.totalCost > 0 ? <span>{formatCost(node.totalCost)}</span> : null}
              <span>{formatLatency(node.latencyMs)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
