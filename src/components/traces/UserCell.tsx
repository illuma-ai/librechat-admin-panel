import type { TUser } from 'librechat-data-provider';
import { Avatar } from '@/components/shared';

interface UserCellProps {
  user?: TUser;
  fallback: string;
}

/**
 * Resolve a trace's `user_id` to the real LibreChat user — avatar image when the
 * user has one, otherwise initials — plus name/email. Falls back to the raw id
 * for users not found (e.g. system or external producers).
 */
export function UserCell({ user, fallback }: UserCellProps) {
  if (!user) {
    return <span className="text-(--cui-color-text-muted)">{fallback || '—'}</span>;
  }
  const display = user.name || user.email || fallback;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={display}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <Avatar name={display} size="sm" />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-(--cui-color-text-default)">{display}</span>
        {user.name && user.email ? (
          <span className="truncate text-xs text-(--cui-color-text-muted)">{user.email}</span>
        ) : null}
      </span>
    </span>
  );
}
