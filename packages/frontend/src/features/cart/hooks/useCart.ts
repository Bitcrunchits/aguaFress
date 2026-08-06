import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemV2Request, DeleteCartItemV2Request, UpdateCartItemV2Request } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { listClienteProviders } from '../../clientes/services/clientes.service';
import { addCartItem, deleteCartItem, getCart, updateCartItem } from '../services/cart.service';

const CART_QUERY_KEYS = {
  providers: ['cart', 'providers'] as const,
  cart: (vendedorId?: string) => ['cart', 'detail', vendedorId] as const,
} as const;

export function useCart() {
  const queryClient = useQueryClient();
  const providersQuery = useQuery({
    queryKey: CART_QUERY_KEYS.providers,
    queryFn: listClienteProviders,
    staleTime: 120_000,
  });

  const selectedProvider = providersQuery.data?.providers.find((provider) => provider.isDefault)
    ?? providersQuery.data?.providers[0];
  const vendedorId = selectedProvider?.id;

  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEYS.cart(vendedorId),
    queryFn: () => getCart(vendedorId ?? ''),
    enabled: Boolean(vendedorId),
    staleTime: 30_000,
  });

  const firstError = providersQuery.error ?? cartQuery.error;

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const addItemMutation = useMutation({
    mutationFn: (request: AddCartItemV2Request) => addCartItem(request),
    onSuccess: invalidateCart,
  });

  const updateItemMutation = useMutation({
    mutationFn: (request: UpdateCartItemV2Request) => updateCartItem(request),
    onSuccess: invalidateCart,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (request: DeleteCartItemV2Request) => deleteCartItem(request),
    onSuccess: invalidateCart,
  });

  const mutationError = addItemMutation.error ?? updateItemMutation.error ?? deleteItemMutation.error;

  return {
    providers: providersQuery.data?.providers ?? [],
    selectedProvider,
    cart: cartQuery.data,
    isLoading: providersQuery.isLoading || cartQuery.isLoading,
    isError: providersQuery.isError || cartQuery.isError,
    isMutating: addItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending,
    errorMessage: firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el carrito').message
      : undefined,
    mutationErrorMessage: mutationError
      ? normalizeApiError(mutationError, 'No se pudo actualizar el carrito').message
      : undefined,
    refetch: () => {
      providersQuery.refetch();
      cartQuery.refetch();
    },
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
  };
}
