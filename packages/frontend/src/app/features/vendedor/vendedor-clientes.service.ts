import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { PaginatedResponse, VendedorClienteItem, VendedorClienteItemV2 } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const CARTERA_URL = `${API_CONFIG.baseUrl}/api/v1/clientes/cartera`;

/**
 * Upper bound used by `listCarteraForLookup` to fetch (at most) the whole
 * cartera in one page. The list page needs a reliable `clienteId → nombre`
 * map, so it requests more rows than the default page size (20). When a
 * vendedor exceeds this many clients, the map is truncated and unmatched
 * orders render the "Cliente no disponible" fallback — a documented, graceful
 * degradation rather than a second paginated pass.
 */
const CARTERA_LOOKUP_LIMIT = 500;

export interface VendedorClientesFilters {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Raw CLIENTE row returned by the DEPLOYED `clientes.cartera` action. Local
 * only: the deployed backend returns a Prisma snake_case row, so the
 * `auth_user_id` join key must NOT live in contracts (`VendedorClienteItem`
 * stays closed). `id`, `nombre`, `apellido` and `telefono` are single-word
 * columns whose wire names coincide with the camelCase contract.
 */
interface VendedorClienteItemRawResponse {
  id: string;
  auth_user_id: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

/** Maps the raw cartera row into the camelCase `VendedorClienteItemV2` read model. */
function mapRawToV2(raw: VendedorClienteItemRawResponse): VendedorClienteItemV2 {
  return {
    id: raw.id,
    nombre: raw.nombre,
    apellido: raw.apellido || undefined,
    telefono: raw.telefono || undefined,
    clienteUserId: raw.auth_user_id,
  };
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

  /**
   * Fetches the cartera as a flat `VendedorClienteItemV2[]` keyed by
   * `clienteUserId`, for joining `OrderResponse.clienteId` (AUTH_USER.id) to a
   * display name. Requests an explicit high `limit` so the returned map is
   * reliable without N+1 lookups; see `CARTERA_LOOKUP_LIMIT` for the
   * truncation caveat.
   */
  listCarteraForLookup(): Observable<VendedorClienteItemV2[]> {
    const params = new HttpParams().set('limit', String(CARTERA_LOOKUP_LIMIT));
    return this.http
      .get<PaginatedResponse<VendedorClienteItemRawResponse>>(CARTERA_URL, { params })
      .pipe(map((response) => response.data.map(mapRawToV2)));
  }
}
