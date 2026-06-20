import { Icon } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { Avatar } from './Avatar';
import { cn } from '@/utils';

export function SelectedMemberList({ users, onRemove, disabled }: t.SelectedMemberListProps) {
  const localize = useLocalize();

  if (users.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-(--ui-color-text-muted)">
        {localize('com_access_no_members')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="max-h-48 overflow-auto rounded-lg border border-(--ui-color-stroke-default)">
        {users.map((user, i) => (
          <div
            key={user.id}
            className={cn(
              'flex items-center justify-between px-3 py-2',
              i < users.length - 1 && 'border-b border-(--ui-color-stroke-default)',
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-(--ui-color-text-default)">
                  {user.name}
                </span>
                <span className="text-xs text-(--ui-color-text-muted)">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(user.id)}
              disabled={disabled}
              aria-label={localize('com_ui_remove_item', { name: user.name })}
              className="trash-btn"
            >
              <Icon name="cross" size="sm" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
