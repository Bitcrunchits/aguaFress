import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AsyncAcceptedResponse, CreateOrderV2Request } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClientePedidoGateway } from './cliente-pedido.gateway';

const CREATE_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/create`;

/**
 * Order creation HTTP access. The cliente identity comes from the JWT, so the
 * body only carries the provider scope, payment method and delivery address.
 * The gateway requires the `Idempotency-Key` header and replies `202`.
 */
@Injectable({ providedIn: 'root' })
export class ClientePedidoService implements ClientePedidoGateway {
  private readonly http = inject(HttpClient);

  createOrder(
    request: CreateOrderV2Request,
    idempotencyKey: string,
  ): Observable<AsyncAcceptedResponse> {
    return this.http.post<AsyncAcceptedResponse>(CREATE_ORDER_URL, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
}
