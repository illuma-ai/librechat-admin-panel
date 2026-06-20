import { useMemo, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { Markdown } from '@/components/shared';
import { TraceGraph } from './TraceGraph';
import { TypeIcon } from './traceIcons';
import { formatCost, formatLatency, formatTime, formatTokenCounts } from './format';

interface TraceTotals {
  latencyMs: number;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

interface TraceDetailPaneProps {
  trace: t.TraceHeader;
  totals: TraceTotals;
  node: t.ObservationNode | null;
  isRoot: boolean;
  graph: t.TraceGraph;
}

type ViewMode = 'pretty' | 'json';

function prettyJson(value: string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** Langfuse `variant="tertiary"` badge — light gray pill. */
function Badge({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs',
        dark
          ? 'bg-(--cui-color-text-default) text-(--cui-color-background-default)'
          : 'bg-(--cui-color-background-muted) text-(--cui-color-text-default)',
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A titled IO panel — Output/assistant gets the green tint, Input/system gray. */
function IOPanel({
  title,
  messages,
  raw,
  view,
  variant,
}: {
  title: string;
  messages: t.TraceMessage[];
  raw: string;
  view: ViewMode;
  variant: 'input' | 'output';
}) {
  const hasContent = messages.length > 0 || raw;
  if (!hasContent) return null;
  const text = messages.map((m) => m.text).join('\n\n');
  return (
    <div className="flex flex-col gap-1 px-2 pt-2">
      <div className="text-sm font-medium text-(--cui-color-text-default)">{title}</div>
      <div
        className={cn(
          'rounded-sm border border-(--cui-color-stroke-default) p-3 text-xs wrap-break-word',
          variant === 'input' && 'bg-(--cui-color-background-muted)',
        )}
        style={variant === 'output' ? { backgroundColor: 'var(--trace-output-bg)' } : undefined}
      >
        {view === 'json' || !text ? (
          <pre className="trace-markdown overflow-auto whitespace-pre-wrap">{prettyJson(raw)}</pre>
        ) : (
          <Markdown>{text}</Markdown>
        )}
      </div>
    </div>
  );
}

interface MetaRow {
  path: string;
  value: string;
}

/** Build a Path/Value metadata table from the captured node/trace fields. */
function metadataRows(
  trace: t.TraceHeader,
  node: t.ObservationNode | null,
  isRoot: boolean,
): MetaRow[] {
  const rows: MetaRow[] = [];
  const seen = new Set<string>();
  const push = (path: string, value: unknown) => {
    if (value === undefined || value === null || value === '' || seen.has(path)) return;
    seen.add(path);
    rows.push({ path, value: String(value) });
  };
  // Producer-captured metadata (incl. OTel resourceAttributes.*) first.
  const meta = isRoot ? trace.metadata : (node?.metadata ?? {});
  for (const [k, v] of Object.entries(meta ?? {})) push(k, v);
  push('environment', trace.environment);
  push('release', trace.release);
  push('version', trace.version);
  if (node) {
    push('model', node.model);
    push('level', node.level);
    for (const [k, v] of Object.entries(node.usageDetails ?? {})) push(`usage.${k}`, v);
    for (const [k, v] of Object.entries(node.costDetails ?? {})) push(`cost.${k}`, v);
  }
  return rows;
}

/** Langfuse trace/observation detail pane: badges → Preview (Tags, Input, Output, Metadata). */
export function TraceDetailPane({ trace, totals, node, isRoot, graph }: TraceDetailPaneProps) {
  const localize = useLocalize();
  const [view, setView] = useState<ViewMode>('pretty');
  const [tab, setTab] = useState<'preview' | 'graph'>('preview');
  const showGraph = isRoot && graph.nodes.length > 0;
  const activeTab = tab === 'graph' && showGraph ? 'graph' : 'preview';

  const { inputMessages, outputMessages } = useMemo(() => {
    if (!node) return { inputMessages: [], outputMessages: [] };
    const out = node.outputMessages.filter((m) => m.role !== 'user' && m.role !== 'system');
    return {
      inputMessages: node.inputMessages,
      outputMessages: out.length > 0 ? out : node.outputMessages,
    };
  }, [node]);

  const latencyMs = isRoot ? totals.latencyMs : (node?.latencyMs ?? 0);
  const cost = isRoot ? totals.totalCost : (node?.totalCost ?? 0);
  const inputTok = isRoot ? totals.inputTokens : (node?.inputTokens ?? 0);
  const outputTok = isRoot ? totals.outputTokens : (node?.outputTokens ?? 0);
  const totalTok = isRoot ? totals.totalTokens : (node?.totalTokens ?? 0);
  const tokenText = formatTokenCounts(inputTok, outputTok, totalTok, true);
  const title = node ? node.name || node.type : trace.name || trace.id;
  const rows = metadataRows(trace, node, isRoot);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header: title + timestamp + badges */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-(--cui-color-stroke-default) p-3">
        <div className="flex items-center gap-1.5">
          <TypeIcon type={node ? node.type : 'trace'} isRoot={isRoot} />
          <span className="truncate font-medium text-(--cui-color-text-default)">{title}</span>
        </div>
        <div className="text-sm text-(--cui-color-text-muted)">{formatTime(trace.timestamp)}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>
            {localize('com_traces_col_latency')}: {formatLatency(latencyMs)}
          </Badge>
          {trace.sessionId ? (
            <Badge dark>
              <span className="inline-flex items-center gap-1">
                {localize('com_traces_session')}: {trace.sessionId}
                <ExternalLink className="size-3 shrink-0" />
              </span>
            </Badge>
          ) : null}
          {trace.userId ? (
            <Badge dark>
              <span className="inline-flex items-center gap-1">
                {localize('com_traces_col_user')}: {trace.userId}
                <ExternalLink className="size-3 shrink-0" />
              </span>
            </Badge>
          ) : null}
          {trace.environment ? (
            <Badge>
              {localize('com_traces_environment')}: {trace.environment}
            </Badge>
          ) : null}
          {node?.model ? <Badge>{node.model}</Badge> : null}
          {cost > 0 ? (
            <Badge>
              <span className="inline-flex items-center gap-1">
                {formatCost(cost)} <Info className="size-3 shrink-0" />
              </span>
            </Badge>
          ) : null}
          {tokenText ? (
            <Badge>
              <span className="inline-flex items-center gap-1">
                {tokenText} <Info className="size-3 shrink-0" />
              </span>
            </Badge>
          ) : null}
        </div>
      </div>

      {/* tabs + view toggle */}
      <div className="flex shrink-0 items-center justify-between border-b border-(--cui-color-stroke-default) px-3">
        <div className="flex items-center gap-3">
          {(['preview', 'graph'] as const)
            .filter((id) => id === 'preview' || showGraph)
            .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'cursor-pointer border-b-2 border-transparent py-2 text-sm font-medium',
                  activeTab === id
                    ? 'border-(--cui-color-stroke-intense) text-(--cui-color-text-default)'
                    : 'text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
                )}
              >
                {id === 'preview'
                  ? localize('com_traces_tab_preview')
                  : localize('com_traces_tab_graph')}
              </button>
            ))}
        </div>
        {activeTab === 'preview' ? (
          <div className="flex items-center gap-0.5 rounded-md bg-(--cui-color-background-muted) p-0.5 text-xs">
            {(['pretty', 'json'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  'cursor-pointer rounded px-2 py-0.5',
                  view === mode
                    ? 'bg-(--cui-color-background-default) text-(--cui-color-text-default)'
                    : 'text-(--cui-color-text-muted)',
                )}
              >
                {mode === 'pretty' ? localize('com_traces_formatted') : localize('com_traces_json')}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {activeTab === 'graph' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <TraceGraph graph={graph} />
        </div>
      ) : (
        /* preview body */
        <div className="min-h-0 flex-1 overflow-auto pb-4">
          {isRoot && trace.tags.length > 0 ? (
            <div className="flex flex-col gap-1 px-2 pt-2">
              <div className="text-sm font-medium text-(--cui-color-text-default)">
                {localize('com_traces_tags')}
              </div>
              <div className="flex flex-wrap gap-1">
                {trace.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm bg-(--cui-color-background-muted) px-1.5 py-0.5 text-xs text-(--cui-color-text-muted)"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <IOPanel
            title={localize('com_traces_input')}
            messages={inputMessages}
            raw={node?.input ?? ''}
            view={view}
            variant="input"
          />
          <IOPanel
            title={localize('com_traces_output')}
            messages={outputMessages}
            raw={node?.output ?? ''}
            view={view}
            variant="output"
          />

          {rows.length > 0 ? (
            <div className="flex flex-col gap-1 px-2 pt-3">
              <div className="text-sm font-medium text-(--cui-color-text-default)">
                {localize('com_traces_metadata')}
              </div>
              <div className="overflow-hidden rounded-sm border border-(--cui-color-stroke-default)">
                <div className="flex border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-3 py-1.5 text-xs font-medium text-(--cui-color-text-muted)">
                  <span className="w-1/3">{localize('com_traces_path')}</span>
                  <span className="flex-1">{localize('com_traces_value')}</span>
                </div>
                {rows.map((r) => (
                  <div
                    key={r.path}
                    className="flex border-b border-(--cui-color-stroke-default) px-3 py-1 text-xs last:border-0"
                  >
                    <span className="w-1/3 truncate text-(--cui-color-text-muted)">{r.path}</span>
                    <span className="flex-1 break-all text-(--cui-color-text-default)">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
