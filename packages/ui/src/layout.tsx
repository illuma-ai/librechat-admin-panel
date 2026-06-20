import type { CSSProperties, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Layout primitives — drop-in replacements for the click-ui `Container` /
 * `Panel` / `Separator` / `Title`, used by the auth screens. Token-only
 * surfaces (no hardcoded colors); props mirror the click-ui shape.
 */
const GAP: Record<string, string> = { xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-8' };
const ALIGN: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};
const JUSTIFY: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  'space-between': 'justify-between',
};

interface ContainerProps {
  children: ReactNode;
  orientation?: 'vertical' | 'horizontal';
  gap?: keyof typeof GAP;
  alignItems?: keyof typeof ALIGN;
  justifyContent?: keyof typeof JUSTIFY;
  className?: string;
  style?: CSSProperties;
}

export function Container({
  children,
  orientation = 'horizontal',
  gap,
  alignItems,
  justifyContent,
  className,
  style,
}: ContainerProps) {
  return (
    <div
      style={style}
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        gap && GAP[gap],
        alignItems && ALIGN[alignItems],
        justifyContent && JUSTIFY[justifyContent],
        className,
      )}
    >
      {children}
    </div>
  );
}

const PADDING: Record<string, string> = { sm: 'p-3', md: 'p-4', lg: 'p-6', xl: 'p-8' };
const RADII: Record<string, string> = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg' };

interface PanelProps {
  children: ReactNode;
  padding?: keyof typeof PADDING;
  radii?: keyof typeof RADII;
  hasBorder?: boolean;
  hasShadow?: boolean;
  /** Accepted for click-ui parity; surface always uses the panel token. */
  color?: string;
  className?: string;
}

export function Panel({ children, padding = 'md', radii = 'md', hasBorder, hasShadow, className }: PanelProps) {
  return (
    <div
      className={cn(
        'bg-(--cui-color-background-panel)',
        PADDING[padding],
        RADII[radii],
        hasBorder && 'border border-(--cui-color-stroke-default)',
        hasShadow && 'shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Separator({ className }: { size?: string; className?: string }) {
  return <hr className={cn('w-full border-0 border-t border-(--cui-color-stroke-default)', className)} />;
}

const TITLE_SIZE: Record<string, string> = {
  h1: 'text-2xl font-semibold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
};

interface TitleProps {
  children: ReactNode;
  type?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function Title({ children, type = 'h1', className }: TitleProps) {
  const Tag = type;
  return <Tag className={cn(TITLE_SIZE[type], 'text-(--cui-color-text-default)', className)}>{children}</Tag>;
}
