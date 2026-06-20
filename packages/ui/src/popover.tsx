import type { ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

/**
 * Radix-based popover — a drop-in replacement for the click-ui `Popover`
 * compound (same `Popover` / `Trigger` / `Content` API) styled with the shared
 * `--ui-color-*` theme tokens. Part of the gradual Radix migration of the
 * traces module.
 */
interface PopoverProps {
  children: ReactNode;
}

function PopoverRoot({ children }: PopoverProps) {
  return <PopoverPrimitive.Root>{children}</PopoverPrimitive.Root>;
}

function PopoverTrigger({ children }: { children: ReactNode }) {
  return <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>;
}

interface PopoverContentProps {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}

function PopoverContent({ children, align = 'center' }: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={4}
        className="z-50 overflow-hidden rounded-md border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) text-(--ui-color-text-default) shadow-md"
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});
