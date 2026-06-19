import { Icon } from '@clickhouse/click-ui';
import { Link } from '@tanstack/react-router';
import { useLocalize } from '@/hooks';
import { TraceDetailContent } from './TraceDetailContent';

interface TraceDetailPageProps {
  tenant: string;
  traceId: string;
}

/** Full-page deep link for a trace (e.g. shared URL). The list uses the drawer. */
export function TraceDetailPage({ tenant, traceId }: TraceDetailPageProps) {
  const localize = useLocalize();
  return (
    <div
      role="region"
      aria-label={localize('com_traces_detail')}
      className="flex flex-1 flex-col gap-5 overflow-auto p-6"
    >
      <Link
        to="/traces"
        search={{ tenant, q: '', range: 'all', page: 1, trace: '' }}
        className="inline-flex w-fit items-center gap-1 text-sm text-(--cui-color-text-muted) no-underline hover:text-(--cui-color-text-default)"
      >
        <Icon name="chevron-left" size="sm" />
        {localize('com_traces_back')}
      </Link>
      <TraceDetailContent tenant={tenant} traceId={traceId} />
    </div>
  );
}
