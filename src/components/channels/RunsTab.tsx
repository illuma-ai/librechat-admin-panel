import { Badge } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { EmptyState, LoadingState } from '@/components/shared';
import { runsQueryOptions } from '@/server';
import { useLocalize } from '@/hooks';

type BadgeState = 'success' | 'danger' | 'warning' | 'neutral';

function runState(status: string): BadgeState {
  const value = status.toLowerCase();
  if (value === 'success' || value === 'completed' || value === 'ok') return 'success';
  if (value === 'failed' || value === 'error') return 'danger';
  if (value === 'running' || value === 'pending' || value === 'queued') return 'warning';
  return 'neutral';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function RunsTab() {
  const localize = useLocalize();
  const runsQuery = useQuery(runsQueryOptions(50));
  const runs: t.ChannelRun[] = runsQuery.data ?? [];

  if (runsQuery.isLoading) return <LoadingState />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2 pr-1">
      <div className="overflow-x-auto rounded-lg border border-(--cui-color-stroke-default)">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{localize('com_channels_tab_runs')}</caption>
          <thead>
            <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
              <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                {localize('com_channels_col_status')}
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                {localize('com_channels_col_source')}
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                {localize('com_channels_agent_id')}
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                {localize('com_channels_col_created')}
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-b border-(--cui-color-stroke-default) last:border-b-0"
              >
                <td className="px-4 py-2.5">
                  <Badge text={run.status} state={runState(run.status)} size="sm" />
                </td>
                <td className="px-4 py-2.5 text-(--cui-color-text-default)">{run.source ?? '—'}</td>
                <td className="px-4 py-2.5 text-(--cui-color-text-muted)">{run.agentId ?? '—'}</td>
                <td className="px-4 py-2.5 text-(--cui-color-text-muted)">
                  {formatDate(run.createdAt)}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState message={localize('com_channels_runs_empty')} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
