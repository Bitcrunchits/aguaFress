import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { deactivateAdminLink, deactivateAdminQrCode, getAdminOverview } from '../services/admin.service';

const ADMIN_QUERY_KEYS = {
  overview: ['admin', 'overview'] as const,
} as const;

export function useAdminOverview() {
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: ADMIN_QUERY_KEYS.overview,
    queryFn: getAdminOverview,
    staleTime: 15_000,
  });

  const invalidateOverview = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.overview });
  };

  const deactivateQrMutation = useMutation({ mutationFn: deactivateAdminQrCode, onSuccess: invalidateOverview });
  const deactivateLinkMutation = useMutation({ mutationFn: deactivateAdminLink, onSuccess: invalidateOverview });

  const firstError = overviewQuery.error ?? deactivateQrMutation.error ?? deactivateLinkMutation.error;

  return {
    overview: overviewQuery.data,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    isMutatingInvitation: deactivateQrMutation.isPending || deactivateLinkMutation.isPending,
    errorMessage: firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el panel de administración').message
      : undefined,
    refetch: overviewQuery.refetch,
    deactivateQr: deactivateQrMutation.mutate,
    deactivateLink: deactivateLinkMutation.mutate,
  };
}
