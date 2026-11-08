import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { VendedorProfile } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const VENDEDOR_PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/profile`;

/**
 * Authenticated vendedor profile from the gateway `vendedores.profile`
 * action. Identity comes from the JWT; nothing is sent in the request.
 *
 * The usuario-service answers 403 when the vendedor is `inactivo` or
 * `bloqueado`, so those states arrive as an HTTP error, not as a profile.
 */
@Injectable({ providedIn: 'root' })
export class VendedorPerfilService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<VendedorProfile> {
    return this.http.get<VendedorProfile>(VENDEDOR_PROFILE_URL);
  }
}
