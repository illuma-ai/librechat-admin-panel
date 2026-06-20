import { useMemo, useState } from 'react';
import { ExternalLink, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { ScoresTab } from './ScoresTab';
import { LogViewTab, MessageList } from './LogViewTab';
import { MetricBreakdown } from './MetricBreakdown';
import { TypeIcon } from './traceIcons';
import { formatCost, formatLatency, formatTimestampLong, formatTokenCounts } from './format';

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
  /** The whole observation forest — needed by the Log View (not just the selected node). */
  observations: t.ObservationNode[];
  /** Whether the left nav panel is collapsed (drives the header panel-toggle icon). */
  navCollapsed?: boolean;
  /** Collapse/expand the left nav panel (the reference UI header panel-toggle). */
  onToggleNav?: () => void;
  /** Feedback/eval scores for the trace (trace-level + observation-level). */
  scores?: t.TraceScore[];
}

type ViewMode = 'pretty' | 'json';

/** the reference `variant="tertiary"` badge — light gray pill. */
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

/**
 * A titled IO panel — renders the payload as a role-labeled chat-message list when
 * messages exist (assistant/output tinted, user/system muted), else pretty JSON.
 * The Formatted/JSON toggle forces the JSON fallback.
 */
function IOPanel({
  title,
  messages,
  raw,
  view,
}: {
  title: string;
  messages: t.TraceMessage[];
  raw: string;
  view: ViewMode;
}) {
  if (messages.length === 0 && !raw) return null;
  return (
    <div className="flex flex-col gap-1 px-2 pt-2">
      <div className="text-sm font-medium text-(--cui-color-text-default)">{title}</div>
      <MessageList messages={messages} raw={raw} preferJson={view === 'json'} />
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

/**
 * A cost/usage metric badge. When the producer supplies a per-key breakdown
 * (`costDetails`/`usageDetails`) the badge gains an info icon and a click-to-open
 * breakdown popover; with no breakdown (today's LibreChat cost data) it renders a
 * plain badge — so the popover lights up automatically once richer data arrives.
 */
function MetricBadge({
  label,
  details,
  isCost,
}: {
  label: string;
  details: Record<string, number>;
  isCost: boolean;
}) {
  const hasDetails = Object.keys(details).length > 0;
  const badge = (
    <Badge>
      <span className="inline-flex items-center gap-1">
        {label}
        {hasDetails ? <Info className="size-3 shrink-0" /> : null}
      </span>
    </Badge>
  );
  if (!hasDetails) return badge;
  return (
    <MetricBreakdown details={details} isCost={isCost}>
      {badge}
    </MetricBreakdown>
  );
}

/** reference trace/observation detail pane: badges → Preview (Tags, Input, Output, Metadata). */
type TabId = 'preview' | 'scores' | 'log';

/** Tab order mirrors reference: Preview, Scores, Log View. */
const TAB_IDS: readonly TabId[] = ['preview', 'scores', 'log'];

/** i18n key per tab — keeps the underline tab bar declarative. */
const TAB_LABEL_KEYS: Record<TabId, string> = {
  preview: 'com_traces_tab_preview',
  scores: 'com_traces_tab_scores',
  log: 'com_traces_tab_log',
};

export function TraceDetailPane({
  trace,
  totals,
  node,
  isRoot,
  observations,
  navCollapsed = false,
  onToggleNav,
  scores = [],
}: TraceDetailPaneProps) {
  const localize = useLocalize();
  const [view, setView] = useState<ViewMode>('pretty');
  const [tab, setTab] = useState<TabId>('preview');
  const activeTab: TabId = tab;

  const { inputMessages, outputMessages } = useMemo(() => {
    if (!node) return { inputMessages: [], outputMessages: [] };
    const out = node.outputMessages.filter((m) => m.role !== 'user' && m.role !== 'system');
    return {
      inputMessages: node.inputMessages,
      outputMessages: out.length > 0 ? out : node.outputMessages,
    };
  }, [node]);

  // Per-key cost/usage details for the breakdown popovers: a selected observation
  // uses its own; the root aggregates across the whole observation tree.
  const { costDetails, usageDetails } = useMemo(() => {
    if (!isRoot && node) return { costDetails: node.costDetails, usageDetails: node.usageDetails };
    const cost: Record<string, number> = {};
    const usage: Record<string, number> = {};
    const walk = (ns: t.ObservationNode[]) => {
      for (const n of ns) {
        for (const [k, v] of Object.entries(n.costDetails ?? {})) cost[k] = (cost[k] ?? 0) + v;
        for (const [k, v] of Object.entries(n.usageDetails ?? {})) usage[k] = (usage[k] ?? 0) + v;
        walk(n.children);
      }
    };
    walk(observations);
    return { costDetails: cost, usageDetails: usage };
  }, [isRoot, node, observations]);

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
      {/* header: title + timestamp + badges (the reference detail header: p-2 space-y-2 gap-1) */}
      <div className="shrink-0 space-y-2 border-b border-(--cui-color-stroke-default) p-2">
        <div className="flex w-full flex-row items-center gap-1">
          {onToggleNav ? (
            <button
              type="button"
              onClick={onToggleNav}
              aria-label={localize(navCollapsed ? 'com_traces_expand' : 'com_traces_collapse')}
              title={localize(navCollapsed ? 'com_traces_expand' : 'com_traces_collapse')}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)"
            >
              {navCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          ) : null}
          <TypeIcon type={node ? node.type : 'trace'} isRoot={isRoot} isSmall />
          <span className="line-clamp-2 min-w-0 font-medium break-all wrap-break-word text-(--cui-color-text-default)">
            {title}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm text-(--cui-color-text-muted)">
            {formatTimestampLong(trace.timestamp)}
          </div>
          <div className="flex flex-wrap items-center gap-1">
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
                {localize('com_traces_user_id')}: {trace.userId}
                <ExternalLink className="size-3 shrink-0" />
              </span>
            </Badge>
          ) : null}
          {trace.environment ? (
            <Badge>
              {localize('com_traces_environment')}: {trace.environment}
            </Badge>
          ) : null}
          {trace.release ? (
            <Badge>
              {localize('com_traces_col_release')}: {trace.release}
            </Badge>
          ) : null}
          {trace.version ? (
            <Badge>
              {localize('com_traces_col_version')}: {trace.version}
            </Badge>
          ) : null}
          {node?.model ? <Badge>{node.model}</Badge> : null}
          {cost > 0 ? <MetricBadge label={formatCost(cost)} details={costDetails} isCost /> : null}
          {tokenText ? (
            <MetricBadge label={tokenText} details={usageDetails} isCost={false} />
          ) : null}
          </div>
        </div>
      </div>

      {/* tabs + view toggle */}
      <div className="flex shrink-0 items-center justify-between border-b border-(--cui-color-stroke-default) px-2">
        <div className="flex items-center gap-3">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'cursor-pointer border-b-2 py-2 text-sm font-medium',
                activeTab === id
                  ? 'border-(--cui-color-accent) text-(--cui-color-text-default)'
                  : 'border-transparent text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
              )}
            >
              {localize(TAB_LABEL_KEYS[id])}
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

      {activeTab === 'log' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <LogViewTab observations={observations} />
        </div>
      ) : null}
      {activeTab === 'scores' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <ScoresTab scores={scores} />
        </div>
      ) : null}
      {activeTab === 'preview' ? (
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
          />
          <IOPanel
            title={localize('com_traces_output')}
            messages={outputMessages}
            raw={node?.output ?? ''}
            view={view}
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
      ) : null}
    </div>
  );
}
