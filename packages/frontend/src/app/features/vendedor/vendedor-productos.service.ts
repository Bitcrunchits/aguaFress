import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  CategoriaResponse,
  CreateProductRequest,
  PaginatedResponse,
  ProductResponse,
  UpdateProductRequest,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PRODUCTS_URL = `${API_CONFIG.baseUrl}/api/v1/products`;
const CATEGORIES_LIST_URL = `${API_CONFIG.baseUrl}/api/v1/categories/list`;

/**
 * Vendedor own-products access against the gateway `products.*` actions.
 *
 * Identity comes only from the JWT: `products.list` and `categories.list`
 * resolve the vendedor server-side, so no `vendedorId` is ever sent, and
 * mutation bodies never carry `vendedorId` or `userId`.
 *
 * The gateway routes by action name, not REST ids, so get/update/delete
 * carry the product id as the `id` query param.
 */
@Injectable({ providedIn: 'root' })
export class VendedorProductosService {
  private readonly http = inject(HttpClient);

  list(page = 1, limit = 10): Observable<PaginatedResponse<ProductResponse>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<ProductResponse>>(`${PRODUCTS_URL}/list`, { params });
  }

  get(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${PRODUCTS_URL}/get`, { params: idParam(id) });
  }

  create(request: CreateProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${PRODUCTS_URL}/create`, request);
  }

  update(id: string, request: UpdateProductRequest): Observable<ProductResponse> {
    return this.http.patch<ProductResponse>(`${PRODUCTS_URL}/update`, request, {
      params: idParam(id),
    });
  }

  /**
   * `products.delete` is a soft delete: the backend sets `activo = false`.
   * Its `{ deleted }` body is not part of `@agua/contracts`, so the caller
   * only learns that the request succeeded and reloads the list.
   */
  deactivate(id: string): Observable<void> {
    return this.http
      .delete(`${PRODUCTS_URL}/delete`, { params: idParam(id) })
      .pipe(map(() => undefined));
  }

  /** Active categories of the authenticated vendedor, needed by `categoriaId`. */
  listCategorias(): Observable<CategoriaResponse[]> {
    return this.http.get<CategoriaResponse[]>(CATEGORIES_LIST_URL);
  }
}

function idParam(id: string): HttpParams {
  return new HttpParams().set('id', id);
}
