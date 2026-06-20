import type { TUser } from 'librechat-data-provider';
import { getInitials } from '@/utils';

interface UserCellProps {
  user?: TUser;
  fallback: string;
}

/**
 * Resolve a trace's `user_id` to the real user — a circular avatar (photo or
 * initials) plus name/email. The avatar is a fixed-size circle that never
 * distorts (object-cover on images, centered initials otherwise). Falls back to
 * the raw id for users not found (system/external producers).
 */
export function UserCell({ user, fallback }: UserCellProps) {
  if (!user) {
    return <span className="text-(--ui-color-text-muted)">{fallback || '—'}</span>;
  }
  const display = user.name || user.email || fallback;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-(--ui-color-background-accent-muted) text-[11px] font-semibold text-(--ui-color-text-default)">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={display}
            className="size-full rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          getInitials(display)
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-(--ui-color-text-default)">{display}</span>
        {user.name && user.email ? (
          <span className="truncate text-xs text-(--ui-color-text-muted)">{user.email}</span>
        ) : null}
      </span>
    </span>
  );
}
