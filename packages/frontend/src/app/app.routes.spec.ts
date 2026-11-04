import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  MetodoPago,
  OrderEstado,
  OrderJobStatus,
  UserRole,
  type AsyncAcceptedResponse,
  type CartResponse,
  type LoginResponse,
  type OrderResponse,
  type PaginatedResponse,
  type ProductResponse,
  type SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { EMPTY, Observable, of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AdminVendedoresService } from './features/admin/admin-vendedores.service';
import { ClienteCarritoEdicionService } from './features/cliente/cliente-carrito-edicion.service';
import { ClienteCarritoLecturaService } from './features/cliente/cliente-carrito-lectura.service';
import { ClienteCarritoService } from './features/cliente/cliente-carrito.service';
import { ClienteCatalogoService } from './features/cliente/cliente-catalogo.service';
import { ClientePedidoService } from './features/cliente/cliente-pedido.service';
import { ClientePedidosService } from './features/cliente/cliente-pedidos.service';
import { ClienteProviderStateService } from './features/cliente/cliente-provider-state.service';
import { CLIENTE_TRACKING_SESSION_READER } from './features/cliente/cliente-tracking.contract';

const EMPTY_LIST: SuperAdminVendedorListResponse = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

const EMPTY_PRODUCTS: PaginatedResponse<ProductResponse> = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const CART: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: 'provider-1',
  items: [
    {
      id: 'item-1',
      productoId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 2,
      precioUnitario: 1200,
      subtotal: 2400,
    },
  ],
  total: 2400,
  expiresAt: '2026-10-25T12:00:00.000Z',
};

const ACCEPTED: AsyncAcceptedResponse = {
  jobId: 'job-1',
  trackingId: 'tracking-1',
  status: OrderJobStatus.PENDING,
  statusUrl: '/api/v1/orders/job-status?id=tracking-1',
  acceptedAt: '2026-10-24T12:00:00.000Z',
};

