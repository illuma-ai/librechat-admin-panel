import { cn } from './cn';

/**
 * Initials avatar — a drop-in replacement for the click-ui `Avatar` (`text` +
 * `textSize` + `title`). Token-only circular surface.
 */
const SIZE_CLASS: Record<string, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
  lg: 'size-9 text-sm',
};

interface AvatarProps {
  text: string;
  textSize?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

export function Avatar({ text, textSize = 'md', title, className }: AvatarProps) {
  return (
    <span
      title={title}
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-(--ui-color-background-accent-muted) font-semibold text-(--ui-color-text-default)',
        SIZE_CLASS[textSize] ?? SIZE_CLASS.md,
        className,
      )}
    >
      {text}
    </span>
  );
}
