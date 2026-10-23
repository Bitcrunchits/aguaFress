import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';

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

/**
 * Search is a separate read capability so list-only consumers never have
 * to implement or depend on it.
 */
export interface ClienteCatalogoSearchGateway {
  search(
    query: string,
    vendedorId: string,
    page?: number,
    limit?: number,
  ): Observable<PaginatedResponse<ProductResponse>>;
}

export const CLIENTE_CATALOGO_GATEWAY = new InjectionToken<ClienteCatalogoGateway>(
  'CLIENTE_CATALOGO_GATEWAY',
);

export const CLIENTE_CATALOGO_SEARCH_GATEWAY =
  new InjectionToken<ClienteCatalogoSearchGateway>('CLIENTE_CATALOGO_SEARCH_GATEWAY');
