import { createFileRoute } from '@tanstack/react-router';
import { TraceDetailPage } from '@/components/traces';

interface TraceDetailSearch {
  tenant: string;
}

export const Route = createFileRoute('/_app/traces/$traceId')({
  validateSearch: (search: Record<string, unknown>): TraceDetailSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
  }),
  component: TraceDetailRoute,
});

function TraceDetailRoute() {
  const { traceId } = Route.useParams();
  const { tenant } = Route.useSearch();
  return <TraceDetailPage tenant={tenant} traceId={traceId} />;
}
