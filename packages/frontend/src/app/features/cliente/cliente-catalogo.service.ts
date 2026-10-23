import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import type { ClienteCatalogoGateway, ClienteCatalogoSearchGateway } from './cliente-catalogo.gateway';

const LIST_PRODUCTS_URL = `${API_CONFIG.baseUrl}/api/v1/products/list`;
const SEARCH_PRODUCTS_URL = `${API_CONFIG.baseUrl}/api/v1/products/search`;

/**
 * Cliente catalog HTTP access. The selected domain `vendedorId` is an
 * explicit query param; auth identity comes from the JWT, never from the
 * request. The backend returns the paginated DTO directly (no `{ data }`
 * envelope).
 */
@Injectable({ providedIn: 'root' })
export class ClienteCatalogoService
  implements ClienteCatalogoGateway, ClienteCatalogoSearchGateway
{
  private readonly http = inject(HttpClient);

  list(
    vendedorId: string,
    page = 1,
    limit = 20,
  ): Observable<PaginatedResponse<ProductResponse>> {
    const params = new HttpParams()
      .set('vendedorId', vendedorId)
      .set('page', page)
      .set('limit', limit);
    return this.http.get<PaginatedResponse<ProductResponse>>(LIST_PRODUCTS_URL, { params });
  }

  /**
   * Verified contract (`odd/tasks/ag-204-cliente-catalogo-carrito.md`,
   * "Verified backend behavior"): `GET /api/v1/products/search` requires a
   * non-empty `q` (max 200); `vendedorId`, `page`, and `limit` are optional.
   * The backend returns `PaginatedResponse<ProductResponse>` directly (no
   * `{ data }` envelope) and always filters `activo: true`. A stale provider
   * is reported as 404 or 400 `requiresSelection`, which the facade handles.
   */
  search(
    query: string,
    vendedorId: string,
    page = 1,
    limit = 20,
  ): Observable<PaginatedResponse<ProductResponse>> {
    const params = new HttpParams()
      .set('q', query)
      .set('vendedorId', vendedorId)
      .set('page', page)
      .set('limit', limit);
    return this.http.get<PaginatedResponse<ProductResponse>>(SEARCH_PRODUCTS_URL, { params });
  }
}
