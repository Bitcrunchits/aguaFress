import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CartResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClienteCarritoLecturaGateway } from './cliente-carrito-lectura.gateway';

const CART_GET_URL = `${API_CONFIG.baseUrl}/api/v1/cart/get`;

/**
 * Cart read HTTP access. Scoped by the selected provider; the cliente
 * identity comes from the JWT. A missing active cart answers `null`.
 */
@Injectable({ providedIn: 'root' })
export class ClienteCarritoLecturaService implements ClienteCarritoLecturaGateway {
  private readonly http = inject(HttpClient);

  getCart(vendedorId: string): Observable<CartResponse | null> {
    return this.http.get<CartResponse | null>(CART_GET_URL, {
      params: { vendedorId },
    });
  }
}
