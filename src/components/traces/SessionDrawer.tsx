import { Drawer } from '@admin/ui';
import { X } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { SessionDetailContent } from './SessionDetailContent';

interface SessionDrawerProps {
  tenant: string;
  sessionId: string | null;
  onClose: () => void;
  /** Open one of the session's traces (the list routes to the traces view). */
  onOpenTrace?: (traceId: string) => void;
}

/** Right-side drawer showing a session's metrics header + its traces (reference-style). */
export function SessionDrawer({ tenant, sessionId, onClose, onOpenTrace }: SessionDrawerProps) {
  const localize = useLocalize();
  const title = sessionId
    ? `${localize('com_traces_session')} · ${sessionId.slice(0, 12)}`
    : localize('com_traces_session');

  return (
    <Drawer
      open={Boolean(sessionId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Content width="min(1180px, 96vw)" dismissable title={title}>
        <Drawer.Body className="h-full">
          <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-(--ui-color-stroke-default) bg-(--ui-color-background-muted) px-3 py-1">
            <span className="truncate text-sm font-medium text-(--ui-color-text-default)">
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              title={localize('com_traces_close')}
              aria-label={localize('com_traces_close')}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--ui-color-text-muted) hover:bg-(--ui-color-background-hover) hover:text-(--ui-color-text-default)"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {sessionId ? (
              <SessionDetailContent
                tenant={tenant}
                sessionId={sessionId}
                onOpenTrace={onOpenTrace}
              />
            ) : null}
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
}
