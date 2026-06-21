import { Info } from 'lucide-react';
import { Tooltip } from '@admin/ui';

/**
 * Small info (ⓘ) icon with a hover/focus tooltip — the single source for metric and
 * field descriptions across the app. Always prefer this over plain helper text.
 */
export function InfoTooltip({ description }: { description: string }) {
  return (
    <Tooltip>
      <Tooltip.Trigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex cursor-help items-center text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)"
        aria-label={description}
      >
        <Info className="size-3.5" />
      </Tooltip.Trigger>
      <Tooltip.Content maxWidth="220px">{description}</Tooltip.Content>
    </Tooltip>
  );
}
