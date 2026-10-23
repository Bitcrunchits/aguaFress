import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AddCartItemV2Request, CartResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClienteCarritoGateway } from './cliente-carrito.gateway';

const ADD_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/add`;

/**
 * Cart write HTTP access. The backend reads the cliente identity from the
 * JWT and returns `CartResponse` directly (no `{ data }` envelope). The body
 * is provider-scoped and never carries identity fields.
 */
@Injectable({ providedIn: 'root' })
export class ClienteCarritoService implements ClienteCarritoGateway {
  private readonly http = inject(HttpClient);

  addToCart(request: AddCartItemV2Request): Observable<CartResponse> {
    return this.http.post<CartResponse>(ADD_CART_ITEM_URL, request);
  }
}
