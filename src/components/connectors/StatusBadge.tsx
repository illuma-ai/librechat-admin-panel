import { cn } from '@/utils';
import type * as t from '@/types';

const VARIANT_CLASS: Record<t.ConnectorStatusVariant, string> = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  neutral: 'badge-neutral',
};

interface StatusBadgeProps {
  variant: t.ConnectorStatusVariant;
  label: string;
}

/** Small pill that renders a connector status with a semantic theme tone. */
export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        VARIANT_CLASS[variant],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
