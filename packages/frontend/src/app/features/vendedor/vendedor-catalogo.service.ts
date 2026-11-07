import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  CategoriaResponse,
  CreateCategoriaRequest,
  MarcaResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_CATEGORIAS_URL = `${API_CONFIG.baseUrl}/api/v1/categories/list`;
const CREATE_CATEGORIA_URL = `${API_CONFIG.baseUrl}/api/v1/categories/create`;
const LIST_MARCAS_URL = `${API_CONFIG.baseUrl}/api/v1/brands/list`;

/**
 * Vendedor catalog taxonomy access for the product form selects. Both
 * endpoints return a plain (non-paginated) array and resolve the vendedor
 * from the JWT server-side, so no `vendedorId` is sent.
 */
@Injectable({ providedIn: 'root' })
export class VendedorCatalogoService {
  private readonly http = inject(HttpClient);

  listCategorias(): Observable<CategoriaResponse[]> {
    return this.http.get<CategoriaResponse[]>(LIST_CATEGORIAS_URL);
  }

  createCategoria(body: CreateCategoriaRequest): Observable<CategoriaResponse> {
    return this.http.post<CategoriaResponse>(CREATE_CATEGORIA_URL, body);
  }

  listMarcas(): Observable<MarcaResponse[]> {
    return this.http.get<MarcaResponse[]>(LIST_MARCAS_URL);
  }
}
