import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OrderJobStatus,
  type AddCartItemV2Request,
  type CreateOrderV2Request,
  type DeleteCartItemV2Request,
  type UpdateCartItemV2Request,
} from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { useClienteProviderSelection } from '../../clientes/hooks/useClienteProviderSelection';
import { addCartItem, deleteCartItem, getCart, updateCartItem } from '../services/cart.service';
import { createCheckoutOrder, getCheckoutOrderJobStatus } from '../services/checkout.service';

type AddProductToCartRequest = Omit<AddCartItemV2Request, 'vendedorId'>;

const ORDER_JOB_TERMINAL_STATUSES = new Set<OrderJobStatus>([
  OrderJobStatus.COMPLETED,
  OrderJobStatus.FAILED,
  OrderJobStatus.DEAD_LETTER,
]);

const CART_QUERY_KEYS = {
  cart: (vendedorId?: string) => ['cart', 'detail', vendedorId] as const,
  checkoutJob: (trackingId?: string) => ['cart', 'checkout-job', trackingId] as const,
} as const;

function createBrowserIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useCart() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(createBrowserIdempotencyKey());
  const [checkoutTrackingId, setCheckoutTrackingId] = useState<string>();
  const providerSelection = useClienteProviderSelection();
  const vendedorId = providerSelection.selectedVendedorId;

  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEYS.cart(vendedorId),
    queryFn: () => getCart(vendedorId ?? ''),
    enabled: Boolean(vendedorId),
    staleTime: 30_000,
  });

  const checkoutJobQuery = useQuery({
    queryKey: CART_QUERY_KEYS.checkoutJob(checkoutTrackingId),
    queryFn: () => getCheckoutOrderJobStatus(checkoutTrackingId ?? ''),
    enabled: Boolean(checkoutTrackingId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !ORDER_JOB_TERMINAL_STATUSES.has(status) ? 2_000 : false;
    },
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

  const checkoutMutation = useMutation({
    mutationFn: (request: CreateOrderV2Request) => createCheckoutOrder(request, idempotencyKeyRef.current),
    onSuccess: (accepted) => {
      setCheckoutTrackingId(accepted.trackingId);
    },
  });

  const checkoutJobStatus = checkoutJobQuery.data?.status;
  useEffect(() => {
    if (checkoutJobStatus !== undefined && ORDER_JOB_TERMINAL_STATUSES.has(checkoutJobStatus)) {
      idempotencyKeyRef.current = createBrowserIdempotencyKey();
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cart(vendedorId) });
    }
  }, [checkoutJobStatus, queryClient, vendedorId]);

  const mutationError = addProductMutation.error ?? addItemMutation.error ?? updateItemMutation.error ?? deleteItemMutation.error;
  const checkoutError = checkoutMutation.error ?? checkoutJobQuery.error;

  return {
    providers: providerSelection.providers,
    selectedProvider: providerSelection.selectedProvider,
    selectedVendedorId: providerSelection.selectedVendedorId,
    isProviderSelectionRequired: providerSelection.isProviderSelectionRequired,
    cart: cartQuery.data,
    isLoading: providerSelection.isLoading || cartQuery.isLoading,
    isError: providerSelection.isError || cartQuery.isError,
    isMutating: addProductMutation.isPending || addItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending,
    isCheckingOut: checkoutMutation.isPending,
    isSelectingProvider: providerSelection.isSelectingProvider,
    errorMessage: providerSelection.errorMessage ?? (firstError
      ? normalizeApiError(firstError, 'No se pudo cargar el carrito').message
      : undefined),
    mutationErrorMessage: mutationError
      ? normalizeApiError(mutationError, 'No se pudo actualizar el carrito').message
      : undefined,
    checkoutErrorMessage: checkoutError
      ? normalizeApiError(checkoutError, 'No se pudo crear el pedido').message
      : undefined,
    checkoutJob: checkoutJobQuery.data,
    refetch: () => {
      providerSelection.refetchProviders();
      cartQuery.refetch();
    },
    selectProvider: providerSelection.selectProvider,
    addItem: addItemMutation.mutate,
    addProductToCart: (request: AddProductToCartRequest) => addProductMutation.mutateAsync(request),
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    checkoutOrder: (request: CreateOrderV2Request) => checkoutMutation.mutateAsync(request),
  };
}
