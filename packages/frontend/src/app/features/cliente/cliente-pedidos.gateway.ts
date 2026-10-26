import type { Observable } from 'rxjs';
import type { OrderJobStatusResponse, OrderResponse } from '@agua/contracts';

/**
 * Orders read contract for the authenticated cliente. The backend scopes every
 * query by the JWT identity, so the port never receives an order owner.
 */
export interface ClientePedidosGateway {
  listOrders(): Observable<OrderResponse[]>;
  getOrder(orderId: string): Observable<OrderResponse>;
  getJobStatus(trackingId: string): Observable<OrderJobStatusResponse>;
}

