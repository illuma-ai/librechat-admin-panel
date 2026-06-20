import { Flyout } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import { useLocalize } from '@/hooks';
import { traceDetailQueryOptions } from '@/server';
import { TraceDetailContent } from './TraceDetailContent';

interface TraceDrawerProps {
  tenant: string;
  traceId: string | null;
  onClose: () => void;
}

/** Langfuse-style header: "Trace · <name>: <id>" (falls back to the id). */
function useDrawerTitle(tenant: string, traceId: string | null, fallback: string): string {
  const { data } = useQuery({
    ...traceDetailQueryOptions(tenant, traceId ?? ''),
    enabled: tenant.length > 0 && Boolean(traceId),
  });
  if (!traceId) return fallback;
  const name = data?.trace.name;
  const shortId = traceId.slice(0, 8);
  if (name) return `${fallback} · ${name}: ${shortId}`;
  return `${fallback} · ${shortId}`;
}

/** Right-side drawer showing a trace's detail + observation tree (Langfuse-style). */
export function TraceDrawer({ tenant, traceId, onClose }: TraceDrawerProps) {
  const localize = useLocalize();
  const title = useDrawerTitle(tenant, traceId, localize('com_traces_trace'));

  return (
    <Flyout
      open={Boolean(traceId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Flyout.Content strategy="fixed" width="min(1180px, 96vw)" closeOnInteractOutside showOverlay>
        <Flyout.Header title={title} showClose />
        <Flyout.Body>
          <div className="flex h-full min-h-0 flex-col">
            {traceId ? <TraceDetailContent tenant={tenant} traceId={traceId} /> : null}
          </div>
        </Flyout.Body>
      </Flyout.Content>
    </Flyout>
  );
}
