import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { listBrands, listCategories, listProducts, type ProductFilters } from '../../productos/services/productos.service';
import { listClienteProviders, selectClienteProvider } from '../../clientes/services/clientes.service';

const CATALOGO_QUERY_KEYS = {
  providers: ['clientes', 'providers'] as const,
  products: (filters: ProductFilters) => ['catalogo', 'products', filters] as const,
  categories: (vendedorId?: string) => ['catalogo', 'categories', vendedorId] as const,
  brands: (vendedorId?: string) => ['catalogo', 'brands', vendedorId] as const,
} as const;

export function useCatalogo() {
  const queryClient = useQueryClient();
  const providersQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.providers,
    queryFn: listClienteProviders,
    staleTime: 120_000,
  });

  const selectedProvider = providersQuery.data?.providers.find((provider) => provider.isDefault)
    ?? providersQuery.data?.providers[0];
  const vendedorId = selectedProvider?.id;
  const productFilters: ProductFilters = { page: 1, limit: 20, vendedorId, disponibles: true };

  const productsQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.products(productFilters),
    queryFn: () => listProducts(productFilters),
    enabled: Boolean(vendedorId),
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.categories(vendedorId),
    queryFn: () => listCategories(vendedorId),
    enabled: Boolean(vendedorId),
    staleTime: 300_000,
  });

  const brandsQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.brands(vendedorId),
    queryFn: () => listBrands(vendedorId),
    enabled: Boolean(vendedorId),
    staleTime: 300_000,
  });

  const selectProviderMutation = useMutation({
    mutationFn: selectClienteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_QUERY_KEYS.providers });
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
    },
  });

  const firstError = providersQuery.error ?? productsQuery.error ?? categoriesQuery.error ?? brandsQuery.error;

  return {
    providers: providersQuery.data?.providers ?? [],
    selectedProvider,
    products: productsQuery.data?.data ?? [],
    pagination: productsQuery.data?.pagination ?? null,
    categories: categoriesQuery.data ?? [],
    brands: brandsQuery.data ?? [],
    isLoading: providersQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || brandsQuery.isLoading,
    isError: providersQuery.isError || productsQuery.isError || categoriesQuery.isError || brandsQuery.isError,
    errorMessage: firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el catálogo').message
      : undefined,
    refetch: () => {
      providersQuery.refetch();
      productsQuery.refetch();
      categoriesQuery.refetch();
      brandsQuery.refetch();
    },
    selectProvider: selectProviderMutation.mutate,
    isSelectingProvider: selectProviderMutation.isPending,
  };
}
