import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VendedorEstado, type SuperAdminVendedorListFilters } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import {
  changeAdminVendorEstado,
  getAdminVendorById,
  listAdminVendors,
  listPendingAdminVendors,
} from '../services/admin-vendors.service';

export const ADMIN_VENDOR_QUERY_KEYS = {
  list: (filters: SuperAdminVendedorListFilters) => ['admin', 'vendors', 'list', filters] as const,
  pending: ['admin', 'vendors', 'pending'] as const,
  detail: (vendedorId?: string) => ['admin', 'vendors', 'detail', vendedorId] as const,
} as const;

export function useAdminVendors(filters: SuperAdminVendedorListFilters) {
  const vendorsQuery = useQuery({
    queryKey: ADMIN_VENDOR_QUERY_KEYS.list(filters),
    queryFn: () => listAdminVendors(filters),
    staleTime: 30_000,
  });

  return {
    vendors: vendorsQuery.data?.data ?? [],
    pagination: vendorsQuery.data?.pagination ?? null,
    isLoading: vendorsQuery.isLoading,
    isError: vendorsQuery.isError,
    errorMessage: vendorsQuery.error
      ? normalizeApiError(vendorsQuery.error, 'No se pudieron cargar los vendedores').message
      : undefined,
    refetch: vendorsQuery.refetch,
  };
}

export function usePendingAdminVendors() {
  const vendorsQuery = useQuery({
    queryKey: ADMIN_VENDOR_QUERY_KEYS.pending,
    queryFn: listPendingAdminVendors,
    staleTime: 30_000,
  });

  return {
    vendors: vendorsQuery.data?.data ?? [],
    pagination: vendorsQuery.data?.pagination ?? null,
    isLoading: vendorsQuery.isLoading,
    isError: vendorsQuery.isError,
    errorMessage: vendorsQuery.error
      ? normalizeApiError(vendorsQuery.error, 'No se pudieron cargar los vendedores pendientes').message
      : undefined,
    refetch: vendorsQuery.refetch,
  };
}

export function useAdminVendorDetail(vendedorId?: string) {
  const queryClient = useQueryClient();
  const vendorQuery = useQuery({
    queryKey: ADMIN_VENDOR_QUERY_KEYS.detail(vendedorId),
    queryFn: () => getAdminVendorById(vendedorId ?? ''),
    enabled: Boolean(vendedorId),
    staleTime: 30_000,
  });

  const invalidateVendor = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_VENDOR_QUERY_KEYS.detail(vendedorId) });
    queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
  };

  const statusMutation = useMutation({
    mutationFn: (estado: VendedorEstado) => changeAdminVendorEstado(vendedorId ?? '', estado),
    onSuccess: invalidateVendor,
  });

  const firstError = vendorQuery.error ?? statusMutation.error;

  return {
    vendor: vendorQuery.data,
    isLoading: vendorQuery.isLoading,
    isError: vendorQuery.isError,
    isMutating: statusMutation.isPending,
    errorMessage: firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el vendedor').message
      : undefined,
    refetch: vendorQuery.refetch,
    changeEstado: statusMutation.mutate,
  };
}
