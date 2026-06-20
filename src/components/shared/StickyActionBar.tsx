import { Button } from '@admin/ui';
import type * as t from '@/types';

export function StickyActionBar({
  discardLabel,
  saveLabel,
  onDiscard,
  onSave,
  message,
}: t.StickyActionBarProps) {
  return (
    <div className="flex shrink-0 animate-[slideUp_200ms_ease-out] items-center gap-2 border-t border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-6 py-3">
      {message && (
        <span className="flex-1 text-sm font-medium text-(--ui-color-text-default)">
          {message}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button type="secondary" label={discardLabel} onClick={onDiscard} />
        <Button type="primary" label={saveLabel} onClick={onSave} />
      </div>
    </div>
  );
}
