import { useState } from 'react';
import { Button, TextField, Badge, CodeBlock } from '@clickhouse/click-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { EmptyState, LoadingState } from '@/components/shared';
import { ConfirmDialog } from '@/components/access';
import {
  channelsQueryOptions,
  detachChannelFn,
  enableEmailFn,
  enableWebhookFn,
  registerTeamsFn,
} from '@/server';
import { useLocalize } from '@/hooks';

type EnableResult = { kind: t.ChannelType; message: string } | null;

const BADGE_STATE: Record<t.ChannelType, 'info' | 'success' | 'neutral'> = {
  email: 'info',
  teams: 'success',
  webhook: 'neutral',
};

export function ChannelsTab() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [agentInput, setAgentInput] = useState('');
  const [lookupAgentId, setLookupAgentId] = useState('');
  const [result, setResult] = useState<EnableResult>(null);
  const [detachTarget, setDetachTarget] = useState<t.AgentChannel | null>(null);

  const channelsQuery = useQuery(channelsQueryOptions(lookupAgentId));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['channels', lookupAgentId] });

  const enableWebhook = useMutation({
    mutationFn: () => enableWebhookFn({ data: { agentId: agentInput } }),
    onSuccess: (data) => {
      setResult({
        kind: 'webhook',
        message: data.channel.url ?? localize('com_channels_enabled'),
      });
      if (agentInput === lookupAgentId) invalidate();
    },
    onError: (e: Error) => setResult({ kind: 'webhook', message: e.message }),
  });

  const enableEmail = useMutation({
    mutationFn: () => enableEmailFn({ data: { agentId: agentInput } }),
    onSuccess: (data) => {
      setResult({
        kind: 'email',
        message: data.channel.address ?? localize('com_channels_enabled'),
      });
      if (agentInput === lookupAgentId) invalidate();
    },
    onError: (e: Error) => setResult({ kind: 'email', message: e.message }),
  });

  const registerTeams = useMutation({
    mutationFn: () => registerTeamsFn({ data: { agentId: agentInput } }),
    onSuccess: () => {
      setResult({ kind: 'teams', message: localize('com_channels_enabled') });
      if (agentInput === lookupAgentId) invalidate();
    },
    onError: (e: Error) => setResult({ kind: 'teams', message: e.message }),
  });

  const detach = useMutation({
    mutationFn: (id: string) => detachChannelFn({ data: { id } }),
    onSuccess: () => {
      setDetachTarget(null);
      invalidate();
    },
  });

  const busy = enableWebhook.isPending || enableEmail.isPending || registerTeams.isPending;
  const channels = channelsQuery.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto py-2 pr-1">
      <div className="flex flex-col gap-3 rounded-lg border border-(--cui-color-stroke-default) p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <TextField
              label={localize('com_channels_agent_id')}
              placeholder={localize('com_channels_agent_id_placeholder')}
              value={agentInput}
              onChange={(value) => setAgentInput(value)}
            />
          </div>
          <Button
            label={localize('com_channels_enable_webhook')}
            type="primary"
            disabled={!agentInput || busy}
            onClick={() => enableWebhook.mutate()}
          />
          <Button
            label={localize('com_channels_enable_email')}
            type="secondary"
            disabled={!agentInput || busy}
            onClick={() => enableEmail.mutate()}
          />
          <Button
            label={localize('com_channels_register_teams')}
            type="secondary"
            disabled={!agentInput || busy}
            onClick={() => registerTeams.mutate()}
          />
        </div>

        {result && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-(--cui-color-text-muted)">
              {localize('com_channels_result')}
            </span>
            <CodeBlock language="text">{result.message}</CodeBlock>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <TextField
            label={localize('com_channels_lookup')}
            placeholder={localize('com_channels_agent_id_placeholder')}
            value={lookupAgentId}
            onChange={(value) => setLookupAgentId(value)}
          />
        </div>
      </div>

      {lookupAgentId && channelsQuery.isLoading && <LoadingState />}

      {lookupAgentId && !channelsQuery.isLoading && (
        <div className="overflow-x-auto rounded-lg border border-(--cui-color-stroke-default)">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{localize('com_nav_channels')}</caption>
            <thead>
              <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_type')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_target')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr
                  key={channel.id}
                  className="border-b border-(--cui-color-stroke-default) last:border-b-0"
                >
                  <td className="px-4 py-2.5">
                    <Badge text={channel.type} state={BADGE_STATE[channel.type]} size="sm" />
                  </td>
                  <td className="px-4 py-2.5 text-(--cui-color-text-default)">
                    {channel.address ?? channel.url ?? channel.id}
                  </td>
                  <td className="px-4 py-2.5">
                    <Button
                      label={localize('com_channels_detach')}
                      type="secondary"
                      onClick={() => setDetachTarget(channel)}
                    />
                  </td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState message={localize('com_channels_empty')} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={detachTarget !== null}
        title={localize('com_channels_detach_title')}
        description={localize('com_channels_detach_desc')}
        confirmLabel={localize('com_channels_detach')}
        saving={detach.isPending}
        error={detach.error instanceof Error ? detach.error.message : undefined}
        onConfirm={() => detachTarget && detach.mutate(detachTarget.id)}
        onCancel={() => setDetachTarget(null)}
      />
    </div>
  );
}
