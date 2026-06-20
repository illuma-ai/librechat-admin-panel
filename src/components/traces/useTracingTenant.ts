import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { tenantsQueryOptions } from '@/server';

/**
 * Resolve the active tenant for the tracing pages: load the tenant list (id +
 * display name) and default to the first one (mirrored to the URL via
 * `onTenant`). The URL stays the source of truth and always holds the tenant
 * id; queries stay disabled until a tenant is resolved.
 */
export function useTracingTenant(tenant: string, onTenant: (tenant: string) => void) {
  const tenantsQuery = useQuery(tenantsQueryOptions);
  const tenants = useMemo<t.TenantOption[]>(() => tenantsQuery.data ?? [], [tenantsQuery.data]);
  const effectiveTenant = tenant || tenants[0]?.id || '';

  useEffect(() => {
    if (!tenant && tenants.length > 0) onTenant(tenants[0].id);
  }, [tenant, tenants, onTenant]);

  return { tenants, effectiveTenant, isLoading: tenantsQuery.isLoading };
}
