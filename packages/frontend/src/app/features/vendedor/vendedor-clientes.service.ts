import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PaginatedResponse, VendedorClienteItem } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const CARTERA_URL = `${API_CONFIG.baseUrl}/api/v1/clientes/cartera`;

export interface VendedorClientesFilters {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Vendedor access to their own client cartera against the gateway
 * `clientes.cartera` action. The `vendedorId` is resolved from the JWT
 * server-side, so only the pagination and search filters travel as query
 * params — never an identity field.
 */
@Injectable({ providedIn: 'root' })
export class VendedorClientesService {
  private readonly http = inject(HttpClient);

  listCartera(filters: VendedorClientesFilters): Observable<PaginatedResponse<VendedorClienteItem>> {
    let params = new HttpParams();
    if (filters.page !== undefined) {
      params = params.set('page', String(filters.page));
    }
    if (filters.limit !== undefined) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters.search !== undefined) {
      params = params.set('search', filters.search);
    }
    return this.http.get<PaginatedResponse<VendedorClienteItem>>(CARTERA_URL, { params });
  }
}
