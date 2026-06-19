import { useMemo, useState } from 'react';
import { Badge, Icon } from '@clickhouse/click-ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { formatCost, formatLatency, formatTokens, observationBadgeState } from './format';

interface FlatNode {
  node: t.ObservationNode;
  depth: number;
}

/** Depth-first flatten so the tree renders as an indented waterfall. */
function flatten(nodes: t.ObservationNode[], depth = 0, out: FlatNode[] = []): FlatNode[] {
  for (const node of nodes) {
    out.push({ node, depth });
    flatten(node.children, depth + 1, out);
  }
  return out;
}

function prettyJson(value: string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function IoPanel({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-medium text-(--cui-color-text-muted)">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) p-2 text-xs wrap-break-word whitespace-pre-wrap">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

/** Indented span tree for a trace; rows with I/O expand inline. */
export function ObservationTree({ observations }: { observations: t.ObservationNode[] }) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rows = useMemo(() => flatten(observations), [observations]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
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
    <div role="tree" aria-label={localize('com_traces_observation_tree')} className="flex flex-col">
      {rows.map(({ node, depth }) => {
        const open = expanded.has(node.id);
        const hasIo = Boolean(node.input || node.output);
        return (
          <div key={node.id} className="border-b border-(--cui-color-stroke-default) last:border-0">
            <button
              type="button"
              onClick={() => hasIo && toggle(node.id)}
              aria-expanded={hasIo ? open : undefined}
              className="flex w-full cursor-pointer items-center gap-2 bg-transparent py-2 pr-2 text-left hover:bg-(--cui-color-background-hover)"
              style={{ paddingLeft: depth * 20 + 8 }}
            >
              {hasIo ? (
                <Icon name={open ? 'chevron-down' : 'chevron-right'} size="sm" />
              ) : (
                <span style={{ width: 16 }} />
              )}
              <Badge text={node.type} state={observationBadgeState(node.type)} size="sm" />
              <span className="truncate text-sm font-medium">{node.name || '—'}</span>
              {node.model ? (
                <span className="truncate text-xs text-(--cui-color-text-muted)">{node.model}</span>
              ) : null}
              <span className="ml-auto flex shrink-0 items-center gap-4 text-xs text-(--cui-color-text-muted)">
                {node.totalTokens > 0 ? <span>{formatTokens(node.totalTokens)} tok</span> : null}
                {node.totalCost > 0 ? <span>{formatCost(node.totalCost)}</span> : null}
                <span>{formatLatency(node.latencyMs)}</span>
              </span>
            </button>
            {open && hasIo ? (
              <div
                className="grid grid-cols-1 gap-3 pr-3 pb-3 md:grid-cols-2"
                style={{ paddingLeft: depth * 20 + 32 }}
              >
                <IoPanel label={localize('com_traces_input')} value={node.input} />
                <IoPanel label={localize('com_traces_output')} value={node.output} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
