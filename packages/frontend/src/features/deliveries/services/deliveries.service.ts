import type {
  DeliveryJobStatusResponse,
  DeliveryListFilters,
  DeliveryResponse,
  PaginatedResponse,
  UpdateDeliveryStatusRequest,
} from '@agua/contracts';
import api from '../../../services/api';

export interface AsyncDeliveryAcceptedResponse {
  jobId: string;
  trackingId: string;
  status: DeliveryJobStatusResponse['status'];
  statusUrl: string;
  acceptedAt: string;
}

export interface UpdateDeliveryStatusCommand extends UpdateDeliveryStatusRequest {
  id: string;
}

export async function listDeliveries(filters: DeliveryListFilters = {}): Promise<PaginatedResponse<DeliveryResponse>> {
  const response = await api.get<PaginatedResponse<DeliveryResponse>>('/deliveries/list', { params: filters });
  return response.data;
}

export async function updateDeliveryStatus(
  request: UpdateDeliveryStatusCommand,
  idempotencyKey: string,
): Promise<AsyncDeliveryAcceptedResponse> {
  const response = await api.patch<AsyncDeliveryAcceptedResponse>('/deliveries/update-status', request, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
}

export async function getDeliveryJobStatus(trackingId: string): Promise<DeliveryJobStatusResponse> {
  const response = await api.get<DeliveryJobStatusResponse>('/deliveries/job-status', { params: { id: trackingId } });
  return response.data;
}
