import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { Markdown } from '@/components/shared';

/** Role → accent color + label key. Mirrors Opik's role-coded message headers. */
const ROLE_META: Record<t.TraceMessage['role'], { color: string; labelKey: string }> = {
  user: {
    color: 'var(--cui-color-feedback-info-foreground, #3b82f6)',
    labelKey: 'com_traces_role_user',
  },
  assistant: {
    color: 'var(--cui-color-feedback-success-foreground, #10b981)',
    labelKey: 'com_traces_role_assistant',
  },
  system: { color: 'var(--cui-color-text-muted, #6b7280)', labelKey: 'com_traces_role_system' },
  tool: {
    color: 'var(--cui-color-feedback-warning-foreground, #f59e0b)',
    labelKey: 'com_traces_role_tool',
  },
  unknown: { color: 'var(--cui-color-text-muted, #6b7280)', labelKey: 'com_traces_role_unknown' },
};

/** A vertical list of chat messages, each with a role-coded header and markdown body. */
export function MessageList({ messages }: { messages: t.TraceMessage[] }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, index) => {
        const meta = ROLE_META[message.role] ?? ROLE_META.unknown;
        return (
          <div
            key={`${message.role}-${index}`}
            className="overflow-hidden rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default)"
          >
            <div
              className="flex items-center gap-2 border-l-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase"
              style={{ borderLeftColor: meta.color, color: meta.color }}
            >
              {localize(meta.labelKey)}
            </div>
            <div className="px-3 py-2">
              <Markdown>{message.text}</Markdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
