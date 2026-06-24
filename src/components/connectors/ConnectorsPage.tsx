import { useState } from 'react';
import { Button, TextField } from '@clickhouse/click-ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { EmptyState, FormDialog, LoadingState, TrashButton } from '@/components/shared';
import {
  connectorsQueryOptions,
  createConnectorFn,
  deleteConnectorFn,
  setConnectorCredentialsFn,
  triggerConnectorSyncFn,
} from '@/server';
import { getStatusVariant, isOAuthConnectable } from '@/constants';
import { useLocalize } from '@/hooks';
import { ConnectorConnectButton } from './ConnectorConnectButton';
import { SourceIdentity } from './SourceIdentity';
import { StatusBadge } from './StatusBadge';

const EMPTY_CREATE: t.CreateConnectorInput = { source: '', name: '', tenantId: '' };
const EMPTY_CREDS = { tenantId: '', clientId: '', clientSecret: '' };

export function ConnectorsPage() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { data: connectors = [], isLoading, isError } = useQuery(connectorsQueryOptions);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<t.CreateConnectorInput>(EMPTY_CREATE);
  const [credsTarget, setCredsTarget] = useState<t.Connector | null>(null);
  const [creds, setCreds] = useState(EMPTY_CREDS);
  const [deleteTarget, setDeleteTarget] = useState<t.Connector | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['connectors'] });

  const createMutation = useMutation({
    mutationFn: () => createConnectorFn({ data: createForm }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const credsMutation = useMutation({
    mutationFn: () =>
      setConnectorCredentialsFn({
        data: {
          id: credsTarget?.id ?? '',
          credentials: {
            tenant_id: creds.tenantId,
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
          },
        },
      }),
    onSuccess: () => {
      invalidate();
      setCredsTarget(null);
      setCreds(EMPTY_CREDS);
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => triggerConnectorSyncFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConnectorFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError) {
    return <EmptyState message={localize('com_connectors_error')} />;
  }

  return (
    <div
      role="region"
      aria-label={localize('com_connectors_title')}
      className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-2 pr-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold text-(--cui-color-text-default)">
            {localize('com_connectors_title')}
          </h2>
          <p className="text-sm text-(--cui-color-text-muted)">
            {localize('com_connectors_subtitle')}
          </p>
        </div>
        <Button
          type="primary"
          iconLeft="plus"
          label={localize('com_connectors_add')}
          onClick={() => setCreateOpen(true)}
        />
      </div>

      {connectors.length === 0 ? (
        <EmptyState message={localize('com_connectors_empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {connectors.map((connector) => (
            <li
              key={connector.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) px-4 py-3.5 transition-colors hover:bg-(--cui-color-background-hover)"
            >
              <div className="min-w-[12rem] flex-1">
                <SourceIdentity source={connector.source} name={connector.name} />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium tracking-wide text-(--cui-color-text-muted) uppercase">
                  {localize('com_connectors_tenant')}
                </span>
                <span className="text-sm text-(--cui-color-text-default)">
                  {connector.tenantId || localize('com_connectors_tenant_none')}
                </span>
              </div>

              <StatusBadge
                variant={getStatusVariant(connector.status)}
                label={connector.status}
              />

              <div className="ml-auto flex items-center gap-2">
                {isOAuthConnectable(connector.source) ? (
                  <ConnectorConnectButton id={connector.id} source={connector.source} />
                ) : null}
                <Button
                  type="secondary"
                  iconLeft="key"
                  label={localize('com_connectors_credentials')}
                  onClick={() => setCredsTarget(connector)}
                />
                <Button
                  type="secondary"
                  iconLeft="refresh"
                  label={localize('com_connectors_sync')}
                  onClick={() => syncMutation.mutate(connector.id)}
                />
                <TrashButton
                  ariaLabel={localize('com_connectors_delete_named', { name: connector.name })}
                  onClick={() => setDeleteTarget(connector)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={createOpen}
        title={localize('com_connectors_add')}
        submitLabel={localize('com_ui_create')}
        onClose={() => {
          setCreateOpen(false);
          setError('');
        }}
        onSubmit={() => createMutation.mutate()}
      >
        <TextField
          label={localize('com_connectors_source')}
          placeholder={localize('com_connectors_source_placeholder')}
          value={createForm.source}
          onChange={(value) => setCreateForm((prev) => ({ ...prev, source: value }))}
        />
        <TextField
          label={localize('com_connectors_name')}
          value={createForm.name}
          onChange={(value) => setCreateForm((prev) => ({ ...prev, name: value }))}
        />
        <TextField
          label={localize('com_connectors_tenant')}
          value={createForm.tenantId ?? ''}
          onChange={(value) => setCreateForm((prev) => ({ ...prev, tenantId: value }))}
        />
        {error ? <p className="text-sm text-(--cui-color-feedback-danger-fg)">{error}</p> : null}
      </FormDialog>

      <FormDialog
        open={credsTarget !== null}
        title={localize('com_connectors_credentials')}
        submitLabel={localize('com_ui_save')}
        onClose={() => {
          setCredsTarget(null);
          setCreds(EMPTY_CREDS);
          setError('');
        }}
        onSubmit={() => credsMutation.mutate()}
      >
        <TextField
          label="tenant_id"
          value={creds.tenantId}
          onChange={(value) => setCreds((prev) => ({ ...prev, tenantId: value }))}
        />
        <TextField
          label="client_id"
          value={creds.clientId}
          onChange={(value) => setCreds((prev) => ({ ...prev, clientId: value }))}
        />
        <TextField
          label="client_secret"
          value={creds.clientSecret}
          onChange={(value) => setCreds((prev) => ({ ...prev, clientSecret: value }))}
        />
        {error ? <p className="text-sm text-(--cui-color-feedback-danger-fg)">{error}</p> : null}
      </FormDialog>

      <FormDialog
        open={deleteTarget !== null}
        title={localize('com_connectors_delete')}
        submitLabel={localize('com_ui_delete')}
        onClose={() => setDeleteTarget(null)}
        onSubmit={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className="text-sm">{localize('com_connectors_delete_confirm')}</p>
      </FormDialog>
    </div>
  );
}
