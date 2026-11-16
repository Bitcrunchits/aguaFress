import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_PRODUCTS_URL = `${API_CONFIG.baseUrl}/api/v1/products/list`;

export interface AdminProductosListFilters {
  vendedorId?: string;
  page?: number;
  limit?: number;
}

/**
 * Super-admin product catalog list against the gateway `products.list` action.
 * The gateway resolves the authenticated user from the JWT and, for a
 * super_admin token, leaves the vendor scope null, so `vendedorId` filters
 * freely. When `vendedorId` is omitted the backend returns every product.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductosService {
  private readonly http = inject(HttpClient);

  list(filters: AdminProductosListFilters): Observable<PaginatedResponse<ProductResponse>> {
    return this.http.get<PaginatedResponse<ProductResponse>>(LIST_PRODUCTS_URL, {
      params: buildProductosQueryParams(filters),
    });
  }
}

function buildProductosQueryParams(filters: AdminProductosListFilters): HttpParams {
  let params = new HttpParams();
  if (filters.vendedorId !== undefined) {
    params = params.set('vendedorId', filters.vendedorId);
  }
  if (filters.page !== undefined) {
    params = params.set('page', String(filters.page));
  }
  if (filters.limit !== undefined) {
    params = params.set('limit', String(filters.limit));
  }
  return params;
}
