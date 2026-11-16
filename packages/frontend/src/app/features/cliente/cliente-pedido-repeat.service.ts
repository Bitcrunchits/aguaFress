import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AddCartItemV2Request, CartResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClientePedidoRepeatGateway } from './cliente-pedido-repeat.gateway';

const ADD_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/add`;

/**
 * Repeat-order HTTP access. Each item is re-added through the same
 * single-item `cart.items/add` call the catalog uses: the backend re-validates
 * price, stock and provider, so the request body carries only the provider and
 * the product, never identity fields.
 */
@Injectable({ providedIn: 'root' })
export class ClientePedidoRepeatService implements ClientePedidoRepeatGateway {
  private readonly http = inject(HttpClient);

  addItem(request: AddCartItemV2Request): Observable<CartResponse> {
    return this.http.post<CartResponse>(ADD_CART_ITEM_URL, request);
  }
}
