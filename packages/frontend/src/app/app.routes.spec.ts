import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UserRole, type LoginResponse, type SuperAdminVendedorListResponse } from '@agua/contracts';
import { Observable, of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AdminVendedoresService } from './features/admin/admin-vendedores.service';

const EMPTY_LIST: SuperAdminVendedorListResponse = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

function sessionWithRole(role: UserRole): LoginResponse {
  return {
    token: 'access-token-1',
    refreshToken: 'refresh-token-1',
    user: { id: 'user-1', email: 'someone@example.com', role },
  };
}

describe('application routes', () => {
  let authServiceStub: {
    currentSession: LoginResponse | null;
    sessionReady$: Observable<boolean>;
    logout: () => void;
  };

  beforeEach(() => {
    authServiceStub = {
      currentSession: sessionWithRole(UserRole.SUPER_ADMIN),
      sessionReady$: of(true),
      logout: () => {},
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authServiceStub },
        { provide: AdminVendedoresService, useValue: { list: () => of(EMPTY_LIST) } },
      ],
    });
  });

  it('renders the admin home for a super_admin session', async () => {
    const harness = await RouterTestingHarness.create('/admin');

    expect(harness.routeNativeElement?.querySelector('.role-card h1')?.textContent?.trim()).toBe(
      'Inicio de administración',
    );
  });

  it('renders the vendedores list under the super_admin guard', async () => {
    const harness = await RouterTestingHarness.create('/admin/vendedores');

    expect(harness.routeNativeElement?.querySelector('.role-card h1')?.textContent?.trim()).toBe(
      'Vendedores',
    );
  });

  it('redirects a vendedor session away from the admin vendedores route', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.VENDEDOR);

    await RouterTestingHarness.create('/admin/vendedores');

    expect(TestBed.inject(Router).url).toBe('/vendedor');
  });

  it('redirects unauthenticated navigation to the login route', async () => {
    authServiceStub.currentSession = null;

    await RouterTestingHarness.create('/admin/vendedores');

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });
});
