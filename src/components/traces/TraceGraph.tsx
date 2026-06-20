import { useEffect, useMemo, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { typePalette } from './observationPalette';

/** vis-network node color spec (border + fill + highlight). */
interface NodeColor {
  border: string;
  background: string;
  highlight: { border: string; background: string };
}

/**
 * Observation-type → node style, mirroring the reference's `getNodeStyle`
 * (gray-100 fill, type-colored border). The border shade comes from the shared
 * `observationPalette` (single source of truth shared with the type icons); the
 * canvas cannot read CSS variables, so the palette intentionally lives in JS.
 */
function nodeColor(type: string): NodeColor {
  const border = typePalette(type).node;
  return { border, background: '#f3f4f6', highlight: { border, background: '#e5e7eb' } };
}

const START_COLOR: NodeColor = {
  border: '#166534',
  background: '#86efac',
  highlight: { border: '#15803d', background: '#4ade80' },
};
const END_COLOR: NodeColor = {
  border: '#7f1d1d',
  background: '#fecaca',
  highlight: { border: '#991b1b', background: '#fca5a5' },
};

interface VisNode {
  id: string;
  label: string;
  color: NodeColor;
  x?: number;
  y?: number;
}

/** vis-network options, copied from the reference's TraceGraphCanvas (hierarchical UD, boxed nodes). */
const NETWORK_OPTIONS = {
  autoResize: true,
  layout: {
    hierarchical: {
      enabled: true,
      direction: 'UD',
      levelSeparation: 60,
      nodeSpacing: 175,
      sortMethod: 'hubsize',
      shakeTowards: 'roots',
    },
    randomSeed: 1,
  },
  physics: { enabled: false, stabilization: { iterations: 0 } },
  interaction: { zoomView: false },
  nodes: {
    shape: 'box',
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    borderWidth: 2,
    font: { size: 14, color: '#000000' },
    shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', size: 3, x: 3, y: 3 },
    // Wrap long labels (e.g. "agent=bedrock__us.anthropic…") so nodes stay narrow
    // enough to fit the drawer's left panel instead of overflowing horizontally.
    widthConstraint: { maximum: 180 },
    scaling: { label: { enabled: true, min: 14, max: 16 } },
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    width: 1.5,
    color: { color: '#64748b' },
    selectionWidth: 0,
    chosen: false,
  },
} as const;

const START_IDS = new Set(['Start', '__start__', 'LANGFUSE_START', '__lf_start__']);
const END_IDS = new Set(['End', '__end__', 'LANGFUSE_END', '__lf_end__']);

interface ZoomButtonProps {
  icon: typeof ZoomIn;
  title: string;
  onClick: () => void;
}

function ZoomButton({ icon: Icon, title, onClick }: ZoomButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) text-(--ui-color-text-muted) shadow-sm hover:bg-(--ui-color-background-hover) hover:text-(--ui-color-text-default)"
    >
      <Icon className="size-4" />
    </button>
  );
}

/**
 * reference agent-graph view: an interactive vis-network DAG (top-down hierarchical
 * layout, type-colored boxed nodes, green Start / red End, arrow edges) with
 * hover zoom controls.
 */
export function TraceGraph({ graph }: { graph: t.TraceGraph }) {
  const localize = useLocalize();
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [hovering, setHovering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Esc exits fullscreen; mirrors the reference's expandable graph canvas.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const visNodes = useMemo<VisNode[]>(
    () =>
      graph.nodes.map((node) => {
        const base: VisNode = { id: node.id, label: node.label, color: nodeColor(node.type) };
        if (START_IDS.has(node.id)) return { ...base, x: -200, y: 0, color: START_COLOR };
        if (END_IDS.has(node.id)) return { ...base, x: 200, y: 0, color: END_COLOR };
        return base;
      }),
    [graph.nodes],
  );

  const visEdges = useMemo(
    () => graph.edges.map((edge, i) => ({ id: `e${i}`, from: edge.from, to: edge.to })),
    [graph.edges],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || visNodes.length === 0) return;

    const nodes = new DataSet<VisNode>(visNodes);
    const edges = new DataSet(visEdges);
    const network = new Network(container, { nodes, edges }, NETWORK_OPTIONS);
    networkRef.current = network;

    // Zoom the whole graph into view whenever the container has a real size.
    // Driving this from the ResizeObserver (rather than a one-shot afterDrawing)
    // guarantees we fit AFTER layout settles — otherwise long-labelled nodes render
    // full-size and clip inside the narrow, resizable drawer panel.
    const refit = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        network.redraw();
        network.fit();
      }
    };
    const observer = new ResizeObserver(refit);
    observer.observe(container);
    window.addEventListener('resize', refit);

    return () => {
      window.removeEventListener('resize', refit);
      observer.disconnect();
      networkRef.current = null;
      network.destroy();
    };
  }, [visNodes, visEdges]);

  const zoom = (factor: number) => {
    const network = networkRef.current;
    if (network) network.moveTo({ scale: network.getScale() * factor });
  };
  const reset = () => {
    networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
  };

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--ui-color-text-muted)">
        {localize('com_traces_no_graph')}
      </div>
    );
  }

  return (
    <div
      className={cn(
        fullscreen
          ? 'fixed inset-0 z-50 bg-(--ui-color-background-default) p-4'
          : 'relative h-full min-h-50 w-full',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering || fullscreen ? (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <ZoomButton
            icon={fullscreen ? Minimize2 : Maximize2}
            title={localize(fullscreen ? 'com_traces_exit_fullscreen' : 'com_traces_fullscreen')}
            onClick={() => setFullscreen((v) => !v)}
          />
          <ZoomButton
            icon={ZoomIn}
            title={localize('com_traces_zoom_in')}
            onClick={() => zoom(1.2)}
          />
          <ZoomButton
            icon={ZoomOut}
            title={localize('com_traces_zoom_out')}
            onClick={() => zoom(1 / 1.2)}
          />
          <ZoomButton
            icon={RotateCcw}
            title={localize('com_traces_zoom_reset')}
            onClick={reset}
          />
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
