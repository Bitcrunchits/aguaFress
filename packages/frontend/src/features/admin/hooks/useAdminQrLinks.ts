import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import {
  deactivateAdminLink,
  deactivateAdminQrCode,
  listAdminLinks,
  listAdminQrCodes,
  type AdminVendorScopedListParams,
} from '../services/admin.service';

const ADMIN_QR_LINK_QUERY_KEYS = {
  qrCodes: (params: AdminVendorScopedListParams) => ['admin', 'qr-codes', params] as const,
  links: (params: AdminVendorScopedListParams) => ['admin', 'invitation-links', params] as const,
} as const;

export function useAdminQrCodes(params: AdminVendorScopedListParams) {
  const queryClient = useQueryClient();
  const qrQuery = useQuery({
    queryKey: ADMIN_QR_LINK_QUERY_KEYS.qrCodes(params),
    queryFn: () => listAdminQrCodes(params),
    enabled: Boolean(params.vendedorId),
    staleTime: 30_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminQrCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] }),
  });

  const firstError = qrQuery.error ?? deactivateMutation.error;

  return {
    qrCodes: qrQuery.data?.data ?? [],
    pagination: qrQuery.data?.pagination ?? null,
    isLoading: qrQuery.isLoading,
    isError: qrQuery.isError,
    isMutating: deactivateMutation.isPending,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudieron cargar los QR codes').message : undefined,
    refetch: qrQuery.refetch,
    deactivateQr: deactivateMutation.mutate,
  };
}

export function useAdminInvitationLinks(params: AdminVendorScopedListParams) {
  const queryClient = useQueryClient();
  const linksQuery = useQuery({
    queryKey: ADMIN_QR_LINK_QUERY_KEYS.links(params),
    queryFn: () => listAdminLinks(params),
    enabled: Boolean(params.vendedorId),
    staleTime: 30_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'invitation-links'] }),
  });

  const firstError = linksQuery.error ?? deactivateMutation.error;

  return {
    links: linksQuery.data?.data ?? [],
    pagination: linksQuery.data?.pagination ?? null,
    isLoading: linksQuery.isLoading,
    isError: linksQuery.isError,
    isMutating: deactivateMutation.isPending,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudieron cargar los invitation links').message : undefined,
    refetch: linksQuery.refetch,
    deactivateLink: deactivateMutation.mutate,
  };
}
