import { useState } from 'react';
import { Flyout } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Expand, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { traceDetailQueryOptions } from '@/server';
import { TraceDetailContent } from './TraceDetailContent';
import { TypeIcon } from './traceIcons';

interface TraceDrawerProps {
  tenant: string;
  traceId: string | null;
  onClose: () => void;
  /** Prev/next navigation across the current page's trace-id list (K/J). Disabled when absent. */
  onPrev?: () => void;
  onNext?: () => void;
}

/** Build the `/traces/$traceId?tenant=` path the expand buttons open. */
function tracePath(tenant: string, traceId: string): string {
  const search = new URLSearchParams({ tenant }).toString();
  return `/traces/${traceId}?${search}`;
}

interface HeaderButtonProps {
  icon: typeof Expand;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}

function HeaderButton({ icon: Icon, title, onClick, disabled }: HeaderButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-sm text-(--cui-color-text-muted)',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)',
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Langfuse peek-drawer chrome: ItemBadge + "name: id" title, prev/next, expand, fullscreen, close. */
function DrawerHeader({
  tenant,
  traceId,
  fullscreen,
  onToggleFullscreen,
  onPrev,
  onNext,
}: {
  tenant: string;
  traceId: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
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
  const shortId = traceId.slice(0, 8);
  const path = tracePath(tenant, traceId);

  return (
    <div className="flex min-h-11 flex-row flex-nowrap items-center justify-between gap-2 border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-2 py-1">
      <div className="flex min-w-0 flex-row items-center gap-2">
        <TypeIcon type="trace" isRoot showLabel />
        <span className="truncate text-sm font-medium text-(--cui-color-text-default)">
          {name ? `${name}: ${shortId}` : shortId}
        </span>
      </div>
      <div className="mr-8 flex shrink-0 flex-row items-center gap-1">
        <HeaderButton
          icon={ArrowUp}
          title={`${localize('com_traces_nav_up')} (K)`}
          onClick={onPrev}
          disabled={!onPrev}
        />
        <HeaderButton
          icon={ArrowDown}
          title={`${localize('com_traces_nav_down')} (J)`}
          onClick={onNext}
          disabled={!onNext}
        />
        <span className="mx-1 h-5 w-px bg-(--cui-color-stroke-default)" />
        <HeaderButton
          icon={Expand}
          title={localize('com_traces_open_current_tab')}
          onClick={() =>
            navigate({ to: '/traces/$traceId', params: { traceId }, search: { tenant } })
          }
        />
        <HeaderButton
          icon={ExternalLink}
          title={localize('com_traces_open_new_tab')}
          onClick={() => window.open(path, '_blank', 'noopener,noreferrer')}
        />
        <HeaderButton
          icon={fullscreen ? Minimize2 : Maximize2}
          title={
            fullscreen ? localize('com_traces_exit_fullscreen') : localize('com_traces_fullscreen')
          }
          onClick={onToggleFullscreen}
        />
      </div>
    </div>
  );
}

/** Right-side drawer showing a trace's detail + observation tree (Langfuse-style). */
export function TraceDrawer({ tenant, traceId, onClose, onPrev, onNext }: TraceDrawerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <Flyout
      open={Boolean(traceId)}
      onOpenChange={(open) => {
        if (!open) {
          setFullscreen(false);
          onClose();
        }
      }}
    >
      <Flyout.Content
        strategy="fixed"
        width={fullscreen ? '100vw' : 'min(1180px, 96vw)'}
        closeOnInteractOutside
        showOverlay
      >
        {traceId ? (
          <Flyout.Header showClose showSeparator={false}>
            <DrawerHeader
              tenant={tenant}
              traceId={traceId}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              onPrev={onPrev}
              onNext={onNext}
            />
          </Flyout.Header>
        ) : null}
        <Flyout.Body>
          <div className="flex h-full min-h-0 flex-col">
            {traceId ? <TraceDetailContent tenant={tenant} traceId={traceId} /> : null}
          </div>
        </Flyout.Body>
      </Flyout.Content>
    </Flyout>
  );
}
