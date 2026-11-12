import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SuperAdminProfileResponse, UpdateSuperAdminProfileRequest } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/super-admin/profile`;
const UPDATE_PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/super-admin/profile/update`;

/**
 * Super-admin profile HTTP access against the gateway `super-admin.profile`
 * actions. The authenticated admin is resolved from the JWT server-side, so
 * no identity field is ever sent in the request body.
 */
@Injectable({ providedIn: 'root' })
export class AdminProfileService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<SuperAdminProfileResponse> {
    return this.http.get<SuperAdminProfileResponse>(PROFILE_URL);
  }

  updateProfile(body: UpdateSuperAdminProfileRequest): Observable<SuperAdminProfileResponse> {
    return this.http.post<SuperAdminProfileResponse>(UPDATE_PROFILE_URL, body);
  }
}
