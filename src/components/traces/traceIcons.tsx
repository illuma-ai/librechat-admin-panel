import {
  Bot,
  Hammer,
  InspectionPanel,
  Link,
  MessageCircle,
  Settings,
  User,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as t from '@/types';

interface TypeVisual {
  icon: LucideIcon;
  bg: string;
  color: string;
  label: string;
}

/**
 * Observation type → colored icon, mirroring Opik's `BaseTraceDataTypeIcon`
 * (trace=purple, llm/generation=blue, tool=burgundy, general span=green).
 */
const TYPE_VISUALS: Record<string, TypeVisual> = {
  trace: {
    icon: InspectionPanel,
    bg: 'var(--tag-purple-bg)',
    color: 'var(--tag-purple-text)',
    label: 'Trace',
  },
  generation: {
    icon: MessageCircle,
    bg: 'var(--tag-blue-bg)',
    color: 'var(--tag-blue-text)',
    label: 'LLM',
  },
  tool: {
    icon: Hammer,
    bg: 'var(--tag-burgundy-bg)',
    color: 'var(--tag-burgundy-text)',
    label: 'Tool',
  },
  span: { icon: Link, bg: 'var(--tag-green-bg)', color: 'var(--tag-green-text)', label: 'Span' },
};

const DEFAULT_VISUAL = TYPE_VISUALS.span;

export function typeVisual(type: string, isRoot = false): TypeVisual {
  if (isRoot) return TYPE_VISUALS.trace;
  return TYPE_VISUALS[type] ?? DEFAULT_VISUAL;
}

/** A small colored rounded-square icon for an observation type (Opik style). */
export function TypeIcon({
  type,
  isRoot,
  size = 5,
}: {
  type: string;
  isRoot?: boolean;
  size?: 5 | 6;
}) {
  const visual = typeVisual(type, isRoot);
  const Icon = visual.icon;
  return (
    <span
      title={visual.label}
      className={`relative flex ${size === 6 ? 'size-6' : 'size-5'} shrink-0 items-center justify-center rounded-md`}
      style={{ background: visual.bg, color: visual.color }}
    >
      <Icon className="size-3" />
    </span>
  );
}

interface RoleVisual {
  icon: LucideIcon;
  bg: string;
  color: string;
  label: string;
}

/** Message role → icon + color, mirroring Opik's `ROLE_CONFIG`. */
const ROLE_VISUALS: Record<t.TraceMessage['role'], RoleVisual> = {
  user: {
    icon: User,
    bg: 'var(--tag-turquoise-bg)',
    color: 'var(--tag-turquoise-text)',
    label: 'User',
  },
  assistant: {
    icon: Bot,
    bg: 'var(--tag-yellow-bg)',
    color: 'var(--tag-yellow-text)',
    label: 'Assistant',
  },
  system: {
    icon: Settings,
    bg: 'var(--tag-blue-bg)',
    color: 'var(--tag-blue-text)',
    label: 'System',
  },
  tool: {
    icon: Wrench,
    bg: 'var(--tag-burgundy-bg)',
    color: 'var(--tag-burgundy-text)',
    label: 'Tool',
  },
  unknown: {
    icon: MessageCircle,
    bg: 'var(--tag-green-bg)',
    color: 'var(--tag-green-text)',
    label: 'Message',
  },
};

export function roleVisual(role: t.TraceMessage['role']): RoleVisual {
  return ROLE_VISUALS[role] ?? ROLE_VISUALS.unknown;
}
