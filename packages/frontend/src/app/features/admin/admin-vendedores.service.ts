import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  SuperAdminVendedorListFilters,
  SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const VENDEDORES_LIST_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/list`;

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
