import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * Radix-free button — a drop-in replacement for the click-ui `Button` (same
 * `type` variant / `label` / `iconLeft` API). click-ui's Button bakes its brand
 * color (`#faff69`) into a styled-component, so it cannot be re-themed via
 * tokens; every color here comes from a `--ui-color-*` theme token (the single
 * source of truth), so the brand accent flows through automatically.
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger';

/** click-ui icon-name → lucide icon. Extend as more names are migrated. */
const ICON_MAP: Record<string, LucideIcon> = {
  plus: Plus,
};

interface ButtonProps {
  /** Visual variant — matches click-ui's `type` prop (not the HTML button type). */
  type?: ButtonVariant;
  label?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** click-ui icon name rendered before the label (e.g. "plus"). */
  iconLeft?: string;
  title?: string;
  className?: string;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-(--ui-color-accent) text-(--ui-color-text-on-accent) hover:bg-(--ui-color-accent-hover)',
  secondary:
    'border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)',
  danger:
    'bg-(--ui-color-accent-danger) text-(--ui-color-text-on-accent) hover:brightness-95',
};

export function Button({
  type = 'primary',
  label,
  onClick,
  disabled,
  iconLeft,
  title,
  className,
  children,
}: ButtonProps) {
  const Icon = iconLeft ? ICON_MAP[iconLeft] : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium outline-none transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ui-color-outline)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[type],
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {label ?? children}
    </button>
  );
}
