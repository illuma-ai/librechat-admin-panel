import type { CSSProperties } from 'react';
import {
  Plus,
  Check,
  X,
  Lock,
  User,
  Users,
  Upload,
  Download,
  Search,
  Trash2,
  Pencil,
  Info,
  Settings,
  House,
  Code,
  FileText,
  RefreshCw,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  ChartColumn,
  TriangleAlert,
  CircleHelp,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * Radix-free icon — a drop-in replacement for the click-ui `Icon` (same
 * `name` string + `size` token API), backed by lucide-react. Icons inherit the
 * current text color (no `color` prop), so they re-theme automatically through
 * the `--cui-color-*` text tokens. `ICON_MAP` is the single source mapping
 * click-ui icon names to lucide components; extend it as new names appear.
 */
type IconSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_PX: Record<IconSize, number> = { xs: 12, sm: 16, md: 20, lg: 24 };

const ICON_MAP: Record<string, LucideIcon> = {
  plus: Plus,
  check: Check,
  cross: X,
  lock: Lock,
  user: User,
  users: Users,
  upload: Upload,
  download: Download,
  search: Search,
  trash: Trash2,
  pencil: Pencil,
  information: Info,
  gear: Settings,
  settings: Settings,
  home: House,
  code: Code,
  document: FileText,
  refresh: RefreshCw,
  'loading-animated': Loader2,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'dots-horizontal': MoreHorizontal,
  'slide-out': LogOut,
  chat: MessageSquare,
  metrics: ChartColumn,
  warning: TriangleAlert,
  question: CircleHelp,
};

interface IconProps {
  name: string;
  size?: IconSize;
  className?: string;
  style?: CSSProperties;
  hidden?: boolean;
}

export function Icon({ name, size = 'sm', className, style, hidden }: IconProps) {
  const Glyph = ICON_MAP[name] ?? CircleHelp;
  const px = SIZE_PX[size];
  return (
    <Glyph
      width={px}
      height={px}
      style={hidden ? { display: 'none', ...style } : style}
      className={cn('shrink-0', name === 'loading-animated' && 'animate-spin', className)}
    />
  );
}
