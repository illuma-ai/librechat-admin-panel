import { useState } from 'react';
import { Button, TextField, CodeBlock } from '@clickhouse/click-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { EmptyState, FormDialog, LoadingState } from '@/components/shared';
import { ConfirmDialog } from '@/components/access';
import {
  createWebhookKeyFn,
  revokeWebhookKeyFn,
  webhookKeysQueryOptions,
} from '@/server';
import { useLocalize } from '@/hooks';

const KEYS_QUERY_KEY = ['webhookKeys'];

function maskKey(value: string): string {
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function WebhookKeysTab() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [agentId, setAgentId] = useState('');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<t.WebhookKey | null>(null);

  const keysQuery = useQuery(webhookKeysQueryOptions);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });

  const createKey = useMutation({
    mutationFn: () =>
      createWebhookKeyFn({
        data: { label: label || undefined, agentId: agentId || undefined },
      }),
    onSuccess: (data) => {
      setRawKey(data.key.key ?? null);
      setCreateOpen(false);
      setLabel('');
      setAgentId('');
      invalidate();
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => revokeWebhookKeyFn({ data: { id } }),
    onSuccess: () => {
      setRevokeTarget(null);
      invalidate();
    },
  });

  const keys = keysQuery.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2 pr-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-(--cui-color-text-muted)">
          {localize('com_channels_keys_desc')}
        </span>
        <Button
          label={localize('com_channels_create_key')}
          type="primary"
          onClick={() => setCreateOpen(true)}
        />
      </div>

      {rawKey && (
        <div className="flex flex-col gap-1 rounded-lg border border-(--cui-color-stroke-success) p-3">
          <span className="text-xs font-medium text-(--cui-color-text-muted)">
            {localize('com_channels_key_once')}
          </span>
          <CodeBlock language="text">{rawKey}</CodeBlock>
        </div>
      )}

      {keysQuery.isLoading && <LoadingState />}

      {!keysQuery.isLoading && (
        <div className="overflow-x-auto rounded-lg border border-(--cui-color-stroke-default)">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{localize('com_channels_tab_keys')}</caption>
            <thead>
              <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_label')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_key')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  {localize('com_channels_col_actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-(--cui-color-stroke-default) last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-(--cui-color-text-default)">
                    {key.label ?? key.agentId ?? key.id}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-(--cui-color-text-muted)">
                    {maskKey(key.id)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Button
                      label={localize('com_channels_revoke')}
                      type="secondary"
                      onClick={() => setRevokeTarget(key)}
                    />
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState message={localize('com_channels_keys_empty')} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={createOpen}
        title={localize('com_channels_create_key')}
        submitLabel={localize('com_channels_create_key')}
        saving={createKey.isPending}
        error={createKey.error instanceof Error ? createKey.error.message : undefined}
        onSubmit={() => createKey.mutate()}
        onClose={() => setCreateOpen(false)}
      >
        <TextField
          label={localize('com_channels_col_label')}
          value={label}
          onChange={(value) => setLabel(value)}
        />
        <TextField
          label={localize('com_channels_agent_id')}
          placeholder={localize('com_channels_agent_id_placeholder')}
          value={agentId}
          onChange={(value) => setAgentId(value)}
        />
      </FormDialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        title={localize('com_channels_revoke_title')}
        description={localize('com_channels_revoke_desc')}
        confirmLabel={localize('com_channels_revoke')}
        saving={revokeKey.isPending}
        error={revokeKey.error instanceof Error ? revokeKey.error.message : undefined}
        onConfirm={() => revokeTarget && revokeKey.mutate(revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
