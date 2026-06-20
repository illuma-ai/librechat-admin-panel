import { Bot, CircleDot, Fan, ListTree, MoveHorizontal, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { typePalette } from './observationPalette';

interface TypeVisual {
  icon: LucideIcon;
  color: string;
  label: string;
}

/**
 * Observation type → icon + label, mirroring the reference's `ItemBadge` map:
 * TRACE = ListTree, GENERATION = Fan, SPAN = MoveHorizontal, EVENT = CircleDot,
 * TOOL = Wrench, AGENT = Bot. Colors come from the shared `observationPalette`
 * (single source of truth shared with the agent graph) — never hardcoded here.
 */
const TYPE_VISUALS: Record<string, TypeVisual> = {
  trace: { icon: ListTree, color: typePalette('trace').icon, label: 'Trace' },
  generation: { icon: Fan, color: typePalette('generation').icon, label: 'Generation' },
  span: { icon: MoveHorizontal, color: typePalette('span').icon, label: 'Span' },
  event: { icon: CircleDot, color: typePalette('event').icon, label: 'Event' },
  tool: { icon: Wrench, color: typePalette('tool').icon, label: 'Tool' },
  agent: { icon: Bot, color: typePalette('agent').icon, label: 'Agent' },
};

const DEFAULT_VISUAL = TYPE_VISUALS.span;

export function typeVisual(type: string, isRoot = false): TypeVisual {
  if (isRoot) return TYPE_VISUALS.trace;
  return TYPE_VISUALS[type] ?? DEFAULT_VISUAL;
}

/**
 * the reference `ItemBadge` — a bordered box (neutral border, page background) holding
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
