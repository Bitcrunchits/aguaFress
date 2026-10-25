import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { UserRole, type CartResponse, type LoginResponse } from '@agua/contracts';
import { BehaviorSubject, EMPTY, Observable, Subject, of, throwError } from 'rxjs';
import {
  ClienteCarritoDetalleFacade,
  ClienteCarritoDetalleFeedbackKind,
} from './cliente-carrito-detalle.facade';
import { CLIENTE_CARRITO_EDICION_GATEWAY } from './cliente-carrito-edicion.gateway';
import { CLIENTE_CARRITO_LECTURA_GATEWAY } from './cliente-carrito-lectura.gateway';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

const USER_ID = 'user-1';
const PROVIDER_ID = 'vendedor-1';

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: USER_ID, email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: PROVIDER_ID,
  items: [
    {
      id: 'item-1',
      productoId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 1,
      precioUnitario: 1210,
      subtotal: 1210,
    },
  ],
  total: 1210,
  expiresAt: '2026-10-24T00:00:00.000Z',
};

const PROVIDER_LOST = new HttpErrorResponse({
  status: 404,
  error: { message: 'Active provider relation not found' },
});

const CART_DRIFT = new HttpErrorResponse({
  status: 404,
  error: { message: 'Cart item was not found' },
});

describe('ClienteCarritoDetalleFacade', () => {
  const lecturaStub = {
    getCart: jasmine.createSpy('getCart'),
  };
  const edicionStub = {
    updateItem: jasmine.createSpy('updateItem'),
    deleteItem: jasmine.createSpy('deleteItem'),
  };
  const providerStoreStub = {
    read: jasmine.createSpy('read'),
    clear: jasmine.createSpy('clear'),
  };
  const authStub: {
    currentSession: LoginResponse | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: SESSION, sessionReplacement$: EMPTY };
  const readinessStub: { sessionReady$: Observable<boolean> } = {
    sessionReady$: new BehaviorSubject(true),
  };
  let sessionReady: BehaviorSubject<boolean>;

  let facade: ClienteCarritoDetalleFacade;

  beforeEach(() => {
    sessionReady = new BehaviorSubject(true);
    authStub.currentSession = SESSION;
    readinessStub.sessionReady$ = sessionReady.asObservable();

    lecturaStub.getCart.calls.reset();
    lecturaStub.getCart.and.returnValue(of(CART_RESPONSE));
    edicionStub.updateItem.calls.reset();
    edicionStub.updateItem.and.returnValue(of(CART_RESPONSE));
    edicionStub.deleteItem.calls.reset();
    edicionStub.deleteItem.and.returnValue(of(CART_RESPONSE));
    providerStoreStub.read.calls.reset();
    providerStoreStub.read.and.returnValue(PROVIDER_ID);
    providerStoreStub.clear.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        ClienteCarritoDetalleFacade,
        { provide: CLIENTE_CARRITO_LECTURA_GATEWAY, useValue: lecturaStub },
        { provide: CLIENTE_CARRITO_EDICION_GATEWAY, useValue: edicionStub },
        { provide: CLIENTE_PROVIDER_READER, useValue: providerStoreStub },
        { provide: CLIENTE_SESSION_READER, useValue: authStub },
        { provide: CLIENTE_SESSION_READINESS_READER, useValue: readinessStub },
      ],
    });
    facade = TestBed.inject(ClienteCarritoDetalleFacade);
  });

  it('loads the active cart scoped to the stored provider', () => {
    facade.load();

    expect(lecturaStub.getCart).toHaveBeenCalledWith(PROVIDER_ID);
    expect(facade.cart()).toEqual(CART_RESPONSE);
    expect(facade.loading()).toBeFalse();
    expect(facade.failed()).toBeFalse();
  });

  it('returns to the home without calling the backend when no provider is stored', () => {
    providerStoreStub.read.and.returnValue(null);
    lecturaStub.getCart.calls.reset();

    facade.load();

    expect(lecturaStub.getCart).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
  });

  it('treats a missing active cart as an empty state, not a failure', () => {
    lecturaStub.getCart.and.returnValue(of(null));

    facade.load();

    expect(facade.cart()).toBeNull();
    expect(facade.isEmpty()).toBeTrue();
    expect(facade.failed()).toBeFalse();
  });

  it('clears the stored provider and redirects when a read loses the provider scope', () => {
    lecturaStub.getCart.and.returnValue(throwError(() => PROVIDER_LOST));

    facade.load();

    expect(providerStoreStub.clear).toHaveBeenCalledWith(USER_ID);
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.failed()).toBeFalse();
  });

  it('updates the quantity with an absolute value scoped to the cart and provider', () => {
    facade.load();
    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(edicionStub.updateItem).toHaveBeenCalledWith({
      cartId: CART_RESPONSE.id,
      vendedorId: PROVIDER_ID,
      productoId: 'producto-1',
      cantidad: 2,
    });
    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.Updated);
    expect(facade.mutatingProductId()).toBeNull();
  });

  it('does not send an update that would drop the quantity below one', () => {
    facade.load();
    facade.decreaseQuantity(CART_RESPONSE.items[0]);

    expect(edicionStub.updateItem).not.toHaveBeenCalled();
  });

  it('removes an item with the delete payload and no cantidad', () => {
    facade.load();
    facade.removeItem(CART_RESPONSE.items[0]);

    expect(edicionStub.deleteItem).toHaveBeenCalledWith({
      cartId: CART_RESPONSE.id,
      vendedorId: PROVIDER_ID,
      productoId: 'producto-1',
    });
    expect('cantidad' in edicionStub.deleteItem.calls.mostRecent().args[0]).toBeFalse();
    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.Removed);
  });

  it('ignores a second mutation while one is still in flight', () => {
    const pending = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(pending.asObservable());

    facade.load();
    facade.increaseQuantity(CART_RESPONSE.items[0]);
    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(edicionStub.updateItem).toHaveBeenCalledTimes(1);
    expect(facade.mutatingProductId()).toBe('producto-1');
  });

  it('keeps the mutation lock until the in-flight mutation resolves', () => {
    const pending = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(pending.asObservable());

    facade.load();
    facade.increaseQuantity(CART_RESPONSE.items[0]);
    expect(facade.mutatingProductId()).toBe('producto-1');

    // A read supersedes the mutation response, but the request is still open:
    // starting a second mutation could reach the backend out of order.
    facade.load();
    expect(facade.mutatingProductId()).toBe('producto-1');
    facade.increaseQuantity(CART_RESPONSE.items[0]);
    expect(edicionStub.updateItem).toHaveBeenCalledTimes(1);

    pending.next(CART_RESPONSE);
    expect(facade.mutatingProductId()).toBeNull();
  });

  it('reloads the cart when a read supersedes an in-flight mutation', () => {
    const pending = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(pending.asObservable());

    facade.load();
    lecturaStub.getCart.calls.reset();

    facade.increaseQuantity(CART_RESPONSE.items[0]);
    facade.load();
    expect(lecturaStub.getCart).toHaveBeenCalledTimes(1);

    pending.next(CART_RESPONSE);

    expect(facade.mutatingProductId()).toBeNull();
    // The read may hold a pre-mutation snapshot: reconcile after settling.
    expect(lecturaStub.getCart).toHaveBeenCalledTimes(2);
  });

  it('does not release a newer mutation lock when an old session response settles', () => {
    const oldMutation = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(oldMutation.asObservable());

    facade.load();
    facade.increaseQuantity(CART_RESPONSE.items[0]);
    expect(facade.mutatingProductId()).toBe('producto-1');

    sessionReady.next(false);

    const newMutation = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(newMutation.asObservable());
    sessionReady.next(true);
    facade.increaseQuantity(CART_RESPONSE.items[0]);
    expect(facade.mutatingProductId()).toBe('producto-1');

    oldMutation.next(CART_RESPONSE);

    expect(facade.mutatingProductId()).toBe('producto-1');
  });

  it('waits for a validated replacement session before requesting the cart', () => {
    lecturaStub.getCart.calls.reset();

    sessionReady.next(false);
    expect(lecturaStub.getCart).not.toHaveBeenCalled();
    expect(facade.cart()).toBeNull();

    sessionReady.next(true);
    expect(lecturaStub.getCart).toHaveBeenCalledTimes(1);
  });

  it('reloads instead of clearing the provider when a mutation hits cart drift', () => {
    edicionStub.updateItem.and.returnValue(throwError(() => CART_DRIFT));
    lecturaStub.getCart.calls.reset();

    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(providerStoreStub.clear).not.toHaveBeenCalled();
    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.CartChanged);
    expect(lecturaStub.getCart).toHaveBeenCalledTimes(1);
  });

  it('maps a stock failure to typed feedback and reloads the cart', () => {
    edicionStub.updateItem.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    lecturaStub.getCart.calls.reset();

    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.OutOfStock);
    expect(lecturaStub.getCart).toHaveBeenCalledTimes(1);
  });

  it('maps a forbidden mutation to typed feedback without reloading', () => {
    edicionStub.updateItem.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    lecturaStub.getCart.calls.reset();

    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.Forbidden);
    expect(lecturaStub.getCart).not.toHaveBeenCalled();
    expect(providerStoreStub.clear).not.toHaveBeenCalled();
    expect(facade.mutatingProductId()).toBeNull();
  });

  it('maps a transport failure to typed feedback without reloading', () => {
    edicionStub.updateItem.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    lecturaStub.getCart.calls.reset();

    facade.increaseQuantity(CART_RESPONSE.items[0]);

    expect(facade.feedback()?.kind).toBe(ClienteCarritoDetalleFeedbackKind.Network);
    expect(lecturaStub.getCart).not.toHaveBeenCalled();
  });

  it('drops an in-flight mutation response after a session replacement', () => {
    const pending = new Subject<CartResponse>();
    edicionStub.updateItem.and.returnValue(pending.asObservable());

    facade.load();
    facade.increaseQuantity(CART_RESPONSE.items[0]);

    lecturaStub.getCart.and.returnValue(of(null));
    sessionReady.next(false);
    sessionReady.next(true);
    pending.next(CART_RESPONSE);

    expect(facade.cart()).toBeNull();
    expect(facade.feedback()).toBeNull();
  });
});
