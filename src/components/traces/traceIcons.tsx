import { Bot, CircleDot, Fan, ListTree, MoveHorizontal, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TypeVisual {
  icon: LucideIcon;
  color: string;
  label: string;
}

/**
 * Observation type → icon + color, mirroring Langfuse's `ItemBadge` map:
 * TRACE = ListTree/dark-green, GENERATION = Fan/magenta, SPAN = MoveHorizontal/blue,
 * EVENT = CircleDot/green, TOOL = Wrench/orange, AGENT = Bot/purple.
 */
const TYPE_VISUALS: Record<string, TypeVisual> = {
  trace: { icon: ListTree, color: '#15803d', label: 'Trace' },
  generation: { icon: Fan, color: '#be185d', label: 'Generation' },
  span: { icon: MoveHorizontal, color: '#2563eb', label: 'Span' },
  event: { icon: CircleDot, color: '#16a34a', label: 'Event' },
  tool: { icon: Wrench, color: '#ea580c', label: 'Tool' },
  agent: { icon: Bot, color: '#9333ea', label: 'Agent' },
};

const DEFAULT_VISUAL = TYPE_VISUALS.span;

export function typeVisual(type: string, isRoot = false): TypeVisual {
  if (isRoot) return TYPE_VISUALS.trace;
  return TYPE_VISUALS[type] ?? DEFAULT_VISUAL;
}

/**
 * Langfuse `ItemBadge` — a bordered box (neutral border, page background) holding
 * a colored type icon. `isSmall` renders the compact tree variant (icon only).
 */
export function TypeIcon({
  type,
  isRoot,
  isSmall,
  showLabel,
}: {
  type: string;
  isRoot?: boolean;
  isSmall?: boolean;
  showLabel?: boolean;
}) {
  const visual = typeVisual(type, isRoot);
  const Icon = visual.icon;
  return (
    <span
      title={visual.label}
      className={`flex max-w-fit shrink-0 items-center gap-1 rounded-sm border-2 border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-1 ${
        isSmall ? 'h-4' : 'h-5'
      }`}
    >
      <Icon
        className={isSmall ? 'size-3 shrink-0' : 'size-3.5 shrink-0'}
        style={{ color: visual.color }}
      />
      {showLabel ? (
        <span className="truncate text-xs text-(--cui-color-text-default)">{visual.label}</span>
      ) : null}
    </span>
  );
}
