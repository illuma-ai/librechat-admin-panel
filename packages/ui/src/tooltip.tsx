import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Radix-based tooltip — a drop-in replacement for the click-ui `Tooltip`
 * compound (same `Tooltip` / `Trigger` / `Content` API) styled with the shared
 * `--cui-color-*` theme tokens. Part of the gradual Radix migration of the
 * traces module.
 */
interface TooltipProps {
  children: ReactNode;
}

function TooltipRoot({ children }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>{children}</TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function TooltipTrigger({ children, ...props }: ComponentPropsWithoutRef<'button'>) {
  return (
    <TooltipPrimitive.Trigger asChild>
      <button type="button" {...props}>
        {children}
      </button>
    </TooltipPrimitive.Trigger>
  );
}

interface TooltipContentProps {
  children: ReactNode;
  maxWidth?: string;
}

function TooltipContent({ children, maxWidth }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={4}
        style={maxWidth ? { maxWidth } : undefined}
        className="z-50 rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1 text-xs text-(--cui-color-text-default) shadow-md"
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});
