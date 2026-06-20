import { useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import type * as t from '@/types';
import { cn } from '@/utils';

/** Group graph nodes into ordered step layers (Start at top, End at bottom). */
function toLayers(graph: t.TraceGraph): t.TraceGraphNode[][] {
  const byStep = new Map<number, t.TraceGraphNode[]>();
  for (const node of graph.nodes) {
    if (!byStep.has(node.step)) byStep.set(node.step, []);
    byStep.get(node.step)!.push(node);
  }
  return [...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes]) => nodes);
}

function NodePill({ node }: { node: t.TraceGraphNode }) {
  const isSystem = node.type === 'system';
  return (
    <div
      title={node.label}
      className={cn(
        'max-w-65 truncate rounded-md border px-3 py-1.5 text-center text-xs font-medium',
        isSystem
          ? 'rounded-full border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) text-(--cui-color-text-muted)'
          : 'border-(--cui-color-stroke-intense) bg-(--cui-color-background-default) text-(--cui-color-text-default)',
      )}
    >
      {node.label}
    </div>
  );
}

/** Langfuse-style agent graph: a layered Start → steps → End flow. */
export function TraceGraph({ graph }: { graph: t.TraceGraph }) {
  const layers = useMemo(() => toLayers(graph), [graph]);
  if (layers.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      {layers.map((nodes, i) => (
        <div key={nodes.map((n) => n.id).join('|')} className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-3">
            {nodes.map((node) => (
              <NodePill key={node.id} node={node} />
            ))}
          </div>
          {i < layers.length - 1 ? (
            <ArrowDown className="size-4 text-(--cui-color-text-muted)" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
