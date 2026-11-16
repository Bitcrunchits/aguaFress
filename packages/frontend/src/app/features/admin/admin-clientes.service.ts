import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  SuperAdminClienteListFilters,
  SuperAdminClientesResponseV2,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const CLIENTES_LIST_URL = `${API_CONFIG.baseUrl}/api/v1/clientes/list`;

/**
 * Super-admin clientes list against the gateway `clientes.list` action.
 * This is a GET endpoint, so filters travel in the query string. The response
 * is the raw CLIENTE row shape (`SuperAdminClienteItemV2`) — no `email`, no
 * `fechaAsignacion`.
 */
@Injectable({ providedIn: 'root' })
export class AdminClientesService {
  private readonly http = inject(HttpClient);

  list(filters: SuperAdminClienteListFilters): Observable<SuperAdminClientesResponseV2> {
    return this.http.get<SuperAdminClientesResponseV2>(CLIENTES_LIST_URL, {
      params: buildClientesQueryParams(filters),
    });
  }
}

function buildClientesQueryParams(filters: SuperAdminClienteListFilters): HttpParams {
  let params = new HttpParams();
  if (filters.page !== undefined) {
    params = params.set('page', String(filters.page));
  }
  if (filters.limit !== undefined) {
    params = params.set('limit', String(filters.limit));
  }
  if (filters.vendedorId !== undefined) {
    params = params.set('vendedorId', filters.vendedorId);
  }
  if (filters.search !== undefined) {
    params = params.set('search', filters.search);
  }
  return params;
}
