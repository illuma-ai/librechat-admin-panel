import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { Markdown } from '@/components/shared';
import { TypeIcon } from './traceIcons';
import { formatLatency } from './format';

interface LogViewTabProps {
  observations: t.ObservationNode[];
}

/** A flattened log row: the observation plus its tree depth and ancestor guide lines. */
interface FlatLogRow {
  node: t.ObservationNode;
  depth: number;
  /** For each ancestor column, whether that ancestor has a following sibling (draw guide line). */
  ancestorLines: boolean[];
}

/**
 * Depth-first flatten of the observation forest, preserving tree order and capturing
 * per-row indent depth + ancestor guide lines (mirrors Langfuse `flattenTreeOrder`).
 */
function flattenForest(
  nodes: t.ObservationNode[],
  depth = 0,
  ancestorLines: boolean[] = [],
  out: FlatLogRow[] = [],
): FlatLogRow[] {
  nodes.forEach((node, i) => {
    const isLast = i === nodes.length - 1;
    out.push({ node, depth, ancestorLines });
    if (node.children.length > 0) {
      flattenForest(node.children, depth + 1, [...ancestorLines, !isLast], out);
    }
  });
  return out;
}

/** Pretty-print a serialized JSON string; fall back to the raw string when unparseable. */
function prettyJson(value: string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** Level chip — only rendered for ERROR/WARNING (Langfuse `level` highlight). */
function LevelChip({ level }: { level: string }) {
  const upper = level.toUpperCase();
  if (upper !== 'ERROR' && upper !== 'WARNING') return null;
  return (
    <span
      className={cn(
        'shrink-0 rounded-sm px-1 py-0.5 text-[10px] font-medium',
        upper === 'ERROR'
          ? 'bg-(--cui-color-feedback-danger-bg) text-(--cui-color-feedback-danger-fg)'
          : 'bg-(--cui-color-feedback-warning-bg) text-(--cui-color-feedback-warning-fg)',
      )}
    >
      {upper}
    </span>
  );
}

/**
 * Renders Input/Output as a role-labeled chat-message list when messages exist,
 * else falls back to pretty JSON. Shared by the Log View expansion and the Preview pane.
 */
export function MessageList({
  messages,
  raw,
  preferJson,
}: {
  messages: t.TraceMessage[];
  raw: string;
  preferJson?: boolean;
}) {
  if (messages.length === 0 || preferJson) {
    if (!raw) return null;
    return (
      <pre className="trace-markdown overflow-auto rounded-sm border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) p-2 text-xs whitespace-pre-wrap">
        {prettyJson(raw)}
      </pre>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {messages.map((message, i) => (
        <ChatBubble key={i} message={message} />
      ))}
    </div>
  );
}

/** A single role-labeled bubble; assistant/tool output tinted, user/system muted. */
function ChatBubble({ message }: { message: t.TraceMessage }) {
  const isAssistant = message.role === 'assistant' || message.role === 'tool';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-(--cui-color-text-muted) uppercase">
        {message.role}
      </span>
      <div
        className={cn(
          'rounded-sm border border-(--cui-color-stroke-default) p-2 text-xs wrap-break-word',
          !isAssistant && 'bg-(--cui-color-background-muted)',
        )}
        style={isAssistant ? { backgroundColor: 'var(--trace-output-bg)' } : undefined}
      >
        {message.text ? <Markdown>{message.text}</Markdown> : null}
      </div>
    </div>
  );
}

/** One IO block inside an expanded row — title + chat/JSON body, hidden when empty. */
function ExpandedIO({
  title,
  messages,
  raw,
}: {
  title: string;
  messages: t.TraceMessage[];
  raw: string;
}) {
  if (messages.length === 0 && !raw) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-(--cui-color-text-muted) uppercase">
        {title}
      </span>
      <MessageList messages={messages} raw={raw} />
    </div>
  );
}

/** Indent guides for a log row, mirroring the connector look used in `TraceSequence`. */
function RowIndent({ depth, ancestorLines }: { depth: number; ancestorLines: boolean[] }) {
  if (depth === 0) return null;
  return (
    <div className="flex shrink-0">
      {Array.from({ length: depth - 1 }, (_, i) => (
        <div key={i} className="relative w-4">
          {ancestorLines[i] ? (
            <div className="absolute top-0 bottom-0 left-2 w-px bg-(--cui-color-stroke-default)" />
          ) : null}
        </div>
      ))}
      <div className="relative w-4 shrink-0">
        <div className="absolute top-0 left-2 h-1/2 w-px bg-(--cui-color-stroke-default)" />
        <div className="absolute top-1/2 left-2 h-px w-2 bg-(--cui-color-stroke-default)" />
      </div>
    </div>
  );
}

/** One expandable log row: indent → type icon → name → level chip → latency. */
function LogRow({ row }: { row: FlatLogRow }) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const { node, depth, ancestorLines } = row;
  return (
    <div className="border-b border-(--cui-color-stroke-default) last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-(--cui-color-background-hover)"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 text-(--cui-color-text-muted) transition-transform',
            open ? 'rotate-90' : '',
          )}
        />
        <RowIndent depth={depth} ancestorLines={ancestorLines} />
        <TypeIcon type={node.type} isSmall />
        <span className="min-w-0 flex-1 truncate text-(--cui-color-text-default)" title={node.name}>
          {node.name || `Unnamed ${node.type}`}
        </span>
        <LevelChip level={node.level} />
        {node.latencyMs > 0 ? (
          <span className="shrink-0 text-(--cui-color-text-muted)">
            {formatLatency(node.latencyMs)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
          <ExpandedIO
            title={localize('com_traces_input')}
            messages={node.inputMessages}
            raw={node.input}
          />
          <ExpandedIO
            title={localize('com_traces_output')}
            messages={node.outputMessages}
            raw={node.output}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Langfuse "Log View" tab — a flattened chronological/tree-order log of ALL observations
 * in the trace. Each row shows the type icon, name, level, and latency; expanding a row
 * reveals that observation's Input then Output (chat-message list or pretty JSON).
 */
export function LogViewTab({ observations }: LogViewTabProps) {
  const localize = useLocalize();
  const rows = useMemo(() => flattenForest(observations), [observations]);

  if (rows.length === 0) {
    return (
      <div className="px-3 py-6 text-sm text-(--cui-color-text-muted)">
        {localize('com_traces_log_empty')}
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {rows.map((row) => (
        <LogRow key={row.node.id} row={row} />
      ))}
    </div>
  );
}
