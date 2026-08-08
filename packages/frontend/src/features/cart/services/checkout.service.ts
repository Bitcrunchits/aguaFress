import type { AsyncAcceptedResponse, CreateOrderV2Request, OrderJobStatusResponse } from '@agua/contracts';
import api from '../../../services/api';

export async function createCheckoutOrder(
  request: CreateOrderV2Request,
  idempotencyKey: string
): Promise<AsyncAcceptedResponse> {
  const response = await api.post<AsyncAcceptedResponse>('/orders/create', request, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
}

export async function getCheckoutOrderJobStatus(trackingId: string): Promise<OrderJobStatusResponse> {
  const response = await api.get<OrderJobStatusResponse>('/orders/job-status', { params: { id: trackingId } });
  return response.data;
}
