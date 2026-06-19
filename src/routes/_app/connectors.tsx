import { createFileRoute } from '@tanstack/react-router';
import { AccessDenied, PermissionsUnavailable } from '@/components/shared';
import { ConnectorsPage } from '@/components/connectors';
import { SystemCapabilities } from '@/constants';
import { useCapabilities } from '@/hooks';

export const Route = createFileRoute('/_app/connectors')({
  component: ConnectorsRoute,
});

function ConnectorsRoute() {
  const { hasCapability, isLoading, isError } = useCapabilities();
  if (isLoading) return null;
  if (isError) return <PermissionsUnavailable />;
  if (!hasCapability(SystemCapabilities.ACCESS_ADMIN)) return <AccessDenied />;
  return <ConnectorsPage />;
}
