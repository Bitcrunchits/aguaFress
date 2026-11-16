import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { SuperAdminDashboardResponse } from '@agua/contracts';
import { AdminDashboardService } from './admin-dashboard.service';

const DASHBOARD_URL = 'https://api-aguafress.eadev.cloud/api/v1/super-admin/dashboard';

const DASHBOARD_RESPONSE: SuperAdminDashboardResponse = {
  totalVendedores: 12,
  vendedoresActivos: 8,
  vendedoresPendientes: 4,
  totalClientes: 95,
  clientesConVendedor: 90,
  totalSuperAdmins: 2,
};

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminDashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the consolidated metrics from the super-admin dashboard action', () => {
    let response: SuperAdminDashboardResponse | undefined;

    service.getDashboard().subscribe((value) => (response = value));

    const request = httpMock.expectOne(DASHBOARD_URL);
    expect(request.request.method).toBe('GET');

    request.flush(DASHBOARD_RESPONSE);
    expect(response).toEqual(DASHBOARD_RESPONSE);
  });
});
