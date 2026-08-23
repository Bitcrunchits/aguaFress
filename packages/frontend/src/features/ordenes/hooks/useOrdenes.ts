import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderEstado, OrderJobStatus, type CreateOrderV2Request } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { cancelOrder, confirmOrder, createOrder, getOrder, getOrderJobStatus, listOrders, updateOrderStatus } from '../services/ordenes.service';

const ORDER_TERMINAL_STATUSES = new Set<OrderJobStatus>([
  OrderJobStatus.COMPLETED,
  OrderJobStatus.FAILED,
  OrderJobStatus.DEAD_LETTER,
]);

const ORDENES_QUERY_KEYS = {
  list: ['ordenes', 'list'] as const,
  detail: (orderId?: string) => ['ordenes', 'detail', orderId] as const,
  job: (trackingId?: string) => ['ordenes', 'job', trackingId] as const,
} as const;

function createBrowserIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useOrdenes() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(createBrowserIdempotencyKey());
  const [trackingId, setTrackingId] = useState<string>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();

  const ordersQuery = useQuery({
    queryKey: ORDENES_QUERY_KEYS.list,
    queryFn: () => listOrders({ page: 1, limit: 20 }),
    staleTime: 30_000,
  });

  const jobQuery = useQuery({
    queryKey: ORDENES_QUERY_KEYS.job(trackingId),
    queryFn: () => getOrderJobStatus(trackingId ?? ''),
    enabled: Boolean(trackingId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !ORDER_TERMINAL_STATUSES.has(status) ? 2_000 : false;
    },
  });

  const orderDetailQuery = useQuery({
    queryKey: ORDENES_QUERY_KEYS.detail(selectedOrderId),
    queryFn: () => getOrder(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId),
    staleTime: 30_000,
  });

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ORDENES_QUERY_KEYS.list });
    if (selectedOrderId !== undefined) {
      queryClient.invalidateQueries({ queryKey: ORDENES_QUERY_KEYS.detail(selectedOrderId) });
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: (request: CreateOrderV2Request) => createOrder(request, idempotencyKeyRef.current),
    onSuccess: (accepted) => {
      setTrackingId(accepted.trackingId);
      invalidateOrders();
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: confirmOrder,
    onSuccess: invalidateOrders,
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => cancelOrder({ id: orderId }),
    onSuccess: invalidateOrders,
  });

  const markInTransitMutation = useMutation({
    mutationFn: (orderId: string) => updateOrderStatus({ id: orderId, estado: OrderEstado.EN_CAMINO }),
    onSuccess: invalidateOrders,
  });

  const currentJobStatus = jobQuery.data?.status;
  useEffect(() => {
    if (currentJobStatus !== undefined && ORDER_TERMINAL_STATUSES.has(currentJobStatus)) {
      idempotencyKeyRef.current = createBrowserIdempotencyKey();
    }
  }, [currentJobStatus]);

  const firstError = ordersQuery.error
    ?? orderDetailQuery.error
    ?? createOrderMutation.error
    ?? confirmOrderMutation.error
    ?? cancelOrderMutation.error
    ?? markInTransitMutation.error
    ?? jobQuery.error;

  return {
    orders: ordersQuery.data ?? [],
    selectedOrder: orderDetailQuery.data,
    job: jobQuery.data,
    isLoading: ordersQuery.isLoading,
    isLoadingDetail: orderDetailQuery.isLoading,
    isError: ordersQuery.isError,
    isDetailError: orderDetailQuery.isError,
    isMutatingOrder: createOrderMutation.isPending || confirmOrderMutation.isPending || cancelOrderMutation.isPending || markInTransitMutation.isPending,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudieron cargar las órdenes').message : undefined,
    refetch: ordersQuery.refetch,
    refetchDetail: orderDetailQuery.refetch,
    selectOrder: setSelectedOrderId,
    createOrder: createOrderMutation.mutate,
    confirmOrder: confirmOrderMutation.mutate,
    cancelOrder: cancelOrderMutation.mutate,
    markInTransit: markInTransitMutation.mutate,
  };
}
