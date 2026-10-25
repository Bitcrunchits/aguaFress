import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AsyncAcceptedResponse, CreateOrderV2Request } from '@agua/contracts';

/**
 * Order creation contract. The gateway requires an `Idempotency-Key` header
 * and answers `202` with the async acceptance, never with the final order.
 */
export interface ClientePedidoGateway {
  createOrder(
    request: CreateOrderV2Request,
    idempotencyKey: string,
  ): Observable<AsyncAcceptedResponse>;
}

export const CLIENTE_PEDIDO_GATEWAY = new InjectionToken<ClientePedidoGateway>(
  'CLIENTE_PEDIDO_GATEWAY',
);
