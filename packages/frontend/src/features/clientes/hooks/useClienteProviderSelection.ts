import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ClienteProviderResponse,
  ClienteProvidersResponse,
  SelectClienteProviderRequest,
} from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { listClienteProviders, selectClienteProvider } from '../services/clientes.service';

export const CLIENTE_PROVIDER_QUERY_KEYS = {
  providers: ['clientes', 'providers'] as const,
} as const;

function resolveDefaultProvider(response?: ClienteProvidersResponse): ClienteProviderResponse | undefined {
  if (!response) return undefined;
  if (response.requiresSelection) return undefined;

  const defaultProvider = response.providers.find((provider) => provider.isDefault)
    ?? response.providers.find((provider) => provider.id === response.defaultVendedorId);

  if (defaultProvider) return defaultProvider;

  return response.providers[0];
}

export function useClienteProviderSelection() {
  const queryClient = useQueryClient();
  const [selectedVendedorId, setSelectedVendedorId] = useState<string>();

  const providersQuery = useQuery({
    queryKey: CLIENTE_PROVIDER_QUERY_KEYS.providers,
    queryFn: listClienteProviders,
    staleTime: 120_000,
  });

  const selectProviderMutation = useMutation({
    mutationFn: selectClienteProvider,
    onSuccess: (response) => {
      setSelectedVendedorId(response.selectedProvider.id);
      queryClient.setQueryData<ClienteProvidersResponse>(CLIENTE_PROVIDER_QUERY_KEYS.providers, (current) => current
        ? {
            ...current,
            defaultVendedorId: response.selectedProvider.id,
            requiresSelection: false,
            providers: current.providers.map((provider) => ({
              ...provider,
              isDefault: provider.id === response.selectedProvider.id,
            })),
          }
        : current);
      queryClient.invalidateQueries({ queryKey: CLIENTE_PROVIDER_QUERY_KEYS.providers });
    },
  });

  const providers = providersQuery.data?.providers ?? [];
  const mutationSelectedProvider = selectProviderMutation.data?.selectedProvider;
  const selectedProvider = mutationSelectedProvider
    ?? providers.find((provider) => provider.id === selectedVendedorId)
    ?? resolveDefaultProvider(providersQuery.data);
  const resolvedVendedorId = selectedProvider?.id;
  const isProviderSelectionRequired = Boolean(
    providersQuery.data?.requiresSelection && providers.length > 0 && !resolvedVendedorId
  );

  return {
    providers,
    selectedProvider,
    selectedVendedorId: resolvedVendedorId,
    isProviderSelectionRequired,
    isLoading: providersQuery.isLoading,
    isError: providersQuery.isError,
    isSelectingProvider: selectProviderMutation.isPending,
    errorMessage: providersQuery.error
      ? normalizeApiError(providersQuery.error, 'No se pudieron cargar los proveedores').message
      : undefined,
    refetchProviders: providersQuery.refetch,
    selectProvider: (request: SelectClienteProviderRequest) => selectProviderMutation.mutateAsync(request),
  };
}
