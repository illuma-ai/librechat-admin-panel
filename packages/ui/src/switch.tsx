import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from './cn';

/**
 * Radix-based switch — a drop-in replacement for the click-ui `Switch` (same
 * `checked` / `onCheckedChange` / `id` / `label` / `disabled` API). The "on"
 * track uses `--ui-color-accent` (the brand color) so it re-themes through the
 * tokens instead of click-ui's hardcoded accent. When `label` is present the
 * whole control is wrapped in a `<label>` for click-to-toggle.
 */
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, id, label, disabled, className }: SwitchProps) {
  const control = (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-colors',
        'bg-(--ui-color-background-muted) data-[state=checked]:bg-(--ui-color-accent)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ui-color-outline)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );

  if (!label) return control;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
      {control}
      <span className="text-sm text-(--ui-color-text-default)">{label}</span>
    </label>
  );
}
