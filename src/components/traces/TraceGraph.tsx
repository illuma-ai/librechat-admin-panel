import { useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import type * as t from '@/types';
import { typeVisual } from './traceIcons';

/** Group graph nodes into ordered step layers (Start at top, End at bottom). */
function toLayers(graph: t.TraceGraph): t.TraceGraphNode[][] {
  const byStep = new Map<number, t.TraceGraphNode[]>();
  for (const node of graph.nodes) {
    if (!byStep.has(node.step)) byStep.set(node.step, []);
    byStep.get(node.step)!.push(node);
  }
  return [...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes]) => nodes);
}

/** Convert a hex color + alpha to an rgba() string for the node fill. */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function NodePill({ node }: { node: t.TraceGraphNode }) {
  const isSystem = node.type === 'system';
  if (isSystem) {
    return (
      <div
        title={node.label}
        className="max-w-65 truncate rounded-full border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-3 py-1.5 text-center text-xs font-medium text-(--cui-color-text-muted)"
      >
        {node.label}
      </div>
    );
  }
  // Color the node by its observation type (Langfuse uses colored agent nodes).
  const visual = typeVisual(node.type);
  const Icon = visual.icon;
  return (
    <div
      title={node.label}
      className="flex max-w-65 items-center gap-1.5 truncate rounded-md border px-3 py-1.5 text-center text-xs font-medium"
      style={{
        borderColor: visual.color,
        backgroundColor: tint(visual.color, 0.1),
        color: visual.color,
      }}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{node.label}</span>
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
