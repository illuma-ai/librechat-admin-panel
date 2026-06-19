import { Badge } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import { useLocalize } from '@/hooks';
import { EmptyState, LoadingState } from '@/components/shared';
import { traceDetailQueryOptions } from '@/server';
import { ObservationTree } from './ObservationTree';
import { formatCost, formatTime, formatTokens } from './format';

interface TraceDetailContentProps {
  tenant: string;
  traceId: string;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-(--cui-color-text-muted)">{label}</span>
      <span className="truncate text-sm text-(--cui-color-text-default)">{value}</span>
    </div>
  );
}

/** Trace header + rolled-up totals + observation tree. Shared by the drawer and the deep-link page. */
export function TraceDetailContent({ tenant, traceId }: TraceDetailContentProps) {
  const localize = useLocalize();
  const { data, isLoading } = useQuery(traceDetailQueryOptions(tenant, traceId));

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message={localize('com_traces_not_found_desc')} />;

  const { trace } = data;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-(--cui-color-text-default)">
            {trace.name || trace.id}
          </h2>
          {trace.tags.map((tag) => (
            <Badge key={tag} text={tag} state="neutral" size="sm" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label={localize('com_traces_col_time')} value={formatTime(trace.timestamp)} />
          <Field label={localize('com_traces_col_user')} value={trace.userId} />
          <Field label={localize('com_traces_session')} value={trace.sessionId} />
          <Field label={localize('com_traces_environment')} value={trace.environment} />
          <Field
            label={localize('com_traces_metric_observations')}
            value={formatTokens(data.observationCount)}
          />
          <Field
            label={localize('com_traces_metric_tokens')}
            value={formatTokens(data.totalTokens)}
          />
          <Field label={localize('com_traces_metric_cost')} value={formatCost(data.totalCost)} />
        </div>
      </div>

      <div className="rounded-lg border border-(--cui-color-stroke-default)">
        <div className="border-b border-(--cui-color-stroke-default) px-3 py-2 text-sm font-medium text-(--cui-color-text-default)">
          {localize('com_traces_observation_tree')}
        </div>
        <ObservationTree observations={data.observations} />
      </div>
    </div>
  );
}
