import { useQuery } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { getAdminAuditById, listAdminAuditEntries } from '../services/admin.service';
import type { AdminAuditListFilters } from '../types';

const ADMIN_AUDIT_QUERY_KEYS = {
  list: (filters: AdminAuditListFilters) => ['admin', 'audit', filters] as const,
  detail: (auditId: string) => ['admin', 'audit', auditId] as const,
} as const;

export function useAdminAudit(filters: AdminAuditListFilters) {
  const auditQuery = useQuery({
    queryKey: ADMIN_AUDIT_QUERY_KEYS.list(filters),
    queryFn: () => listAdminAuditEntries(filters),
    staleTime: 30_000,
  });

  return {
    entries: auditQuery.data?.data ?? [],
    pagination: auditQuery.data?.meta ?? null,
    isLoading: auditQuery.isLoading,
    isError: auditQuery.isError,
    errorMessage: auditQuery.error ? normalizeApiError(auditQuery.error, 'No se pudo cargar la auditoría').message : undefined,
    refetch: auditQuery.refetch,
  };
}

export function useAdminAuditDetail(auditId: string) {
  const auditQuery = useQuery({
    queryKey: ADMIN_AUDIT_QUERY_KEYS.detail(auditId),
    queryFn: () => getAdminAuditById(auditId),
    enabled: Boolean(auditId),
    staleTime: 30_000,
  });

  return {
    entry: auditQuery.data?.data ?? null,
    isLoading: auditQuery.isLoading,
    isError: auditQuery.isError,
    errorMessage: auditQuery.error ? normalizeApiError(auditQuery.error, 'No se pudo cargar el evento de auditoría').message : undefined,
    refetch: auditQuery.refetch,
  };
}
