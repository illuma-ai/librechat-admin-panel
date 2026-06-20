import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Brain, Clock, Coins, Hash } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { MessageList } from './MessageList';
import { TypeIcon } from './traceIcons';
import { formatCost, formatLatency, formatTokens } from './format';

interface TraceNodeDetailProps {
  /** The selected observation, or null to show the trace-level conversation. */
  node: t.ObservationNode | null;
  /** Trace-level request→response, shown when no specific node is selected. */
  conversation: t.TraceMessage[];
  traceName: string;
}

type DetailTab = 'messages' | 'raw';

function prettyJson(value: string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function JsonBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-xs font-semibold tracking-wide text-(--cui-color-text-muted) uppercase">
        {label}
      </div>
      <pre className="trace-markdown max-h-90 overflow-auto rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) p-3 text-xs whitespace-pre-wrap">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <span
      className="flex items-center gap-1 text-xs font-medium"
      style={{ color: 'var(--trace-slate-muted)' }}
    >
      <Icon className="size-3 shrink-0" /> {children}
    </span>
  );
}

/** Center panel: the selected span's messages + raw I/O, or the trace conversation. */
export function TraceNodeDetail({ node, conversation, traceName }: TraceNodeDetailProps) {
  const localize = useLocalize();
  const [tab, setTab] = useState<DetailTab>('messages');

  const messages = useMemo(() => {
    if (!node) return conversation;
    if (node.outputMessages.length > 0) return node.outputMessages;
    return node.inputMessages;
  }, [node, conversation]);

  const hasMessages = messages.length > 0;
  const hasRaw = Boolean(node?.input || node?.output);
  const title = node ? node.name || node.type : traceName;

  const tabs: { id: DetailTab; labelKey: string; enabled: boolean }[] = [
    { id: 'messages', labelKey: 'com_traces_tab_messages', enabled: hasMessages },
    { id: 'raw', labelKey: 'com_traces_tab_raw', enabled: hasRaw },
  ];
  const activeTab = tabs.find((x) => x.id === tab)?.enabled
    ? tab
    : (tabs.find((x) => x.enabled)?.id ?? 'messages');

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--cui-color-stroke-default) px-4 py-3">
        {node ? <TypeIcon type={node.type} size={6} /> : null}
        <span className="truncate text-sm font-semibold text-(--cui-color-text-default)">
          {title}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          {node?.model ? <Chip icon={Brain}>{node.model}</Chip> : null}
          {node && node.totalTokens > 0 ? (
            <Chip icon={Hash}>{formatTokens(node.totalTokens)}</Chip>
          ) : null}
          {node && node.totalCost > 0 ? (
            <Chip icon={Coins}>{formatCost(node.totalCost)}</Chip>
          ) : null}
          {node ? <Chip icon={Clock}>{formatLatency(node.latencyMs)}</Chip> : null}
        </span>
      </div>

      <div className="flex items-center gap-1 border-b border-(--cui-color-stroke-default) px-3">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            disabled={!tabItem.enabled}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              'cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-medium',
              tabItem.enabled
                ? 'text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)'
                : 'cursor-not-allowed opacity-40',
              activeTab === tabItem.id && tabItem.enabled
                ? 'border-(--cui-color-stroke-intense)! text-(--cui-color-text-default)'
                : '',
            )}
          >
            {localize(tabItem.labelKey)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === 'messages' && hasMessages ? <MessageList messages={messages} /> : null}
        {activeTab === 'raw' ? (
          <div className="flex flex-col gap-4">
            <JsonBlock label={localize('com_traces_input')} value={node?.input ?? ''} />
            <JsonBlock label={localize('com_traces_output')} value={node?.output ?? ''} />
          </div>
        ) : null}
        {activeTab === 'messages' && !hasMessages ? (
          <div className="text-sm text-(--cui-color-text-muted)">
            {localize('com_traces_no_messages')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
