import { useQuery } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { listBrands, listCategories, listProducts, type ProductFilters } from '../../productos/services/productos.service';
import { useClienteProviderSelection } from '../../clientes/hooks/useClienteProviderSelection';

const CATALOGO_QUERY_KEYS = {
  products: (filters: ProductFilters) => ['catalogo', 'products', filters] as const,
  categories: (vendedorId?: string) => ['catalogo', 'categories', vendedorId] as const,
  brands: (vendedorId?: string) => ['catalogo', 'brands', vendedorId] as const,
} as const;

export function useCatalogo() {
  const providerSelection = useClienteProviderSelection();
  const vendedorId = providerSelection.selectedVendedorId;
  const productFilters: ProductFilters = { page: 1, limit: 20, vendedorId, disponibles: true };
  const isCatalogEnabled = Boolean(vendedorId) && !providerSelection.isProviderSelectionRequired;

  const productsQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.products(productFilters),
    queryFn: () => listProducts(productFilters),
    enabled: isCatalogEnabled,
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.categories(vendedorId),
    queryFn: () => listCategories(vendedorId),
    enabled: isCatalogEnabled,
    staleTime: 300_000,
  });

  const brandsQuery = useQuery({
    queryKey: CATALOGO_QUERY_KEYS.brands(vendedorId),
    queryFn: () => listBrands(vendedorId),
    enabled: isCatalogEnabled,
    staleTime: 300_000,
  });

  const firstError = productsQuery.error ?? categoriesQuery.error ?? brandsQuery.error;

  return {
    providers: providerSelection.providers,
    selectedProvider: providerSelection.selectedProvider,
    selectedVendedorId: providerSelection.selectedVendedorId,
    isProviderSelectionRequired: providerSelection.isProviderSelectionRequired,
    products: productsQuery.data?.data ?? [],
    pagination: productsQuery.data?.pagination ?? null,
    categories: categoriesQuery.data ?? [],
    brands: brandsQuery.data ?? [],
    isLoading: providerSelection.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || brandsQuery.isLoading,
    isError: providerSelection.isError || productsQuery.isError || categoriesQuery.isError || brandsQuery.isError,
    errorMessage: providerSelection.errorMessage ?? (firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el catálogo').message
      : undefined),
    refetch: () => {
      providerSelection.refetchProviders();
      productsQuery.refetch();
      categoriesQuery.refetch();
      brandsQuery.refetch();
    },
    selectProvider: providerSelection.selectProvider,
    isSelectingProvider: providerSelection.isSelectingProvider,
  };
}
