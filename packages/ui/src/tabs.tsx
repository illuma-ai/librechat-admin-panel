import type { ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './cn';

/**
 * Radix-based tabs — a drop-in replacement for the click-ui `Tabs` compound
 * (`Tabs` / `Tabs.TriggersList` / `Tabs.Trigger` / `Tabs.Content`) styled with
 * the shared `--ui-color-*` theme tokens. Replaces click-ui's `Tabs`, whose
 * active-underline color (`#faff69`) is hardcoded inside its styled-component
 * and cannot be re-themed via tokens; here the active underline derives from
 * `--ui-color-accent` (the brand color), the single source of truth.
 */
interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the tab list (maps to click-ui's `ariaLabel`). */
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

function TabsRoot({ value, defaultValue, onValueChange, ariaLabel, className, children }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn('flex min-h-0 flex-col', className)}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

function TriggersList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex shrink-0 items-center gap-4 border-b border-(--ui-color-stroke-default)',
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

interface TriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * The active underline uses `data-[state=active]:border-(--ui-color-accent)`;
 * the attribute selector outranks the base `border-transparent`, so the brand
 * color always wins (no equal-specificity tie that would hide the underline).
 */
function Trigger({ value, children, className, disabled }: TriggerProps) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      disabled={disabled}
      className={cn(
        'cursor-pointer border-b-2 border-transparent py-2 text-sm font-medium text-(--ui-color-text-muted) outline-none transition-colors',
        'hover:text-(--ui-color-text-default)',
        'data-[state=active]:border-(--ui-color-accent) data-[state=active]:text-(--ui-color-text-default)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

interface ContentProps {
  value: string;
  children?: ReactNode;
  className?: string;
  tabIndex?: number;
  /** Keep mounted while inactive (consumer hides via `className`), as click-ui supports. */
  forceMount?: boolean;
}

function Content({ value, children, className, tabIndex, forceMount }: ContentProps) {
  return (
    <TabsPrimitive.Content
      value={value}
      tabIndex={tabIndex}
      forceMount={forceMount ? true : undefined}
      className={cn('min-h-0 flex-1 outline-none', className)}
    >
      {children}
    </TabsPrimitive.Content>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  TriggersList,
  Trigger,
  Content,
});
