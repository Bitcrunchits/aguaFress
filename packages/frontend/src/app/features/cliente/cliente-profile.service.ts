import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { UpdateProfileV2Request, UserProfile } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/users/profile`;
const UPDATE_PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/users/profile/update`;

/**
 * Cliente profile HTTP access against the gateway `users.profile` actions.
 * The authenticated user is resolved from the JWT server-side, so no
 * identity field is ever sent in the request body.
 */
@Injectable({ providedIn: 'root' })
export class ClienteProfileService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(PROFILE_URL);
  }

  updateProfile(body: UpdateProfileV2Request): Observable<UserProfile> {
    return this.http.post<UserProfile>(UPDATE_PROFILE_URL, body);
  }
}
