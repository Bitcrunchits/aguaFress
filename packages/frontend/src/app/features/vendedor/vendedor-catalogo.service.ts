import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CategoriaResponse, MarcaResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_CATEGORIAS_URL = `${API_CONFIG.baseUrl}/api/v1/categories/list`;
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

  listMarcas(): Observable<MarcaResponse[]> {
    return this.http.get<MarcaResponse[]>(LIST_MARCAS_URL);
  }
}
