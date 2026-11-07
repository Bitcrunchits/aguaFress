import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { VendedorProfile } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/profile`;

/**
 * Vendedor profile HTTP access against the gateway `vendedores.profile`
 * action. The authenticated vendedor is resolved from the JWT server-side,
 * so no `vendedorId` or `userId` is ever sent in the request.
 */
@Injectable({ providedIn: 'root' })
export class VendedorProfileService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<VendedorProfile> {
    return this.http.get<VendedorProfile>(PROFILE_URL);
  }
}
