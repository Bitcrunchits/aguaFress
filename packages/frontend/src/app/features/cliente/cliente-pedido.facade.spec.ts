import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderJobStatus, UserRole } from '@agua/contracts';
import type { AsyncAcceptedResponse, LoginResponse } from '@agua/contracts';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';
import {
  CLIENTE_IDEMPOTENCY_KEY_FACTORY,
  ClientePedidoFacade,
} from './cliente-pedido.facade';
import type { ClientePedidoDraft } from './cliente-pedido-draft.contract';
import { CLIENTE_PEDIDO_GATEWAY } from './cliente-pedido.gateway';
import { ClientePedidoFailure } from './cliente-pedido-error';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';

const USER_ID = 'user-1';
const PROVIDER_ID = 'vendedor-1';

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: USER_ID, email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const DRAFT: ClientePedidoDraft = {
  calle: 'Av. Corrientes',
  numero: '1234',
  barrio: 'Balvanera',
  ciudad: 'Buenos Aires',
  provincia: 'Buenos Aires',
  codigoPostal: 'C1084',
  observaciones: 'Dejar en la puerta',
};

const ACCEPTED: AsyncAcceptedResponse = {
  jobId: 'job-1',
  trackingId: 'tracking-1',
  vendedorId: PROVIDER_ID,
  status: OrderJobStatus.PENDING,
  statusUrl: '/api/v1/orders/job-status?id=tracking-1',
  acceptedAt: '2026-10-24T00:00:00.000Z',
};

const VALIDATION_ERROR = new HttpErrorResponse({
  status: 400,
  error: { message: 'Idempotency key is required for orders.create' },
});

const FORBIDDEN = new HttpErrorResponse({ status: 403 });

const NETWORK_ERROR = new HttpErrorResponse({ status: 0 });

const PROVIDER_LOST = new HttpErrorResponse({
  status: 404,
  error: { message: 'Active provider relation not found' },
});

