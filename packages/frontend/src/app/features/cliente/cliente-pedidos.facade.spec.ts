import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { OrderEstado } from '@agua/contracts';
import type { OrderListResponseV2, PaginatedResponse } from '@agua/contracts';
import { BehaviorSubject, EMPTY, Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { ClientePedidosListError } from './cliente-pedidos-error';
import { ClientePedidosFacade } from './cliente-pedidos.facade';
import { CLIENTE_PEDIDOS_LIST_GATEWAY } from './cliente-pedidos.gateway';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

const ORDER_A: OrderListResponseV2 = {
  id: 'order-1',
  pedidoNumero: 'P-0001',
  estado: OrderEstado.PENDIENTE,
  total: 2420,
  createdAt: '2026-10-24T00:00:00.000Z',
  vendedorId: 'vendedor-1',
};

const ORDER_B: OrderListResponseV2 = {
  ...ORDER_A,
  id: 'order-2',
  pedidoNumero: 'P-0002',
};

function listResponse(orders: OrderListResponseV2[]): PaginatedResponse<OrderListResponseV2> {
  return {
    data: orders,
    pagination: { page: 1, limit: 20, total: orders.length, totalPages: 1 },
  };
}

describe('ClientePedidosFacade', () => {
  const gatewayStub = {
    listOrders: jasmine.createSpy('listOrders'),
  };
  const sessionStub: {
    currentSession: { readonly user: { readonly id: string } } | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: null, sessionReplacement$: EMPTY };
  const readinessStub: { sessionReady$: Observable<boolean> } = {
    sessionReady$: new BehaviorSubject(true),
  };
  let sessionReplacement: Subject<void>;
  let sessionReady: BehaviorSubject<boolean>;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    sessionStub.sessionReplacement$ = sessionReplacement.asObservable();
    sessionReady = new BehaviorSubject(true);
    readinessStub.sessionReady$ = sessionReady.asObservable();

    gatewayStub.listOrders.calls.reset();
    gatewayStub.listOrders.and.returnValue(of(listResponse([ORDER_A])));

    TestBed.configureTestingModule({
      providers: [
        ClientePedidosFacade,
        { provide: CLIENTE_PEDIDOS_LIST_GATEWAY, useValue: gatewayStub },
        { provide: CLIENTE_SESSION_READER, useValue: sessionStub },
        { provide: CLIENTE_SESSION_READINESS_READER, useValue: readinessStub },
      ],
    });
  });

  function create(): ClientePedidosFacade {
    return TestBed.inject(ClientePedidosFacade);
  }

  it('loads the orders and clears the loading state', () => {
    const response = new Subject<PaginatedResponse<OrderListResponseV2>>();
    gatewayStub.listOrders.and.returnValue(response.asObservable());
    const facade = create();

    facade.loadOrders();

    expect(facade.loading()).toBeTrue();
    expect(facade.error()).toBeNull();
    expect(facade.orders()).toEqual([]);

    response.next(listResponse([ORDER_A]));
    response.complete();

    expect(facade.orders()).toEqual([ORDER_A]);
    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toBeNull();
  });

  it('exposes a typed error when the list request fails', () => {
    gatewayStub.listOrders.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    const facade = create();

    facade.loadOrders();

    expect(facade.error()).toBe(ClientePedidosListError.Forbidden);
    expect(facade.loading()).toBeFalse();
    expect(facade.orders()).toEqual([]);
  });

  it('ignores an out-of-order response from a superseded list request', () => {
    const superseded = new Subject<PaginatedResponse<OrderListResponseV2>>();
    gatewayStub.listOrders.and.returnValues(
      superseded.asObservable(),
      of(listResponse([ORDER_B])),
    );
    const facade = create();

    facade.loadOrders();
    facade.loadOrders();

    expect(facade.orders()).toEqual([ORDER_B]);

    superseded.next(listResponse([ORDER_A]));
    superseded.complete();

    expect(facade.orders()).toEqual([ORDER_B]);
    expect(facade.loading()).toBeFalse();
  });

  it('resets the list on session replacement and reloads once ready', () => {
    const facade = create();
    facade.loadOrders();

    expect(gatewayStub.listOrders).toHaveBeenCalledTimes(1);
    expect(facade.orders()).toEqual([ORDER_A]);

    sessionReady.next(false);
    sessionReplacement.next();

    expect(facade.orders()).toEqual([]);
    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toBeNull();
    expect(gatewayStub.listOrders).toHaveBeenCalledTimes(1);

    gatewayStub.listOrders.and.returnValue(of(listResponse([ORDER_B])));
    sessionReady.next(true);

    expect(gatewayStub.listOrders).toHaveBeenCalledTimes(2);
    expect(facade.orders()).toEqual([ORDER_B]);
  });
});
