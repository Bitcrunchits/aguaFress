import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CartResponse, DeleteCartItemV2Request, UpdateCartItemV2Request } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClienteCarritoEdicionGateway } from './cliente-carrito-edicion.gateway';

const UPDATE_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/update`;
const DELETE_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/delete`;

/**
 * Cart item mutation HTTP access. Both operations are provider-scoped and
 * answer with the updated cart.
 *
 * The delete body carries only `cartId`, `vendedorId` and `productoId` —
 * the backend rejects unexpected fields, so `cantidad` is never sent.
 */
@Injectable({ providedIn: 'root' })
export class ClienteCarritoEdicionService implements ClienteCarritoEdicionGateway {
  private readonly http = inject(HttpClient);

  updateItem(request: UpdateCartItemV2Request): Observable<CartResponse> {
    return this.http.patch<CartResponse>(UPDATE_CART_ITEM_URL, request);
  }

  deleteItem(request: DeleteCartItemV2Request): Observable<CartResponse> {
    return this.http.delete<CartResponse>(DELETE_CART_ITEM_URL, {
      body: request,
    });
  }
}
