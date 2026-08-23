import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationRequest } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import {
  getOwnClientById,
  listVendedorClientPortfolio,
  registerClientByVendor,
  updateOwnClient,
  type RegisterClientByVendorRequest,
  type VendedorClientUpdateRequest,
} from '../services/clientes.service';

export const VENDEDOR_CLIENT_QUERY_KEYS = {
  portfolio: (filters: PaginationRequest) => ['vendedor', 'clients', 'portfolio', filters] as const,
  detail: (clienteId?: string) => ['vendedor', 'clients', 'detail', clienteId] as const,
} as const;

const DEFAULT_PORTFOLIO_FILTERS = {
  page: 1,
  limit: 20,
} as const;

export function useVendedorClientPortfolio(filters: PaginationRequest = DEFAULT_PORTFOLIO_FILTERS) {
  const portfolioQuery = useQuery({
    queryKey: VENDEDOR_CLIENT_QUERY_KEYS.portfolio(filters),
    queryFn: () => listVendedorClientPortfolio(filters),
    staleTime: 30_000,
  });

  return {
    clients: portfolioQuery.data?.data ?? [],
    pagination: portfolioQuery.data?.pagination ?? null,
    isLoading: portfolioQuery.isLoading,
    isError: portfolioQuery.isError,
    errorMessage: portfolioQuery.error
      ? normalizeApiError(portfolioQuery.error, 'No se pudieron cargar los clientes').message
      : undefined,
    refetch: portfolioQuery.refetch,
  };
}

export function useVendedorClientDetail(clienteId?: string) {
  const queryClient = useQueryClient();
  const clientQuery = useQuery({
    queryKey: VENDEDOR_CLIENT_QUERY_KEYS.detail(clienteId),
    queryFn: () => getOwnClientById(clienteId ?? ''),
    enabled: Boolean(clienteId),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (request: VendedorClientUpdateRequest) => updateOwnClient(clienteId ?? '', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDEDOR_CLIENT_QUERY_KEYS.detail(clienteId) });
      queryClient.invalidateQueries({ queryKey: ['vendedor', 'clients'] });
    },
  });

  return {
    client: clientQuery.data,
    isLoading: clientQuery.isLoading,
    isError: clientQuery.isError,
    isUpdating: updateMutation.isPending,
    errorMessage: clientQuery.error
      ? normalizeApiError(clientQuery.error, 'No se pudo cargar el cliente').message
      : undefined,
    updateErrorMessage: updateMutation.error
      ? normalizeApiError(updateMutation.error, 'No se pudo actualizar el cliente').message
      : undefined,
    refetch: clientQuery.refetch,
    updateClient: updateMutation.mutateAsync,
  };
}

export function useRegisterClientByVendor() {
  const queryClient = useQueryClient();
  const registerMutation = useMutation({
    mutationFn: (request: RegisterClientByVendorRequest) => registerClientByVendor(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedor', 'clients'] });
    },
  });

  return {
    registeredClient: registerMutation.data,
    isRegistering: registerMutation.isPending,
    isSuccess: registerMutation.isSuccess,
    isError: registerMutation.isError,
    errorMessage: registerMutation.error
      ? normalizeApiError(registerMutation.error, 'No se pudo registrar el cliente').message
      : undefined,
    registerClient: registerMutation.mutateAsync,
  };
}
