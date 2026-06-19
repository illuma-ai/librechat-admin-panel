import { useEffect, useRef, useState } from 'react';
import { Button } from '@clickhouse/click-ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConnectorOAuthStatusFn, getConnectorOAuthTicketFn } from '@/server';
import { useLocalize } from '@/hooks';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3080';

interface ConnectorConnectButtonProps {
  id: string;
  source: string;
}

/**
 * Per-row OAuth control: shows "Connected" when the connector holds a valid
 * grant, otherwise a "Connect" button that opens the provider consent popup and
 * polls status until connected or the {@link POLL_TIMEOUT_MS} window elapses.
 */
export function ConnectorConnectButton({ id, source }: ConnectorConnectButtonProps) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusQuery = useQuery({
    queryKey: ['connector-oauth-status', id],
    queryFn: () => getConnectorOAuthStatusFn({ data: { id } }),
    refetchInterval: polling ? POLL_INTERVAL_MS : false,
  });

  const connected = statusQuery.data?.connected ?? false;

  const clearPollTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const ticketMutation = useMutation({
    mutationFn: () => getConnectorOAuthTicketFn({ data: { id, source } }),
    onSuccess: ({ ticket }) => {
      const url = `${API_BASE_URL}/api/admin/connectors/${encodeURIComponent(id)}/oauth/initiate?ticket=${encodeURIComponent(ticket)}`;
      window.open(url, 'connector_oauth', 'width=600,height=720');
      setFailed(false);
      setPolling(true);
      clearPollTimeout();
      timeoutRef.current = setTimeout(() => {
        setPolling(false);
        setFailed(true);
      }, POLL_TIMEOUT_MS);
    },
    onError: () => setFailed(true),
  });

  useEffect(() => {
    if (polling && connected) {
      setPolling(false);
      setFailed(false);
      clearPollTimeout();
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    }
  }, [polling, connected, queryClient]);

  useEffect(() => clearPollTimeout, []);

  if (connected) {
    return (
      <span className="inline-flex items-center text-sm text-green-600">
        {localize('com_connectors_connected')}
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="secondary"
        iconLeft="key"
        label={
          polling ? localize('com_connectors_connecting') : localize('com_connectors_connect')
        }
        disabled={polling || ticketMutation.isPending}
        onClick={() => ticketMutation.mutate()}
      />
      {failed ? (
        <span className="text-xs text-red-500">{localize('com_connectors_connect_failed')}</span>
      ) : null}
    </div>
  );
}
