import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { VendedorEstado } from '@agua/contracts';
import type {
  SuperAdminVendedorItem,
  SuperAdminVendedorListFilters,
  SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const VENDEDORES_LIST_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/list`;
const VENDEDORES_CHANGE_ESTADO_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/change-estado`;

/**
 * Super-admin vendedores list against the gateway `vendedores.list` action.
 *
 * Filters travel in the JSON body and are mirrored into the query string:
 * the gateway forwards a POST body as `payload.body`, while the
 * usuario-service TCP handler validates `payload.query`
 * (usuario-domain-tcp.controller.ts `vendedores.list`), so body-only
 * filters would be silently ignored by the real backend.
 */
@Injectable({ providedIn: 'root' })
export class AdminVendedoresService {
  private readonly http = inject(HttpClient);

  list(filters: SuperAdminVendedorListFilters): Observable<SuperAdminVendedorListResponse> {
    return this.http.post<SuperAdminVendedorListResponse>(VENDEDORES_LIST_URL, filters, {
      params: mirrorFiltersAsQueryParams(filters),
    });
  }

  /**
   * Change a vendedor's estado against the gateway `vendedores.change-estado`
   * action. The id travels in the path and the target estado in the JSON body,
   * matching the HTTP contract `PATCH /api/v1/vendedores/change-estado/{id}`.
   *
   * The backend responds with the updated vendedor row (OpenAPI `VendedorListItem`),
   * not a shaped action response. The caller uses its own validated target, so
   * the body is typed here for completeness only.
   */
  changeEstado(
    id: string,
    body: { estado: VendedorEstado },
  ): Observable<SuperAdminVendedorItem> {
    return this.http.patch<SuperAdminVendedorItem>(
      `${VENDEDORES_CHANGE_ESTADO_URL}/${id}`,
      body,
    );
  }
}

function mirrorFiltersAsQueryParams(filters: SuperAdminVendedorListFilters): HttpParams {
  let params = new HttpParams();
  if (filters.page !== undefined) {
    params = params.set('page', String(filters.page));
  }
  if (filters.limit !== undefined) {
    params = params.set('limit', String(filters.limit));
  }
  if (filters.estado !== undefined) {
    params = params.set('estado', filters.estado);
  }
  if (filters.search !== undefined) {
    params = params.set('search', filters.search);
  }
  return params;
}
