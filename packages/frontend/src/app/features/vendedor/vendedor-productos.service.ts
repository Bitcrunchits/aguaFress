import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  CreateProductRequest,
  PaginatedResponse,
  ProductResponse,
  UpdateProductRequest,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_PRODUCTS_URL = `${API_CONFIG.baseUrl}/api/v1/products/list`;
const GET_PRODUCT_URL = `${API_CONFIG.baseUrl}/api/v1/products/get`;
const CREATE_PRODUCT_URL = `${API_CONFIG.baseUrl}/api/v1/products/create`;
const UPDATE_PRODUCT_URL = `${API_CONFIG.baseUrl}/api/v1/products/update`;
const DELETE_PRODUCT_URL = `${API_CONFIG.baseUrl}/api/v1/products/delete`;
const UPLOAD_IMAGE_URL = `${API_CONFIG.baseUrl}/api/v1/upload/product-image`;

/**
 * Vendedor product catalog HTTP access against the gateway `products.*`
 * actions. The authenticated vendedor is resolved from the JWT server-side,
 * so no `vendedorId` or `userId` is ever sent in a body or query. `delete`
 * is a soft deactivation: the backend sets `activo: false` rather than
 * removing the row.
 */
@Injectable({ providedIn: 'root' })
export class VendedorProductosService {
  private readonly http = inject(HttpClient);

  list(page = 1, limit = 20): Observable<PaginatedResponse<ProductResponse>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<ProductResponse>>(LIST_PRODUCTS_URL, { params });
  }

  get(id: string): Observable<ProductResponse> {
    const params = new HttpParams().set('id', id);
    return this.http.get<ProductResponse>(GET_PRODUCT_URL, { params });
  }

  create(body: CreateProductRequest): Observable<{ id: string; created: boolean }> {
    return this.http.post<{ id: string; created: boolean }>(CREATE_PRODUCT_URL, body);
  }

  update(
    id: string,
    body: UpdateProductRequest,
  ): Observable<{ id: string; updated: boolean }> {
    const params = new HttpParams().set('id', id);
    return this.http.patch<{ id: string; updated: boolean }>(UPDATE_PRODUCT_URL, body, {
      params,
    });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<{ deleted: boolean }>(DELETE_PRODUCT_URL, { params });
  }

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<{ imageId: string }>(UPLOAD_IMAGE_URL, formData)
      .pipe(map((response) => `/uploads/${response.imageId}`));
  }
}
