import { InjectionToken } from '@angular/core';
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

/**
 * List capability for consumers that only render the orders list. Order
 * detail and polling are separate contracts.
 */
export interface ClientePedidosListGateway {
  listOrders(): Observable<OrderResponse[]>;
}

/**
 * Polling capability for consumers that follow async order jobs. The list
 * view must not depend on job status, and the tracking view must not depend
 * on the full orders list.
 */
export interface ClientePedidosTrackingGateway {
  getJobStatus(trackingId: string): Observable<OrderJobStatusResponse>;
}

/**
 * Detail capability for consumers that only render a single order. The
 * orders list and the polling view must not depend on this contract.
 */
export interface ClientePedidosDetailGateway {
  getOrder(orderId: string): Observable<OrderResponse>;
}

export const CLIENTE_PEDIDOS_LIST_GATEWAY = new InjectionToken<ClientePedidosListGateway>(
  'CLIENTE_PEDIDOS_LIST_GATEWAY',
);

export const CLIENTE_PEDIDOS_TRACKING_GATEWAY =
  new InjectionToken<ClientePedidosTrackingGateway>('CLIENTE_PEDIDOS_TRACKING_GATEWAY');

export const CLIENTE_PEDIDOS_DETAIL_GATEWAY =
  new InjectionToken<ClientePedidosDetailGateway>('CLIENTE_PEDIDOS_DETAIL_GATEWAY');
