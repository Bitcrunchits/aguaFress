import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SuperAdminDashboardResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const DASHBOARD_URL = `${API_CONFIG.baseUrl}/api/v1/super-admin/dashboard`;

/**
 * Super-admin dashboard metrics against the gateway `super-admin.dashboard`
 * action. The authenticated admin is resolved from the JWT server-side.
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<SuperAdminDashboardResponse> {
    return this.http.get<SuperAdminDashboardResponse>(DASHBOARD_URL);
  }
}
