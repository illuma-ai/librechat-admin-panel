import { Flyout } from '@clickhouse/click-ui';
import { useLocalize } from '@/hooks';
import { TraceDetailContent } from './TraceDetailContent';

interface TraceDrawerProps {
  tenant: string;
  traceId: string | null;
  onClose: () => void;
}

/** Right-side drawer showing a trace's detail + observation tree (Langfuse-style, ranger-admin UX). */
export function TraceDrawer({ tenant, traceId, onClose }: TraceDrawerProps) {
  const localize = useLocalize();

  return (
    <Flyout
      open={Boolean(traceId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Flyout.Content strategy="fixed" width="min(760px, 92vw)" closeOnInteractOutside showOverlay>
        <Flyout.Header title={localize('com_traces_detail')} showClose showSeparator />
        <Flyout.Body>
          {traceId ? <TraceDetailContent tenant={tenant} traceId={traceId} /> : null}
        </Flyout.Body>
      </Flyout.Content>
    </Flyout>
  );
}
