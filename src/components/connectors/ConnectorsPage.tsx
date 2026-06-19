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
import { isOAuthConnectable } from '@/constants';
import { useLocalize } from '@/hooks';
import { ConnectorConnectButton } from './ConnectorConnectButton';

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2 pr-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{localize('com_connectors_title')}</h2>
        <Button
          type="secondary"
          iconLeft="plus"
          label={localize('com_connectors_add')}
          onClick={() => setCreateOpen(true)}
        />
      </div>

      {connectors.length === 0 ? (
        <EmptyState message={localize('com_connectors_empty')} />
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-3">{localize('com_connectors_name')}</th>
              <th className="py-2 pr-3">{localize('com_connectors_source')}</th>
              <th className="py-2 pr-3">{localize('com_connectors_tenant')}</th>
              <th className="py-2 pr-3">{localize('com_connectors_status')}</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {connectors.map((connector) => (
              <tr key={connector.id} className="border-b">
                <td className="py-2 pr-3">{connector.name}</td>
                <td className="py-2 pr-3">{connector.source}</td>
                <td className="py-2 pr-3">{connector.tenantId ?? '—'}</td>
                <td className="py-2 pr-3">{connector.status}</td>
                <td className="flex justify-end gap-2 py-2">
                  {isOAuthConnectable(connector.source) ? (
                    <ConnectorConnectButton id={connector.id} source={connector.source} />
                  ) : null}
                  <Button
                    type="secondary"
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
                    ariaLabel={localize('com_connectors_delete')}
                    onClick={() => setDeleteTarget(connector)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          placeholder="sharepoint | gmail | outlook | teams | google_drive | github"
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
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
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
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
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
