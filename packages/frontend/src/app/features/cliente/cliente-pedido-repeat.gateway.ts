import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AddCartItemV2Request, CartResponse } from '@agua/contracts';

/**
 * Single-item add contract consumed by the repeat-order flow. Kept apart from
 * the cart read/write ports so repeating a past order never depends on the
 * catalog or cart-read capabilities.
 */
export interface ClientePedidoRepeatGateway {
  addItem(request: AddCartItemV2Request): Observable<CartResponse>;
}

export const CLIENTE_PEDIDO_REPEAT_GATEWAY =
  new InjectionToken<ClientePedidoRepeatGateway>('CLIENTE_PEDIDO_REPEAT_GATEWAY');
