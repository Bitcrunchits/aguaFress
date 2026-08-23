import type {
  AsyncAcceptedResponse,
  CreateOrderV2Request,
  CancelOrderRequest,
  OrderJobStatusResponse,
  OrderListResponse,
  OrderResponse,
  UpdateOrderStatusRequest,
} from '@agua/contracts';
import api from '../../../services/api';

export interface OrderListFilters {
  page?: number;
  limit?: number;
  vendedorId?: string;
}

export async function listOrders(filters: OrderListFilters = {}): Promise<OrderListResponse[]> {
  const response = await api.get<OrderListResponse[]>('/orders/list', { params: filters });
  return response.data;
}

export async function getOrder(orderId: string): Promise<OrderResponse> {
  const response = await api.get<OrderResponse>(`/orders/get-by-id/${orderId}`);
  return response.data;
}

export async function updateOrderStatus(request: UpdateOrderStatusRequest): Promise<OrderResponse> {
  const response = await api.patch<OrderResponse>('/orders/status/update', request);
  return response.data;
}

export async function cancelOrder(request: CancelOrderRequest): Promise<OrderResponse> {
  const response = await api.post<OrderResponse>('/orders/cancel', request);
  return response.data;
}

export async function confirmOrder(orderId: string): Promise<OrderResponse> {
  const response = await api.post<OrderResponse>('/orders/confirm', { id: orderId });
  return response.data;
}

export async function createOrder(request: CreateOrderV2Request, idempotencyKey: string): Promise<AsyncAcceptedResponse> {
  const response = await api.post<AsyncAcceptedResponse>('/orders/create', request, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
}

export async function getOrderJobStatus(trackingId: string): Promise<OrderJobStatusResponse> {
  const response = await api.get<OrderJobStatusResponse>('/orders/job-status', { params: { id: trackingId } });
  return response.data;
}
