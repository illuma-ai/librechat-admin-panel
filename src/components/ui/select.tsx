import type { ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

/**
 * Radix-based Select — a drop-in replacement for the click-ui `Select` (same
 * `value`/`onSelect`/`options`/`placeholder`/`disabled` API) styled with the
 * shared `--cui-color-*` theme tokens. Part of the gradual click-ui → Radix
 * migration of the traces module.
 */
export interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  value?: string;
  onSelect?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ value, onSelect, options, placeholder, disabled, className }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onSelect} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1 rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 text-sm text-(--cui-color-text-default) outline-none',
          'data-placeholder:text-(--cui-color-text-muted) focus-visible:border-(--cui-color-stroke-intense)',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) shadow-md"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-7 text-sm text-(--cui-color-text-default) outline-none select-none data-highlighted:bg-(--cui-color-background-muted) data-[state=checked]:font-medium"
              >
                <span className="absolute left-1.5 inline-flex items-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
