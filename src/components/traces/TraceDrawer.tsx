import { useEffect } from 'react';
import { Flyout } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Expand, ExternalLink, X } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { traceDetailQueryOptions } from '@/server';
import { TraceDetailContent } from './TraceDetailContent';
import { TypeIcon } from './traceIcons';

interface TraceDrawerProps {
  tenant: string;
  traceId: string | null;
  onClose: () => void;
  /** Prev/next navigation across the current page's trace-id list (K/J). Hidden when absent. */
  onPrev?: () => void;
  onNext?: () => void;
}

/** Build the `/traces/$traceId?tenant=` path the "open in new tab" button opens. */
function tracePath(tenant: string, traceId: string): string {
  const search = new URLSearchParams({ tenant }).toString();
  return `/traces/${traceId}?${search}`;
}

/** Small keyboard-shortcut chip, mirroring Langfuse's `KeyboardShortcut`. */
function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="rounded-sm border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-1 font-mono text-[10px] leading-4 text-(--cui-color-text-muted)">
      {children}
    </kbd>
  );
}

/** Langfuse `DetailPageNav` button: outline, icon + visible shortcut chip, disabled when at an end. */
function NavButton({
  icon: Icon,
  shortcut,
  title,
  onClick,
}: {
  icon: typeof ArrowUp;
  shortcut: string;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex h-7 flex-row items-center gap-1.5 rounded-sm border border-(--cui-color-stroke-default) px-2 text-(--cui-color-text-default) transition-colors',
        onClick
          ? 'cursor-pointer hover:bg-(--cui-color-background-hover)'
          : 'cursor-not-allowed opacity-40',
      )}
    >
      <Icon className="size-4" />
      <ShortcutKey>{shortcut}</ShortcutKey>
    </button>
  );
}

/** Ghost icon button for the expand/external-link group. */
function ExpandButton({
  icon: Icon,
  title,
  onClick,
  className,
}: {
  icon: typeof Expand;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/**
 * Langfuse peek-drawer header (TablePeekView SheetHeader): a full-width thin bar —
 * ItemBadge + "name: id" title on the left; prev/next (K/J), open-in-tab, and close
 * on the right. Rendered edge-to-edge (not via Flyout.Header, which insets 24px).
 */
function DrawerHeader({
  tenant,
  traceId,
  onClose,
  onPrev,
  onNext,
}: {
  tenant: string;
  traceId: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { data } = useQuery({
    ...traceDetailQueryOptions(tenant, traceId),
    enabled: tenant.length > 0 && traceId.length > 0,
  });
  const name = data?.trace.name;
  const canNavigate = Boolean(onPrev || onNext);
  const path = tracePath(tenant, traceId);

  return (
    <div className="flex min-h-11 shrink-0 flex-row flex-nowrap items-center justify-between gap-2 border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-2 py-1">
      <div className="flex min-w-0 flex-row items-center gap-2">
        <TypeIcon type="trace" isRoot showLabel />
        <span className="truncate text-sm font-medium text-(--cui-color-text-default)">
          {name ? `${name}: ${traceId}` : traceId}
        </span>
      </div>
      <div className="flex shrink-0 flex-row items-center gap-2">
        {canNavigate ? (
          <div className="flex flex-row gap-1">
            <NavButton
              icon={ArrowUp}
              shortcut="K"
              title={localize('com_traces_nav_up')}
              onClick={onPrev}
            />
            <NavButton
              icon={ArrowDown}
              shortcut="J"
              title={localize('com_traces_nav_down')}
              onClick={onNext}
            />
          </div>
        ) : null}
        <div className="flex h-full flex-row items-center gap-1 border-l border-(--cui-color-stroke-default) pl-2">
          <ExpandButton
            icon={Expand}
            title={localize('com_traces_open_current_tab')}
            onClick={() =>
              navigate({ to: '/traces/$traceId', params: { traceId }, search: { tenant } })
            }
          />
          <ExpandButton
            icon={ExternalLink}
            title={localize('com_traces_open_new_tab')}
            onClick={() => window.open(path, '_blank', 'noopener,noreferrer')}
          />
        </div>
        <ExpandButton icon={X} title={localize('com_traces_close')} onClick={onClose} />
      </div>
    </div>
  );
}

/** Right-side drawer showing a trace's detail + observation tree (Langfuse peek view). */
export function TraceDrawer({ tenant, traceId, onClose, onPrev, onNext }: TraceDrawerProps) {
  // Langfuse DetailPageNav: lowercase k/j navigate prev/next unless typing in a field.
  useEffect(() => {
    if (!traceId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.getAttribute('role') === 'textbox');
      if (typing || event.metaKey || event.ctrlKey) return;
      if (event.key === 'k' && onPrev) onPrev();
      else if (event.key === 'j' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [traceId, onPrev, onNext]);

  return (
    <Flyout
      open={Boolean(traceId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Langfuse peek keeps the drawer open during resize/drag: it closes only via
          the X button or Escape, never on an outside pointer-down (which a panel-resize
          pointer-capture can otherwise trigger). closeOnInteractOutside={false}. */}
      <Flyout.Content
        strategy="fixed"
        width="min(60vw, 96vw)"
        closeOnInteractOutside={false}
        showOverlay
      >
        {/* Header lives INSIDE Flyout.Body (which has no horizontal padding and keeps
            the 60vw width), not Flyout.Header (which insets 24px). Langfuse's peek
            header is an edge-to-edge bar. */}
        <Flyout.Body>
          <div className="flex h-full min-h-0 w-full flex-col">
            {traceId ? (
              <>
                <DrawerHeader
                  tenant={tenant}
                  traceId={traceId}
                  onClose={onClose}
                  onPrev={onPrev}
                  onNext={onNext}
                />
                <div className="flex min-h-0 flex-1 flex-col">
                  <TraceDetailContent tenant={tenant} traceId={traceId} />
                </div>
              </>
            ) : null}
          </div>
        </Flyout.Body>
      </Flyout.Content>
    </Flyout>
  );
}