const ORDER: OrderResponse = {
  id: 'order-1',
  pedidoNumero: 'P-0001',
  clienteId: 'cliente-profile-1',
  vendedorId: 'vendedor-1',
  items: [
    {
      productId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 2,
      precioUnitario: 1000,
    },
  ],
  totalSinIva: 2000,
  iva: 420,
  total: 2420,
  estado: OrderEstado.PENDIENTE,
  metodoPago: MetodoPago.CONTRA_ENTREGA,
  direccion: { calle: 'Av. Corrientes', numero: '1234' },
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
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
  let lecturaStub: { getCart: jasmine.Spy };
  let pedidoStub: { createOrder: jasmine.Spy };
  let pedidosStub: {
    listOrders: jasmine.Spy;
    getOrder: jasmine.Spy;
    getJobStatus: jasmine.Spy;
  };

  beforeEach(() => {
    authServiceStub = {
      currentSession: sessionWithRole(UserRole.SUPER_ADMIN),
      sessionReady$: of(true),
      sessionReplacement$: EMPTY,
      logout: () => {},
    };
    lecturaStub = { getCart: jasmine.createSpy('getCart').and.returnValue(of(CART)) };
    pedidoStub = { createOrder: jasmine.createSpy('createOrder').and.returnValue(of(ACCEPTED)) };
    pedidosStub = {
      listOrders: jasmine.createSpy('listOrders').and.returnValue(of([])),
      getOrder: jasmine.createSpy('getOrder').and.returnValue(of(ORDER)),
      getJobStatus: jasmine.createSpy('getJobStatus').and.returnValue(EMPTY),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authServiceStub },
        {
          provide: CLIENTE_TRACKING_SESSION_READER,
          useValue: {
            get session() {
              return authServiceStub.currentSession;
            },
          },
        },
        { provide: AdminVendedoresService, useValue: { list: () => of(EMPTY_LIST) } },
        { provide: ClienteCatalogoService, useValue: { list: () => of(EMPTY_PRODUCTS) } },
        { provide: ClienteCarritoService, useValue: { addToCart: () => EMPTY } },
        { provide: ClienteCarritoLecturaService, useValue: lecturaStub },
        {
          provide: ClienteCarritoEdicionService,
          useValue: { updateItem: () => EMPTY, deleteItem: () => EMPTY },
        },
        { provide: ClientePedidoService, useValue: pedidoStub },
        { provide: ClientePedidosService, useValue: pedidosStub },
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
      'Catálogo del proveedor',
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

  it('renders the cliente cart and confirms an order for a cliente session', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.CLIENTE);

    const harness = await RouterTestingHarness.create('/cliente/carrito');
    const element = harness.routeNativeElement as HTMLElement;

    expect(TestBed.inject(Router).url).toBe('/cliente/carrito');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Carrito');
    expect(lecturaStub.getCart).toHaveBeenCalledWith('provider-1');
    expect(element.textContent).toContain('Agua mineral 500 ml');

    const calle = element.querySelector('#cliente-carrito-calle') as HTMLInputElement;
    calle.value = 'Av. Siempre Viva';
    calle.dispatchEvent(new Event('input'));
    const numero = element.querySelector('#cliente-carrito-numero') as HTMLInputElement;
    numero.value = '742';
    numero.dispatchEvent(new Event('input'));

    (element.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    harness.detectChanges();

    expect(pedidoStub.createOrder).toHaveBeenCalledTimes(1);
    const [request] = pedidoStub.createOrder.calls.mostRecent().args as [Record<string, unknown>];
    expect(request['vendedorId']).toBe('provider-1');
    expect(request['metodoPago']).toBe(MetodoPago.CONTRA_ENTREGA);
    expect(element.textContent).toContain('Pedido recibido');
    expect(element.textContent).toContain('tracking-1');
  });

  it('redirects unauthenticated navigation to the cliente cart to login', async () => {
    authServiceStub.currentSession = null;

    await RouterTestingHarness.create('/cliente/carrito');

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('renders the cliente orders list for a cliente session', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.CLIENTE);

    const harness = await RouterTestingHarness.create('/cliente/pedidos');

    expect(TestBed.inject(Router).url).toBe('/cliente/pedidos');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Mis pedidos');
    expect(pedidosStub.listOrders).toHaveBeenCalledTimes(1);
  });

  it('redirects unauthenticated navigation to the cliente orders to login', async () => {
    authServiceStub.currentSession = null;

    await RouterTestingHarness.create('/cliente/pedidos');

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('renders the cliente order detail for a cliente session', async () => {
    authServiceStub.currentSession = sessionWithRole(UserRole.CLIENTE);

    const harness = await RouterTestingHarness.create('/cliente/pedidos/order-1');

    expect(TestBed.inject(Router).url).toBe('/cliente/pedidos/order-1');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Detalle del pedido',
    );
    expect(pedidosStub.getOrder).toHaveBeenCalledOnceWith('order-1');
    expect(harness.routeNativeElement?.textContent).toContain('P-0001');
  });

  it('redirects unauthenticated navigation to the cliente order detail to login', async () => {
    authServiceStub.currentSession = null;

    await RouterTestingHarness.create('/cliente/pedidos/order-1');

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('declares the catalog under the cliente parent as a lazy route', () => {
    const shellRoute = routes.find((route) => route.children !== undefined);
    const clienteRoute = shellRoute?.children?.find((route) => route.path === 'cliente');
    const catalogoRoute = clienteRoute?.children?.find((route) => route.path === 'catalogo');

    expect(clienteRoute?.canActivate?.length).toBe(1);
    const carritoRoute = clienteRoute?.children?.find((route) => route.path === 'carrito');

    const pedidosRoute = clienteRoute?.children?.find((route) => route.path === 'pedidos');
    const pedidoDetalleRoute = clienteRoute?.children?.find(
      (route) => route.path === 'pedidos/:id',
    );

    expect(clienteRoute?.children?.map((route) => route.path)).toEqual([
      '',
      'catalogo',
      'carrito',
      'pedidos',
      'pedidos/:id',
    ]);
    expect(typeof catalogoRoute?.loadComponent).toBe('function');
    expect(catalogoRoute?.canActivate).toBeUndefined();
    expect(typeof carritoRoute?.loadComponent).toBe('function');
    expect(carritoRoute?.canActivate).toBeUndefined();
    expect(typeof pedidosRoute?.loadComponent).toBe('function');
    expect(pedidosRoute?.canActivate).toBeUndefined();
    expect(typeof pedidoDetalleRoute?.loadComponent).toBe('function');
    expect(pedidoDetalleRoute?.canActivate).toBeUndefined();
  });
});
