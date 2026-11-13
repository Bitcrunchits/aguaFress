import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  GenerarLinkResponse,
  LinkInvitacionItem,
  PaginatedResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const LIST_URL = `${API_CONFIG.baseUrl}/api/v1/link-invitacion/vendor/list`;
const CREATE_URL = `${API_CONFIG.baseUrl}/api/v1/link-invitacion/vendor/create`;
const DEACTIVATE_URL = `${API_CONFIG.baseUrl}/api/v1/link-invitacion/vendor/deactivate`;

/**
 * Upper bound used by `list()`. The invitations page renders a flat list, so
 * it requests the backend's maximum page size (the gateway DTO caps `limit`
 * at 100) instead of paginating. A vendedor with more than 100 invitations
 * will have the older rows truncated — a documented, graceful degradation.
 */
const LIST_LIMIT = 100;

/**
 * Raw LINK_INVITACION row returned by the DEPLOYED `link-invitacion.vendor_list`
 * action. Local only: the backend returns a Prisma snake_case row, so the wire
 * fields must NOT live in contracts (`LinkInvitacionItem` stays closed).
 */
interface LinkInvitacionItemRawResponse {
  id: string;
  token: string;
  activo: boolean;
  expires_at: string;
  created_at: string;
}

/** Maps the raw invitation row into the camelCase `LinkInvitacionItem` read model. */
function mapRawToItem(raw: LinkInvitacionItemRawResponse): LinkInvitacionItem {
  return {
    id: raw.id,
    token: raw.token,
    activo: raw.activo,
    expiresAt: raw.expires_at,
    createdAt: raw.created_at,
  };
}

/**
 * Vendedor access to their invitation links against the gateway
 * `link-invitacion.vendor_*` actions. The authenticated vendedor is resolved
 * from the JWT server-side, so no `vendedorId` or `userId` is ever sent in a
 * query or body.
 */
@Injectable({ providedIn: 'root' })
export class VendedorInvitacionesService {
  private readonly http = inject(HttpClient);

  list(): Observable<LinkInvitacionItem[]> {
    const params = new HttpParams().set('limit', String(LIST_LIMIT));
    return this.http
      .get<PaginatedResponse<LinkInvitacionItemRawResponse>>(LIST_URL, { params })
      .pipe(map((response) => response.data.map(mapRawToItem)));
  }

  create(): Observable<GenerarLinkResponse> {
    return this.http.post<GenerarLinkResponse>(CREATE_URL, null);
  }

  deactivate(id: string): Observable<unknown> {
    return this.http.patch(`${DEACTIVATE_URL}/${encodeURIComponent(id)}`, null);
  }
}
