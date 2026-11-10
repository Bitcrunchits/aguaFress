import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { OrderResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_ORDERS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/list`;

/**
 * Vendedor order read HTTP access against the gateway `orders.list` action.
 * The authenticated vendedor is resolved from the JWT server-side, so no
 * `vendedorId` or `userId` is ever sent in a query or body. The endpoint is
 * currently unpaginated and unfiltered: it returns the full `OrderResponse[]`
 * for the vendedor's domain, and the page paginates/filters client-side.
 */
@Injectable({ providedIn: 'root' })
export class VendedorPedidosService {
  private readonly http = inject(HttpClient);

  list(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(LIST_ORDERS_URL);
  }
}
