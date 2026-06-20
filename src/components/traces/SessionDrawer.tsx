import { Flyout } from '@clickhouse/click-ui';
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
    <Flyout
      open={Boolean(sessionId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Flyout.Content strategy="fixed" width="min(1180px, 96vw)" closeOnInteractOutside showOverlay>
        <Flyout.Header title={title} showClose />
        <Flyout.Body>
          <div className="flex h-full min-h-0 flex-col">
            {sessionId ? (
              <SessionDetailContent
                tenant={tenant}
                sessionId={sessionId}
                onOpenTrace={onOpenTrace}
              />
            ) : null}
          </div>
        </Flyout.Body>
      </Flyout.Content>
    </Flyout>
  );
}
