import { cn } from './cn';
import { Icon } from './icon';

/**
 * Icon-only button — a drop-in replacement for the click-ui `IconButton` (same
 * `icon` name + `size` API). Token-only styling; ghost by default with a
 * token-based hover surface.
 */
interface IconButtonProps {
  icon: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  title?: string;
}

export function IconButton({ icon, size = 'sm', onClick, disabled, className, title, ...aria }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) outline-none transition-colors',
        'hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--cui-color-outline)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...aria}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
