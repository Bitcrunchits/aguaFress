import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import {
  createVendorLink,
  createVendorQrCode,
  deactivateVendorLink,
  deactivateVendorQrCode,
  listVendorLinks,
  listVendorQrCodes,
} from '../services/qr.service';

const QR_QUERY_KEYS = {
  qr: ['qr', 'vendor'] as const,
  links: ['link-invitacion', 'vendor'] as const,
} as const;

export function useQrLinks() {
  const queryClient = useQueryClient();
  const qrQuery = useQuery({
    queryKey: QR_QUERY_KEYS.qr,
    queryFn: listVendorQrCodes,
    staleTime: 30_000,
  });
  const linksQuery = useQuery({
    queryKey: QR_QUERY_KEYS.links,
    queryFn: listVendorLinks,
    staleTime: 30_000,
  });

  const invalidateQrLinks = () => {
    queryClient.invalidateQueries({ queryKey: QR_QUERY_KEYS.qr });
    queryClient.invalidateQueries({ queryKey: QR_QUERY_KEYS.links });
  };

  const createQrMutation = useMutation({ mutationFn: createVendorQrCode, onSuccess: invalidateQrLinks });
  const createLinkMutation = useMutation({ mutationFn: createVendorLink, onSuccess: invalidateQrLinks });
  const deactivateQrMutation = useMutation({ mutationFn: deactivateVendorQrCode, onSuccess: invalidateQrLinks });
  const deactivateLinkMutation = useMutation({ mutationFn: deactivateVendorLink, onSuccess: invalidateQrLinks });

  const firstError = qrQuery.error
    ?? linksQuery.error
    ?? createQrMutation.error
    ?? createLinkMutation.error
    ?? deactivateQrMutation.error
    ?? deactivateLinkMutation.error;

  return {
    qrCodes: qrQuery.data?.data ?? [],
    links: linksQuery.data?.data ?? [],
    latestQr: createQrMutation.data,
    latestLink: createLinkMutation.data,
    isLoading: qrQuery.isLoading || linksQuery.isLoading,
    isError: qrQuery.isError || linksQuery.isError,
    isMutating: createQrMutation.isPending || createLinkMutation.isPending || deactivateQrMutation.isPending || deactivateLinkMutation.isPending,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudieron cargar los QR y links').message : undefined,
    refetch: () => {
      qrQuery.refetch();
      linksQuery.refetch();
    },
    createQr: createQrMutation.mutate,
    createLink: createLinkMutation.mutate,
    deactivateQr: deactivateQrMutation.mutate,
    deactivateLink: deactivateLinkMutation.mutate,
  };
}
