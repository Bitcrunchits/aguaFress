import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { getAdminProfile, updateAdminProfile } from '../services/admin.service';

const ADMIN_PROFILE_QUERY_KEY = ['admin', 'profile'] as const;

export function useAdminProfile() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ADMIN_PROFILE_QUERY_KEY,
    queryFn: getAdminProfile,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_PROFILE_QUERY_KEY }),
  });

  const firstError = profileQuery.error ?? updateMutation.error;

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    isMutating: updateMutation.isPending,
    isSuccess: updateMutation.isSuccess,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudo cargar el perfil admin').message : undefined,
    refetch: profileQuery.refetch,
    updateProfile: updateMutation.mutate,
  };
}
