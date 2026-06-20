/**
 * Single source of truth for observation-type colors.
 *
 * These are NOT theme tokens because they are consumed in two places that cannot
 * read CSS variables: the type icons (inline SVG `fill`) and the agent graph
 * (vis-network canvas). Keeping them here — keyed by observation type — means the
 * icon palette and the graph-node palette never drift apart. `icon` is the bold
 * foreground shade; `node` is the lighter graph-node border shade.
 */
export interface TypePalette {
  /** Bold shade for the type icon / inline chips. */
  icon: string;
  /** Lighter shade for the agent-graph node border. */
  node: string;
}

export const TYPE_PALETTE: Record<string, TypePalette> = {
  trace: { icon: '#15803d', node: '#86efac' },
  span: { icon: '#2563eb', node: '#93c5fd' },
  generation: { icon: '#be185d', node: '#f0abfc' },
  tool: { icon: '#ea580c', node: '#fed7aa' },
  agent: { icon: '#9333ea', node: '#c4b5fd' },
  event: { icon: '#16a34a', node: '#6ee7b7' },
  chain: { icon: '#db2777', node: '#f9a8d4' },
  retriever: { icon: '#0d9488', node: '#5eead4' },
  embedding: { icon: '#d97706', node: '#fbbf24' },
  guardrail: { icon: '#dc2626', node: '#fca5a5' },
};

export const DEFAULT_TYPE = 'span';

/** Resolve a type's palette, falling back to `span`. */
export function typePalette(type: string): TypePalette {
  return TYPE_PALETTE[type] ?? TYPE_PALETTE[DEFAULT_TYPE];
}
