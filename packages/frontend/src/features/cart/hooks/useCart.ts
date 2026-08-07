import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemV2Request, DeleteCartItemV2Request, UpdateCartItemV2Request } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { useClienteProviderSelection } from '../../clientes/hooks/useClienteProviderSelection';
import { addCartItem, deleteCartItem, getCart, updateCartItem } from '../services/cart.service';

type AddProductToCartRequest = Omit<AddCartItemV2Request, 'vendedorId'>;

const CART_QUERY_KEYS = {
  cart: (vendedorId?: string) => ['cart', 'detail', vendedorId] as const,
} as const;

export function useCart() {
  const queryClient = useQueryClient();
  const providerSelection = useClienteProviderSelection();
  const vendedorId = providerSelection.selectedVendedorId;

  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEYS.cart(vendedorId),
    queryFn: () => getCart(vendedorId ?? ''),
    enabled: Boolean(vendedorId),
    staleTime: 30_000,
  });

  const firstError = cartQuery.error;

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cart(vendedorId) });
  };

  const addItemMutation = useMutation({
    mutationFn: (request: AddCartItemV2Request) => addCartItem(request),
    onSuccess: invalidateCart,
  });

  const addProductMutation = useMutation({
    mutationFn: (request: AddProductToCartRequest) => {
      if (!vendedorId) {
        throw new Error('Seleccioná un proveedor antes de agregar productos al carrito');
      }

      return addCartItem({ ...request, vendedorId });
    },
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

  const mutationError = addProductMutation.error ?? addItemMutation.error ?? updateItemMutation.error ?? deleteItemMutation.error;

  return {
    providers: providerSelection.providers,
    selectedProvider: providerSelection.selectedProvider,
    selectedVendedorId: providerSelection.selectedVendedorId,
    isProviderSelectionRequired: providerSelection.isProviderSelectionRequired,
    cart: cartQuery.data,
    isLoading: providerSelection.isLoading || cartQuery.isLoading,
    isError: providerSelection.isError || cartQuery.isError,
    isMutating: addProductMutation.isPending || addItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending,
    errorMessage: providerSelection.errorMessage ?? (firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el carrito').message
      : undefined),
    mutationErrorMessage: mutationError
      ? normalizeApiError(mutationError, 'No se pudo actualizar el carrito').message
      : undefined,
    refetch: () => {
      providerSelection.refetchProviders();
      cartQuery.refetch();
    },
    addItem: addItemMutation.mutate,
    addProductToCart: (request: AddProductToCartRequest) => addProductMutation.mutateAsync(request),
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
  };
}