describe('ClientePedidoFacade', () => {
  const gatewayStub = {
    createOrder: jasmine.createSpy('createOrder'),
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
  let keySequence: number;

  let facade: ClientePedidoFacade;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    authStub.currentSession = SESSION;
    authStub.sessionReplacement$ = sessionReplacement.asObservable();

    keySequence = 0;
    gatewayStub.createOrder.calls.reset();
    gatewayStub.createOrder.and.returnValue(of(ACCEPTED));
    providerStoreStub.read.calls.reset();
    providerStoreStub.read.and.returnValue(PROVIDER_ID);
    providerStoreStub.clear.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        ClientePedidoFacade,
        { provide: CLIENTE_PEDIDO_GATEWAY, useValue: gatewayStub },
        { provide: CLIENTE_PROVIDER_READER, useValue: providerStoreStub },
        { provide: CLIENTE_SESSION_READER, useValue: authStub },
        { provide: CLIENTE_IDEMPOTENCY_KEY_FACTORY, useValue: () => `key-${++keySequence}` },
      ],
    });
    facade = TestBed.inject(ClientePedidoFacade);
  });

  it('submits the provider-scoped order without identity fields', () => {
    facade.submit(DRAFT, PROVIDER_ID);

    const [request, key] = gatewayStub.createOrder.calls.mostRecent().args;
    expect(key).toBe('key-1');
    expect(request.vendedorId).toBe(PROVIDER_ID);
    expect(request.metodoPago).toBe(MetodoPago.CONTRA_ENTREGA);
    expect(request.direccion.calle).toBe('Av. Corrientes');
    expect(request.observaciones).toBe('Dejar en la puerta');
    expect('userId' in request).toBeFalse();
    expect('clienteId' in request).toBeFalse();
    expect(facade.accepted()).toEqual(ACCEPTED);
    expect(facade.submitting()).toBeFalse();
  });

  it('returns to the home without submitting when no provider is stored', () => {
    providerStoreStub.read.and.returnValue(null);

    facade.submit(DRAFT, PROVIDER_ID);

    expect(gatewayStub.createOrder).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
  });

  it('returns to the home when the stored provider no longer matches the displayed cart', () => {
    providerStoreStub.read.and.returnValue('vendedor-2');

    facade.submit(DRAFT, PROVIDER_ID);

    expect(gatewayStub.createOrder).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
  });

  it('reuses the same key when the identical payload is retried', () => {
    gatewayStub.createOrder.and.returnValue(throwError(() => VALIDATION_ERROR));

    facade.submit(DRAFT, PROVIDER_ID);
    facade.submit(DRAFT, PROVIDER_ID);

    const keys = gatewayStub.createOrder.calls.allArgs().map((args) => args[1]);
    expect(keys).toEqual(['key-1', 'key-1']);
    expect(facade.feedback()).toBe(ClientePedidoFailure.Validation);
  });

  it('issues a new key when the payload changes', () => {
    gatewayStub.createOrder.and.returnValue(throwError(() => VALIDATION_ERROR));

    facade.submit(DRAFT, PROVIDER_ID);
    facade.submit({ ...DRAFT, calle: 'Av. Callao' }, PROVIDER_ID);

    const keys = gatewayStub.createOrder.calls.allArgs().map((args) => args[1]);
    expect(keys).toEqual(['key-1', 'key-2']);
  });

  it('issues a new key for the next order after an acceptance', () => {
    facade.submit(DRAFT, PROVIDER_ID);
    facade.submit(DRAFT, PROVIDER_ID);

    const keys = gatewayStub.createOrder.calls.allArgs().map((args) => args[1]);
    expect(keys).toEqual(['key-1', 'key-2']);
  });

  it('reports a forbidden failure and reuses the key on an identical retry', () => {
    gatewayStub.createOrder.and.returnValue(throwError(() => FORBIDDEN));

    facade.submit(DRAFT, PROVIDER_ID);
    expect(facade.feedback()).toBe(ClientePedidoFailure.Forbidden);

    gatewayStub.createOrder.and.returnValue(of(ACCEPTED));
    facade.submit(DRAFT, PROVIDER_ID);

    const keys = gatewayStub.createOrder.calls.allArgs().map((args) => args[1]);
    expect(keys).toEqual(['key-1', 'key-1']);
    expect(facade.accepted()).toEqual(ACCEPTED);
  });

  it('reports a network failure and reuses the key on an identical retry', () => {
    gatewayStub.createOrder.and.returnValue(throwError(() => NETWORK_ERROR));

    facade.submit(DRAFT, PROVIDER_ID);
    facade.submit(DRAFT, PROVIDER_ID);

    const keys = gatewayStub.createOrder.calls.allArgs().map((args) => args[1]);
    expect(keys).toEqual(['key-1', 'key-1']);
    expect(facade.feedback()).toBe(ClientePedidoFailure.Network);
  });

  it('clears the stored provider and redirects when the provider scope is lost', () => {
    gatewayStub.createOrder.and.returnValue(throwError(() => PROVIDER_LOST));

    facade.submit(DRAFT, PROVIDER_ID);

    expect(providerStoreStub.clear).toHaveBeenCalledWith(USER_ID);
    expect(facade.redirectToHome()).toBeTrue();
  });

  it('ignores a second submit while the first is in flight', () => {
    const pending = new Subject<AsyncAcceptedResponse>();
    gatewayStub.createOrder.and.returnValue(pending.asObservable());

    facade.submit(DRAFT, PROVIDER_ID);
    facade.submit(DRAFT, PROVIDER_ID);

    expect(gatewayStub.createOrder).toHaveBeenCalledTimes(1);
    expect(facade.submitting()).toBeTrue();
  });

  it('drops an in-flight acceptance after a session replacement', () => {
    const pending = new Subject<AsyncAcceptedResponse>();
    gatewayStub.createOrder.and.returnValue(pending.asObservable());

    facade.submit(DRAFT, PROVIDER_ID);
    sessionReplacement.next();
    pending.next(ACCEPTED);

    expect(facade.accepted()).toBeNull();
  });
});
