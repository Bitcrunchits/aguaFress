import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  UserRole,
  type CartResponse,
  type LoginResponse,
  type ProductResponse,
} from '@agua/contracts';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';
import { ClienteCarritoFacade, ClienteCarritoFeedbackKind } from './cliente-carrito.facade';
import { CLIENTE_CARRITO_GATEWAY } from './cliente-carrito.gateway';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';

const USER_ID = 'user-1';
const CLIENTE_ID = 'cliente-1';
const PROVIDER_ID = 'vendedor-1';

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: USER_ID, email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const OTHER_SESSION: LoginResponse = {
  ...SESSION,
  user: { ...SESSION.user, id: 'user-2' },
};

const PRODUCT: ProductResponse = {
  id: 'producto-1',
  nombre: 'Agua mineral 500 ml',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  vendedorId: PROVIDER_ID,
  activo: true,
};

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  clienteId: CLIENTE_ID,
  vendedorId: PROVIDER_ID,
  items: [
    {
      id: 'item-1',
      productoId: PRODUCT.id,
      nombre: PRODUCT.nombre,
      cantidad: 1,
      precioUnitario: PRODUCT.precioFinal,
      subtotal: PRODUCT.precioFinal,
    },
  ],
  total: PRODUCT.precioFinal,
  expiresAt: '2026-10-24T00:00:00.000Z',
};

describe('ClienteCarritoFacade', () => {
  const carritoStub = {
    addToCart: jasmine.createSpy('addToCart'),
  };
  const providerStoreStub = {
    read: jasmine.createSpy('read'),
    clear: jasmine.createSpy('clear'),
  };
  const authStub: {
    currentSession: LoginResponse | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: SESSION, sessionReplacement$: EMPTY };
  let sessionReplacement: Subject<void>;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    carritoStub.addToCart.calls.reset();
    providerStoreStub.read.calls.reset();
    providerStoreStub.clear.calls.reset();
    authStub.currentSession = SESSION;
    authStub.sessionReplacement$ = sessionReplacement.asObservable();
    providerStoreStub.read.and.returnValue(PROVIDER_ID);
    carritoStub.addToCart.and.returnValue(of(CART_RESPONSE));

    TestBed.configureTestingModule({
      providers: [
        ClienteCarritoFacade,
        { provide: CLIENTE_CARRITO_GATEWAY, useValue: carritoStub },
        { provide: CLIENTE_PROVIDER_READER, useValue: providerStoreStub },
        { provide: CLIENTE_SESSION_READER, useValue: authStub },
      ],
    });
  });

  function create(): ClienteCarritoFacade {
    return TestBed.inject(ClienteCarritoFacade);
  }

  it('adds one unit once and reports success tied to the product', () => {
    const response = new Subject<CartResponse>();
    carritoStub.addToCart.and.returnValue(response.asObservable());
    const facade = create();

    facade.addToCart(PRODUCT);
    facade.addToCart(PRODUCT);

    expect(carritoStub.addToCart).toHaveBeenCalledTimes(1);
    expect(carritoStub.addToCart).toHaveBeenCalledWith({
      vendedorId: PROVIDER_ID,
      productoId: PRODUCT.id,
      cantidad: 1,
    });
    expect(facade.addingProductId()).toBe(PRODUCT.id);

    response.next(CART_RESPONSE);
    response.complete();

    expect(facade.feedback()).toEqual({
      kind: ClienteCarritoFeedbackKind.Added,
      productId: PRODUCT.id,
    });
    expect(facade.addingProductId()).toBeNull();
  });

  it('maps 503, 403, and status 0 add responses to typed outcomes', () => {
    const cases = [
      { status: 503, kind: ClienteCarritoFeedbackKind.OutOfStock },
      { status: 403, kind: ClienteCarritoFeedbackKind.Forbidden },
      { status: 0, kind: ClienteCarritoFeedbackKind.Network },
    ];
    const facade = create();

    for (const testCase of cases) {
      carritoStub.addToCart.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: testCase.status })),
      );

      facade.addToCart(PRODUCT);

      expect(facade.feedback()?.kind).toBe(testCase.kind);
      expect(facade.feedback()?.productId).toBe(PRODUCT.id);
      expect(facade.addingProductId()).toBeNull();
    }
  });

  it('clears the stored provider and redirects home on add 404 and 400 requiresSelection', () => {
    const facade = create();

    carritoStub.addToCart.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    facade.addToCart(PRODUCT);

    carritoStub.addToCart.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'requiresSelection' },
          }),
      ),
    );
    facade.addToCart(PRODUCT);

    expect(providerStoreStub.clear).toHaveBeenCalledTimes(2);
    expect(providerStoreStub.clear).toHaveBeenCalledWith(USER_ID);
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.feedback()).toBeNull();
    expect(facade.addingProductId()).toBeNull();
  });

  it('does not submit unavailable products', () => {
    const facade = create();
    const unavailableProducts = [
      { ...PRODUCT, activo: false },
      { ...PRODUCT, stock: 0 },
      { ...PRODUCT, mostrarPrecio: false },
    ];

    for (const product of unavailableProducts) {
      facade.addToCart(product);
    }

    expect(carritoStub.addToCart).not.toHaveBeenCalled();
    expect(facade.addingProductId()).toBeNull();
  });

  it('does not submit a product from a different provider', () => {
    const facade = create();

    facade.addToCart({ ...PRODUCT, vendedorId: 'vendedor-2' });

    expect(carritoStub.addToCart).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.addingProductId()).toBeNull();
  });

  it('ignores an in-flight add from before a same-user session replacement', () => {
    const superseded = new Subject<CartResponse>();
    const current = new Subject<CartResponse>();
    carritoStub.addToCart.and.returnValues(superseded.asObservable(), current.asObservable());
    const facade = create();

    facade.addToCart(PRODUCT);
    sessionReplacement.next();
    expect(facade.addingProductId()).toBeNull();

    facade.addToCart(PRODUCT);
    expect(facade.addingProductId()).toBe(PRODUCT.id);

    superseded.next(CART_RESPONSE);
    superseded.complete();

    expect(facade.feedback()).toBeNull();
    expect(facade.addingProductId()).toBe(PRODUCT.id);

    current.next(CART_RESPONSE);
    current.complete();

    expect(facade.feedback()?.kind).toBe(ClienteCarritoFeedbackKind.Added);
    expect(facade.addingProductId()).toBeNull();
  });

  it('ignores an add response after the session changes without a replacement event', () => {
    const response = new Subject<CartResponse>();
    carritoStub.addToCart.and.returnValue(response.asObservable());
    const facade = create();

    facade.addToCart(PRODUCT);
    authStub.currentSession = OTHER_SESSION;

    response.next(CART_RESPONSE);
    response.complete();

    expect(facade.feedback()).toBeNull();
    expect(facade.addingProductId()).toBeNull();
  });
});
