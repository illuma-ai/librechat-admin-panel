import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import type { OrderBy, SortDirection } from '@/components/traces';
import { TracesPage } from '@/components/traces';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const DEFAULT_PAGE_SIZE = 50;
const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface TracesSearch {
  tenant: string;
  q: string;
  range: t.TraceRange;
  page: number;
  /** Optional in navigation (defaults to DEFAULT_PAGE_SIZE); always set by validateSearch. */
  size?: number;
  trace: string;
  env: string[];
  name: string[];
  user: string[];
  tags: string[];
  /** Sort encoded as "<column>.<dir>" (e.g. "timestamp.desc"); optional. */
  sort?: string;
}

const SORT_DIRS: SortDirection[] = ['asc', 'desc'];
const DEFAULT_ORDER_BY: OrderBy = { id: 'timestamp', dir: 'desc' };

/** Parse a "<column>.<dir>" sort param into an OrderBy, or the default when absent/invalid. */
function parseSort(value: unknown): OrderBy {
  if (typeof value !== 'string' || !value.includes('.')) return DEFAULT_ORDER_BY;
  const lastDot = value.lastIndexOf('.');
  const id = value.slice(0, lastDot);
  const dir = value.slice(lastDot + 1);
  if (!id || !SORT_DIRS.includes(dir as SortDirection)) return DEFAULT_ORDER_BY;
  return { id, dir: dir as SortDirection };
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

function parsePageSize(value: unknown): number {
  const n = Number(value);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

function parseStrArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value) return value.split(',').filter(Boolean);
  return [];
}

export const Route = createFileRoute('/_app/traces/')({
  validateSearch: (search: Record<string, unknown>): TracesSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
    size: parsePageSize(search.size),
    trace: typeof search.trace === 'string' ? search.trace : '',
    env: parseStrArray(search.env),
    name: parseStrArray(search.name),
    user: parseStrArray(search.user),
    tags: parseStrArray(search.tags),
    sort: typeof search.sort === 'string' ? search.sort : undefined,
  }),
  component: TracesRoute,
});

function TracesRoute() {
  const { tenant, q, range, page, size, trace, env, name, user, tags, sort } = Route.useSearch();
  const navigate = useNavigate({ from: '/traces/' });
  const orderBy = parseSort(sort);

  return (
    <TracesPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={size ?? DEFAULT_PAGE_SIZE}
      selectedTraceId={trace || null}
      filters={{ environment: env, name, userId: user, tags }}
      orderBy={orderBy}
      onSort={(key) => {
        const dir: SortDirection =
          orderBy.id === key && orderBy.dir === 'desc' ? 'asc' : 'desc';
        navigate({ search: (prev) => ({ ...prev, sort: `${key}.${dir}`, page: 1 }) });
      }}
      onTenant={(value) =>
        navigate({
          search: {
            tenant: value,
            q: '',
            range,
            page: 1,
            trace: '',
            env: [],
            name: [],
            user: [],
            tags: [],
          },
        })
      }
      onSearch={(value) => navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value, page: 1 }) })}
      onPage={(value) => navigate({ search: (prev) => ({ ...prev, page: value }) })}
      onPageSize={(value) => navigate({ search: (prev) => ({ ...prev, size: value, page: 1 }) })}
      onOpenTrace={(value) => navigate({ search: (prev) => ({ ...prev, trace: value }) })}
      onCloseTrace={() => navigate({ search: (prev) => ({ ...prev, trace: '' }) })}
      onFilters={(patch) =>
        navigate({
          search: (prev) => ({
            ...prev,
            env: patch.environment ?? prev.env,
            name: patch.name ?? prev.name,
            user: patch.userId ?? prev.user,
            tags: patch.tags ?? prev.tags,
            page: 1,
          }),
        })
      }
    />
  );
}
