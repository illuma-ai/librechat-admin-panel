import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type * as t from '@/types';
import { cn } from '@/utils';
import { Markdown } from '@/components/shared';
import { roleVisual } from './traceIcons';

/**
 * Opik-style chat messages: each message is a collapsible block with a role icon
 * badge (color-coded), a role label, and a markdown body. Default expanded.
 */
export function MessageList({ messages }: { messages: t.TraceMessage[] }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (index: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message, index) => {
        const visual = roleVisual(message.role);
        const Icon = visual.icon;
        const open = !collapsed.has(index);
        return (
          <div key={`${message.role}-${index}`} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={open}
              className="flex cursor-pointer items-center gap-1 rounded-sm p-1 text-left transition-colors select-none hover:bg-(--cui-color-background-muted)"
            >
              <ChevronRight
                className={cn(
                  'size-3.5 shrink-0 text-(--cui-color-text-muted) transition-transform',
                  open ? 'rotate-90' : '',
                )}
              />
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-sm"
                style={{ background: visual.bg, color: visual.color }}
              >
                <Icon className="size-3" />
              </span>
              <span className="text-[13px] font-semibold text-(--cui-color-text-default)">
                {visual.label}
              </span>
            </button>
            {open ? (
              <div className="pt-1 pr-1 pb-2 pl-[1.85rem]">
                <Markdown>{message.text}</Markdown>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
