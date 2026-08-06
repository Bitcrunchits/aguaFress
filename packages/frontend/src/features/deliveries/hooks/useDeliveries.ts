import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DeliveryJobStatus } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { getDeliveryJobStatus, listDeliveries, updateDeliveryStatus, type UpdateDeliveryStatusCommand } from '../services/deliveries.service';

const DELIVERY_TERMINAL_STATUSES = new Set<DeliveryJobStatus>([
  DeliveryJobStatus.COMPLETED,
  DeliveryJobStatus.FAILED,
  DeliveryJobStatus.DEAD_LETTER,
]);

const DELIVERIES_QUERY_KEYS = {
  list: ['deliveries', 'list'] as const,
  job: (trackingId?: string) => ['deliveries', 'job', trackingId] as const,
} as const;

function createBrowserIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDeliveries() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(createBrowserIdempotencyKey());
  const [trackingId, setTrackingId] = useState<string>();

  const deliveriesQuery = useQuery({
    queryKey: DELIVERIES_QUERY_KEYS.list,
    queryFn: () => listDeliveries({ page: 1, limit: 20 }),
    staleTime: 30_000,
  });

  const jobQuery = useQuery({
    queryKey: DELIVERIES_QUERY_KEYS.job(trackingId),
    queryFn: () => getDeliveryJobStatus(trackingId ?? ''),
    enabled: Boolean(trackingId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !DELIVERY_TERMINAL_STATUSES.has(status) ? 2_000 : false;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (request: UpdateDeliveryStatusCommand) => updateDeliveryStatus(request, idempotencyKeyRef.current),
    onSuccess: (accepted) => {
      setTrackingId(accepted.trackingId);
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEYS.list });
    },
  });

  const currentJobStatus = jobQuery.data?.status;
  useEffect(() => {
    if (currentJobStatus !== undefined && DELIVERY_TERMINAL_STATUSES.has(currentJobStatus)) {
      idempotencyKeyRef.current = createBrowserIdempotencyKey();
    }
  }, [currentJobStatus]);

  const firstError = deliveriesQuery.error ?? updateStatusMutation.error ?? jobQuery.error;

  return {
    deliveries: deliveriesQuery.data?.data ?? [],
    pagination: deliveriesQuery.data?.pagination ?? null,
    job: jobQuery.data,
    isLoading: deliveriesQuery.isLoading,
    isError: deliveriesQuery.isError,
    isUpdatingStatus: updateStatusMutation.isPending,
    errorMessage: firstError ? normalizeApiError(firstError, 'No se pudieron cargar las entregas').message : undefined,
    refetch: deliveriesQuery.refetch,
    updateStatus: updateStatusMutation.mutate,
  };
}
