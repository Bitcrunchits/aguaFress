import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AddCartItemV2Request, CartResponse } from '@agua/contracts';

/**
 * Cart write contract. Kept in its own module so catalog and cart
 * capabilities can change independently, and the request shape stays
 * provider-scoped without exposing identity fields.
 */
export interface ClienteCarritoGateway {
  addToCart(request: AddCartItemV2Request): Observable<CartResponse>;
}

export const CLIENTE_CARRITO_GATEWAY = new InjectionToken<ClienteCarritoGateway>(
  'CLIENTE_CARRITO_GATEWAY',
);
