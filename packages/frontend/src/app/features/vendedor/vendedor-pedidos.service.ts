import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { OrderEstado } from '@agua/contracts';
import type {
  ConfirmOrderResponse,
  OrderListResponseV2,
  OrderResponse,
  OrderResponseV2,
  PaginatedResponse,
  UpdateOrderStatusRequest,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_ORDERS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/list`;
const GET_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/get-by-id`;
const CONFIRM_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/confirm`;
const UPDATE_ORDER_STATUS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/status/update`;

/**
 * Vendedor order HTTP access against the gateway `orders.*` actions.
 * The authenticated vendedor is resolved from the JWT server-side, so no
 * `vendedorId` or `userId` is ever sent in a query or body. `orders.list` now
 * returns the paginated `OrderListResponseV2` shape (server-resolved names),
 * but no `page`/`limit`/`estado` params are sent: the page keeps filtering and
 * paginating client-side. Real server pagination is tracked separately.
 */
@Injectable({ providedIn: 'root' })
export class VendedorPedidosService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResponse<OrderListResponseV2>> {
    return this.http.get<PaginatedResponse<OrderListResponseV2>>(LIST_ORDERS_URL);
  }

  getById(orderId: string): Observable<OrderResponseV2> {
    return this.http.get<OrderResponseV2>(`${GET_ORDER_URL}?id=${encodeURIComponent(orderId)}`);
  }

  confirm(orderId: string): Observable<ConfirmOrderResponse> {
    return this.http.patch<ConfirmOrderResponse>(CONFIRM_ORDER_URL, { id: orderId });
  }

  updateStatus(orderId: string, estado: OrderEstado, notas?: string): Observable<OrderResponse> {
    const body: UpdateOrderStatusRequest = notas === undefined
      ? { id: orderId, estado }
      : { id: orderId, estado, notas };
    return this.http.patch<OrderResponse>(UPDATE_ORDER_STATUS_URL, body);
  }
}
