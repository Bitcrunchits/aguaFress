import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CartResponse, DeleteCartItemV2Request, UpdateCartItemV2Request } from '@agua/contracts';

/**
 * Cart item mutation contract. Kept apart from reads so a consumer that only
 * edits quantities never depends on the read shape.
 */
export interface ClienteCarritoEdicionGateway {
  updateItem(request: UpdateCartItemV2Request): Observable<CartResponse>;
  deleteItem(request: DeleteCartItemV2Request): Observable<CartResponse>;
}

export const CLIENTE_CARRITO_EDICION_GATEWAY =
  new InjectionToken<ClienteCarritoEdicionGateway>('CLIENTE_CARRITO_EDICION_GATEWAY');
