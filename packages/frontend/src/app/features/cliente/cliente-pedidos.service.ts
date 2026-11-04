import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { OrderJobStatusResponse, OrderResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type {
  ClientePedidosDetailGateway,
  ClientePedidosGateway,
  ClientePedidosListGateway,
  ClientePedidosTrackingGateway,
} from './cliente-pedidos.gateway';

const LIST_ORDERS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/list`;
const GET_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/get-by-id`;
const GET_JOB_STATUS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/job-status`;

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
    ClientePedidosDetailGateway
{
  private readonly http = inject(HttpClient);

  listOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(LIST_ORDERS_URL);
  }

  getOrder(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${GET_ORDER_URL}?id=${encodeURIComponent(orderId)}`);
  }

  getJobStatus(trackingId: string): Observable<OrderJobStatusResponse> {
    return this.http.get<OrderJobStatusResponse>(
      `${GET_JOB_STATUS_URL}?id=${encodeURIComponent(trackingId)}`,
    );
  }
}
