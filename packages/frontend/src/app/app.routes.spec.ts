import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  UserRole,
  type LoginResponse,
  type PaginatedResponse,
  type ProductResponse,
  type SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { EMPTY, Observable, of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AdminVendedoresService } from './features/admin/admin-vendedores.service';
import { ClienteCatalogoService } from './features/cliente/cliente-catalogo.service';
import { ClienteProviderStateService } from './features/cliente/cliente-provider-state.service';

const EMPTY_LIST: SuperAdminVendedorListResponse = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

const EMPTY_PRODUCTS: PaginatedResponse<ProductResponse> = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
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
    sessionReplacement$: Observable<void>;
    logout: () => void;
  };

  beforeEach(() => {
    authServiceStub = {
      currentSession: sessionWithRole(UserRole.SUPER_ADMIN),
      sessionReady$: of(true),
      sessionReplacement$: EMPTY,
      logout: () => {},
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authServiceStub },
        { provide: AdminVendedoresService, useValue: { list: () => of(EMPTY_LIST) } },
        { provide: ClienteCatalogoService, useValue: { list: () => of(EMPTY_PRODUCTS) } },
        {
          provide: ClienteProviderStateService,
          useValue: {
            read: () => 'provider-1',
            save: () => {},
            clear: () => {},
          },
        },
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

  it('renders the cliente catalog for a cliente session with a provider', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.CLIENTE);

    const harness = await RouterTestingHarness.create('/cliente/catalogo');

    expect(TestBed.inject(Router).url).toBe('/cliente/catalogo');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Catalogo del proveedor',
    );
  });

  it('redirects unauthenticated navigation to the cliente catalog to login', async () => {
    authServiceStub.currentSession = null;

    await RouterTestingHarness.create('/cliente/catalogo');

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('redirects a vendedor session away from the cliente catalog', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.VENDEDOR);

    await RouterTestingHarness.create('/cliente/catalogo');

    expect(TestBed.inject(Router).url).toBe('/vendedor');
  });

  it('redirects a super_admin session away from the cliente catalog', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.SUPER_ADMIN);

    await RouterTestingHarness.create('/cliente/catalogo');

    expect(TestBed.inject(Router).url).toBe('/admin');
  });

  it('declares the catalog under the cliente parent as a lazy route', () => {
    const shellRoute = routes.find((route) => route.children !== undefined);
    const clienteRoute = shellRoute?.children?.find((route) => route.path === 'cliente');
    const catalogoRoute = clienteRoute?.children?.find((route) => route.path === 'catalogo');

    expect(clienteRoute?.canActivate?.length).toBe(1);
    expect(clienteRoute?.children?.map((route) => route.path)).toEqual(['', 'catalogo']);
    expect(typeof catalogoRoute?.loadComponent).toBe('function');
    expect(catalogoRoute?.canActivate).toBeUndefined();
  });
});
