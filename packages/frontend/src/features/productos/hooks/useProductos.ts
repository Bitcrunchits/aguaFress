import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProductRequest, UpdateProductRequest } from '@agua/contracts';
import {
  createProduct,
  deleteProduct,
  listBrands,
  listCategories,
  listProducts,
  updateProduct,
} from '../services/productos.service';

export function useProductos() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ['products', 'list'],
    queryFn: () => listProducts(),
    staleTime: 30_000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: () => listCategories(),
    staleTime: 60_000,
  });
  const brandsQuery = useQuery({
    queryKey: ['products', 'brands'],
    queryFn: () => listBrands(),
    staleTime: 60_000,
  });

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
  };

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => updateProduct(id, { activo }),
    onSuccess: invalidateProducts,
  });

  const createProductMutation = useMutation({
    mutationFn: (request: CreateProductRequest) => createProduct(request),
    onSuccess: invalidateProducts,
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateProductRequest }) => updateProduct(id, request),
    onSuccess: invalidateProducts,
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidateProducts,
  });

  return {
    products: productsQuery.data?.data ?? [],
    pagination: productsQuery.data?.pagination ?? null,
    categories: categoriesQuery.data ?? [],
    brands: brandsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    isMutating:
      toggleActiveMutation.isPending ||
      createProductMutation.isPending ||
      updateProductMutation.isPending ||
      deleteProductMutation.isPending,
    error: productsQuery.error,
    refetch: productsQuery.refetch,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
  };
}
