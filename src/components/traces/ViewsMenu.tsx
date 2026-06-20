import { useState } from 'react';
import { Popover } from '@admin/ui';
import { ChevronDown, Trash2, Check } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { useSavedViews } from './useSavedViews';

interface ViewsMenuProps {
  /** Per-table storage namespace (e.g. "traces" / "observations" / "sessions"). */
  tableKey: string;
  /** The current filter/sort slice of the route search to snapshot when saving. */
  current: Record<string, unknown>;
  /** Apply a saved view's state back onto the route. */
  onApply: (state: Record<string, unknown>) => void;
}

/**
 * Saved-views control (mirrors the reference's "Views" dropdown): a count-badged
 * trigger opening a popover that lists saved views (click to apply, trash to
 * delete) and a "Save current view" inline name input. Persisted per table via
 * `useSavedViews` (localStorage).
 */
export function ViewsMenu({ tableKey, current, onApply }: ViewsMenuProps) {
  const localize = useLocalize();
  const { views, saveView, deleteView } = useSavedViews(tableKey);
  const [name, setName] = useState('');

  const commitSave = () => {
    if (!name.trim()) return;
    saveView(name, current);
    setName('');
  };

  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={localize('com_traces_views')}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-(--ui-color-stroke-default) px-2 text-sm text-(--ui-color-text-default) hover:bg-(--ui-color-background-muted)"
        >
          <span>{localize('com_traces_views')}</span>
          <span className="rounded-full bg-(--ui-color-background-muted) px-1.5 text-xs">
            {views.length}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Content align="start">
        <div className="flex w-64 flex-col gap-2 p-2">
          <span className="px-1 text-xs font-semibold text-(--ui-color-text-muted)">
            {localize('com_traces_saved_views')}
          </span>

          {views.length === 0 ? (
            <span className="px-1 py-1 text-xs text-(--ui-color-text-muted)">
              {localize('com_traces_no_saved_views')}
            </span>
          ) : (
            <div className="flex flex-col">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between gap-1 rounded-sm px-1 py-1 hover:bg-(--ui-color-background-muted)"
                >
                  <button
                    type="button"
                    onClick={() => onApply(view.state)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left text-sm text-(--ui-color-text-default)"
                  >
                    <Check className="size-3.5 shrink-0 opacity-0" />
                    <span className="truncate">{view.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteView(view.id)}
                    aria-label={localize('com_traces_delete_view')}
                    title={localize('com_traces_delete_view')}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--ui-color-text-muted) hover:bg-(--ui-color-background-hover) hover:text-(--ui-color-accent-danger)"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 border-t border-(--ui-color-stroke-default) pt-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSave();
              }}
              placeholder={localize('com_traces_view_name_placeholder')}
              className="h-7 min-w-0 flex-1 rounded-sm border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2 text-xs text-(--ui-color-text-default) outline-none placeholder:text-(--ui-color-text-muted) focus-visible:border-(--ui-color-accent)"
            />
            <button
              type="button"
              onClick={commitSave}
              disabled={!name.trim()}
              className={cn(
                'h-7 shrink-0 rounded-sm px-2 text-xs font-medium text-(--ui-color-text-on-accent)',
                name.trim()
                  ? 'cursor-pointer bg-(--ui-color-accent) hover:bg-(--ui-color-accent-hover)'
                  : 'cursor-not-allowed bg-(--ui-color-background-muted) text-(--ui-color-text-muted)',
              )}
            >
              {localize('com_traces_save_view')}
            </button>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
