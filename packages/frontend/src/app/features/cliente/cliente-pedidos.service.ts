import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  CancelOrderRequest,
  OrderJobStatusResponse,
  OrderListResponseV2,
  OrderResponse,
  PaginatedResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type {
  ClientePedidoCancelGateway,
  ClientePedidosDetailGateway,
  ClientePedidosGateway,
  ClientePedidosListGateway,
  ClientePedidosTrackingGateway,
} from './cliente-pedidos.gateway';

const LIST_ORDERS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/list`;
const GET_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/get-by-id`;
const GET_JOB_STATUS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/job-status`;
const CANCEL_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/cancel`;

/**
 * Orders read HTTP access for the authenticated cliente. Identity always comes
 * from the JWT: no request carries `clienteId` or `userId`, and every id is
 * sent as an encoded query param, never as a path segment.
 */
@Injectable({ providedIn: 'root' })
export class ClientePedidosService
  implements
    ClientePedidosGateway,
    ClientePedidosListGateway,
    ClientePedidosTrackingGateway,
    ClientePedidosDetailGateway,
    ClientePedidoCancelGateway
{
  private readonly http = inject(HttpClient);

  listOrders(): Observable<PaginatedResponse<OrderListResponseV2>> {
    return this.http.get<PaginatedResponse<OrderListResponseV2>>(LIST_ORDERS_URL);
  }

  getOrder(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${GET_ORDER_URL}?id=${encodeURIComponent(orderId)}`);
  }

  getJobStatus(trackingId: string): Observable<OrderJobStatusResponse> {
    return this.http.get<OrderJobStatusResponse>(
      `${GET_JOB_STATUS_URL}?id=${encodeURIComponent(trackingId)}`,
    );
  }

  cancelOrder(request: CancelOrderRequest): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(CANCEL_ORDER_URL, request);
  }
}
