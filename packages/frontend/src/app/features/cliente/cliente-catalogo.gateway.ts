import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';

/**
 * Literal server messages the catalog must react to. `products.list`
 * returns `requiresSelection` as a plain 400 message, not a structured
 * error code, so the facade compares against this typed value.
 */
export enum ClienteCatalogoServerMessage {
  RequiresSelection = 'requiresSelection',
}

/**
 * Catalog read contract consumed by the cliente facade. The concrete HTTP
 * service is bound to this token at the page boundary, so the facade
 * depends on the abstraction rather than a concrete implementation.
 */
export interface ClienteCatalogoGateway {
  list(
    vendedorId: string,
    page?: number,
    limit?: number,
  ): Observable<PaginatedResponse<ProductResponse>>;
}

export const CLIENTE_CATALOGO_GATEWAY = new InjectionToken<ClienteCatalogoGateway>(
  'CLIENTE_CATALOGO_GATEWAY',
);
