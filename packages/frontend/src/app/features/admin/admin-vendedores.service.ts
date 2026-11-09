import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  SuperAdminVendedorListFilters,
  SuperAdminVendedorListResponse,
  VendedorEstado,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const VENDEDORES_LIST_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/list`;

@Injectable({ providedIn: 'root' })
export class AdminVendedoresService {
  private readonly http = inject(HttpClient);

  list(filters: SuperAdminVendedorListFilters): Observable<SuperAdminVendedorListResponse> {
    return this.http.post<SuperAdminVendedorListResponse>(VENDEDORES_LIST_URL, filters, {
      params: mirrorFiltersAsQueryParams(filters),
    });
  }

  changeEstado(id: string, estado: VendedorEstado): Observable<any> {
    return this.http.patch<any>(`${API_CONFIG.baseUrl}/api/v1/vendedores/${id}/estado`, { estado });
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
