import { ChevronLeft } from 'lucide-react';
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
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="px-6 pt-5 pb-3">
        <Link
          to="/traces"
          search={{
            tenant,
            q: '',
            range: 'all',
            page: 1,
            trace: '',
            env: [],
            type: [],
            level: [],
            name: [],
            user: [],
            tags: [],
          }}
          className="inline-flex w-fit items-center gap-1 text-sm text-(--ui-color-text-muted) no-underline hover:text-(--ui-color-text-default)"
        >
          <ChevronLeft className="size-4" />
          {localize('com_traces_back')}
        </Link>
      </div>
      <div className="mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-(--ui-color-stroke-default)">
        <TraceDetailContent tenant={tenant} traceId={traceId} />
      </div>
    </div>
  );
}
