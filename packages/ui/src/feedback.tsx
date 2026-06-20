import { X } from 'lucide-react';
import { cn } from './cn';

/**
 * Status surfaces — drop-in replacements for the click-ui `Alert` and `Badge`.
 * The `state` selects a `--cui-color-feedback-*` token pair (bg + fg), the
 * single source of truth for status colors — nothing hardcoded.
 */
type FeedbackState = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const STATE_CLASS: Record<FeedbackState, string> = {
  info: 'bg-(--cui-color-feedback-info-bg) text-(--cui-color-feedback-info-fg)',
  success: 'bg-(--cui-color-feedback-success-bg) text-(--cui-color-feedback-success-fg)',
  warning: 'bg-(--cui-color-feedback-warning-bg) text-(--cui-color-feedback-warning-fg)',
  danger: 'bg-(--cui-color-feedback-danger-bg) text-(--cui-color-feedback-danger-fg)',
  neutral: 'bg-(--cui-color-background-muted) text-(--cui-color-text-default)',
};

interface AlertProps {
  text: string;
  state?: FeedbackState;
  /** click-ui's `type` (banner|default); kept for API parity, styling is uniform. */
  type?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ text, state = 'info', dismissible, onDismiss, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-full items-start gap-2 rounded-md px-3 py-2 text-sm',
        STATE_CLASS[state],
        className,
      )}
    >
      <span className="flex-1">{text}</span>
      {dismissible ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 cursor-pointer rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

interface BadgeProps {
  text: string;
  state?: FeedbackState;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ text, state = 'neutral', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        STATE_CLASS[state],
        className,
      )}
    >
      {text}
    </span>
  );
}
