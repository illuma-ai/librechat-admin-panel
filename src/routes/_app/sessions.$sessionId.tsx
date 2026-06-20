import { Icon } from '@admin/ui';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLocalize } from '@/hooks';
import { SessionDetailContent } from '@/components/traces/SessionDetailContent';

interface SessionDetailSearch {
  tenant: string;
}

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  validateSearch: (search: Record<string, unknown>): SessionDetailSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
  }),
  component: SessionDetailRoute,
});

/** Full-page deep link for a session (e.g. shared URL). The list uses the drawer. */
function SessionDetailRoute() {
  const { sessionId } = Route.useParams();
  const { tenant } = Route.useSearch();
  const localize = useLocalize();
  const navigate = useNavigate();

  return (
    <div
      role="region"
      aria-label={localize('com_traces_session')}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="px-6 pt-5 pb-3">
        <Link
          to="/sessions"
          search={{ tenant, q: '', range: 'all', page: 1, session: '', env: [], user: [] }}
          className="inline-flex w-fit items-center gap-1 text-sm text-(--ui-color-text-muted) no-underline hover:text-(--ui-color-text-default)"
        >
          <Icon name="chevron-left" size="sm" />
          {localize('com_traces_back')}
        </Link>
      </div>
      <div className="mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-(--ui-color-stroke-default)">
        <SessionDetailContent
          tenant={tenant}
          sessionId={sessionId}
          onOpenTrace={(traceId) =>
            navigate({
              to: '/traces',
              search: {
                tenant,
                q: '',
                range: 'all',
                page: 1,
                trace: traceId,
                env: [],
                type: [],
                level: [],
                name: [],
                user: [],
                tags: [],
              },
            })
          }
        />
      </div>
    </div>
  );
}
