import type * as t from '@/types';
import { useLocalize } from '@/hooks';

export function Header({ title, onSearchClick, children }: t.HeaderProps) {
  const localize = useLocalize();
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <header className="shrink-0 bg-(--ui-color-background-canvas)">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex shrink-0 flex-col">
          {title ? (
            <h1 className="text-lg leading-7 font-semibold text-(--ui-color-text-default)">{title}</h1>
          ) : (
            <div />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {children}
          <div id="header-actions-portal" className="contents" />
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label={localize('com_cmdk_label')}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-(--ui-color-background-default) px-3 py-1.5 text-sm text-(--ui-color-text-muted) transition-colors hover:text-(--ui-color-text-default)"
            >
              <span>{localize('com_ui_search')}</span>
              <kbd className="rounded bg-(--ui-color-background-secondary) px-1.5 py-0.5 text-xs font-medium text-(--ui-color-text-default)">
                {shortcut}
              </kbd>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
