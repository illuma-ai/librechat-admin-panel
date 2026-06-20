import type { ReactNode } from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Icon } from './icon';
import { cn } from './cn';

/**
 * Radix-based dropdown menu — a drop-in replacement for the click-ui `Dropdown`
 * compound (same `Dropdown` / `Trigger` / `Content` / `Item` API) styled with
 * the shared `--cui-color-*` theme tokens. Part of the gradual Radix migration
 * of the traces module.
 */
interface DropdownProps {
  children: ReactNode;
}

function DropdownRoot({ children }: DropdownProps) {
  return <DropdownPrimitive.Root modal>{children}</DropdownPrimitive.Root>;
}

function DropdownTrigger({ children }: { children: ReactNode }) {
  return <DropdownPrimitive.Trigger asChild>{children}</DropdownPrimitive.Trigger>;
}

interface DropdownContentProps {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}

function DropdownContent({ children, align = 'start' }: DropdownContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={4}
        className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) p-1 shadow-md"
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  /** click-ui icon name rendered before the label. */
  icon?: string;
  disabled?: boolean;
  className?: string;
}

function DropdownItem({ children, onClick, icon, disabled, className }: DropdownItemProps) {
  return (
    <DropdownPrimitive.Item
      onSelect={onClick}
      disabled={disabled}
      className={cn(
        'relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-(--cui-color-text-default) outline-none select-none data-highlighted:bg-(--cui-color-background-muted) data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
    >
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </DropdownPrimitive.Item>
  );
}

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
});
