import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import {
  addAdminClientProvider,
  getAdminClientById,
  listAdminClients,
  reassignAdminClient,
  updateAdminClient,
  type AdminClientListFilters,
  type AdminClientProviderRequest,
  type AdminClientUpdateRequest,
} from '../services/admin-clients.service';

export const ADMIN_CLIENT_QUERY_KEYS = {
  list: (filters: AdminClientListFilters) => ['admin', 'clients', 'list', filters] as const,
  detail: (clienteId?: string) => ['admin', 'clients', 'detail', clienteId] as const,
} as const;

export function useAdminClients(filters: AdminClientListFilters) {
  const clientsQuery = useQuery({
    queryKey: ADMIN_CLIENT_QUERY_KEYS.list(filters),
    queryFn: () => listAdminClients(filters),
    staleTime: 30_000,
  });

  return {
    clients: clientsQuery.data?.data ?? [],
    pagination: clientsQuery.data?.pagination ?? null,
    isLoading: clientsQuery.isLoading,
    isError: clientsQuery.isError,
    errorMessage: clientsQuery.error
      ? normalizeApiError(clientsQuery.error, 'No se pudieron cargar los clientes').message
      : undefined,
    refetch: clientsQuery.refetch,
  };
}

export function useAdminClientDetail(clienteId?: string) {
  const queryClient = useQueryClient();
  const clientQuery = useQuery({
    queryKey: ADMIN_CLIENT_QUERY_KEYS.detail(clienteId),
    queryFn: () => getAdminClientById(clienteId ?? ''),
    enabled: Boolean(clienteId),
    staleTime: 30_000,
  });

  const invalidateClient = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_CLIENT_QUERY_KEYS.detail(clienteId) });
    queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
  };

  const updateMutation = useMutation({
    mutationFn: (request: AdminClientUpdateRequest) => updateAdminClient(clienteId ?? '', request),
    onSuccess: invalidateClient,
  });

  const reassignMutation = useMutation({
    mutationFn: (request: AdminClientProviderRequest) => reassignAdminClient(clienteId ?? '', request),
    onSuccess: invalidateClient,
  });

  const addProviderMutation = useMutation({
    mutationFn: (request: AdminClientProviderRequest) => addAdminClientProvider(clienteId ?? '', request),
    onSuccess: invalidateClient,
  });

  const firstError =
    clientQuery.error ?? updateMutation.error ?? reassignMutation.error ?? addProviderMutation.error;

  return {
    client: clientQuery.data,
    isLoading: clientQuery.isLoading,
    isError: clientQuery.isError,
    isMutating: updateMutation.isPending || reassignMutation.isPending || addProviderMutation.isPending,
    errorMessage: firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el cliente').message
      : undefined,
    refetch: clientQuery.refetch,
    updateClient: updateMutation.mutate,
    reassignClient: reassignMutation.mutate,
    addProvider: addProviderMutation.mutate,
  };
}
