import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from './cn';

/**
 * Radix-based checkbox — a drop-in replacement for the click-ui `Checkbox`
 * (same `checked` / `onCheckedChange` API, coerced to a strict boolean) styled
 * with the shared `--cui-color-*` theme tokens. Part of the gradual Radix
 * migration of the traces module.
 */
interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onCheckedChange, disabled, className }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      disabled={disabled}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) outline-none',
        'data-[state=checked]:border-(--cui-color-accent) data-[state=checked]:bg-(--cui-color-accent) data-[state=checked]:text-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
