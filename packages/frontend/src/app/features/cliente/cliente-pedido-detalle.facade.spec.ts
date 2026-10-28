import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { OrderResponse } from '@agua/contracts';
import { BehaviorSubject, EMPTY, Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { ClientePedidoDetalleFacade } from './cliente-pedido-detalle.facade';
import { ClientePedidoDetalleError } from './cliente-pedido-detalle-error';
import { CLIENTE_PEDIDOS_DETAIL_GATEWAY } from './cliente-pedidos.gateway';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

const ORDER_A: OrderResponse = {
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

const ORDER_B: OrderResponse = {
  ...ORDER_A,
  id: 'order-2',
  pedidoNumero: 'P-0002',
};

describe('ClientePedidoDetalleFacade', () => {
  const gatewayStub = {
    getOrder: jasmine.createSpy('getOrder'),
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

    gatewayStub.getOrder.calls.reset();
    gatewayStub.getOrder.and.returnValue(of(ORDER_A));

    TestBed.configureTestingModule({
      providers: [
        ClientePedidoDetalleFacade,
        { provide: CLIENTE_PEDIDOS_DETAIL_GATEWAY, useValue: gatewayStub },
        { provide: CLIENTE_SESSION_READER, useValue: sessionStub },
        { provide: CLIENTE_SESSION_READINESS_READER, useValue: readinessStub },
      ],
    });
  });

  function create(): ClientePedidoDetalleFacade {
    return TestBed.inject(ClientePedidoDetalleFacade);
  }

  it('loads the requested order and clears the loading state', () => {
    const response = new Subject<OrderResponse>();
    gatewayStub.getOrder.and.returnValue(response.asObservable());
    const facade = create();

    facade.loadOrder('order-1');

    expect(gatewayStub.getOrder).toHaveBeenCalledOnceWith('order-1');
    expect(facade.loading()).toBeTrue();
    expect(facade.order()).toBeNull();
    expect(facade.notFound()).toBeFalse();
    expect(facade.error()).toBeNull();

    response.next(ORDER_A);
    response.complete();

    expect(facade.order()).toEqual(ORDER_A);
    expect(facade.loading()).toBeFalse();
    expect(facade.notFound()).toBeFalse();
    expect(facade.error()).toBeNull();
  });

  it('exposes a not-found state when the order does not exist', () => {
    gatewayStub.getOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const facade = create();

    facade.loadOrder('missing-order');

    expect(facade.notFound()).toBeTrue();
    expect(facade.error()).toBeNull();
    expect(facade.order()).toBeNull();
    expect(facade.loading()).toBeFalse();
  });

  it('exposes a typed error when the detail request fails', () => {
    gatewayStub.getOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const facade = create();

    facade.loadOrder('order-1');

    expect(facade.error()).toBe(ClientePedidoDetalleError.Unexpected);
    expect(facade.notFound()).toBeFalse();
    expect(facade.order()).toBeNull();
    expect(facade.loading()).toBeFalse();
  });

  it('exposes a network error for a transport failure', () => {
    gatewayStub.getOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    const facade = create();

    facade.loadOrder('order-1');

    expect(facade.error()).toBe(ClientePedidoDetalleError.Network);
    expect(facade.notFound()).toBeFalse();
  });

  it('never renders a superseded response from a previous order id', () => {
    const superseded = new Subject<OrderResponse>();
    gatewayStub.getOrder.and.returnValues(superseded.asObservable(), of(ORDER_B));
    const facade = create();

    facade.loadOrder('order-1');
    facade.loadOrder('order-2');

    expect(facade.order()).toEqual(ORDER_B);
    expect(facade.loading()).toBeFalse();

    superseded.next(ORDER_A);
    superseded.complete();

    expect(facade.order()).toEqual(ORDER_B);
    expect(facade.loading()).toBeFalse();
  });

  it('waits for session readiness before requesting the order', () => {
    const response = new Subject<OrderResponse>();
    gatewayStub.getOrder.and.returnValue(response.asObservable());
    sessionReady.next(false);
    const facade = create();

    facade.loadOrder('order-1');

    expect(gatewayStub.getOrder).not.toHaveBeenCalled();
    expect(facade.loading()).toBeFalse();

    sessionReady.next(true);

    expect(gatewayStub.getOrder).toHaveBeenCalledOnceWith('order-1');
    expect(facade.loading()).toBeTrue();

    response.next(ORDER_A);

    expect(facade.order()).toEqual(ORDER_A);
    expect(facade.loading()).toBeFalse();
  });

  it('resets the detail on session replacement and reloads once ready', () => {
    const facade = create();
    facade.loadOrder('order-1');

    expect(gatewayStub.getOrder).toHaveBeenCalledTimes(1);
    expect(facade.order()).toEqual(ORDER_A);

    sessionReady.next(false);
    sessionReplacement.next();

    expect(facade.order()).toBeNull();
    expect(facade.loading()).toBeFalse();
    expect(facade.notFound()).toBeFalse();
    expect(facade.error()).toBeNull();
    expect(gatewayStub.getOrder).toHaveBeenCalledTimes(1);

    gatewayStub.getOrder.and.returnValue(of(ORDER_B));
    sessionReady.next(true);

    expect(gatewayStub.getOrder).toHaveBeenCalledTimes(2);
    expect(gatewayStub.getOrder.calls.mostRecent().args).toEqual(['order-1']);
    expect(facade.order()).toEqual(ORDER_B);
  });

  it('stops updating the view after the facade is destroyed', () => {
    const response = new Subject<OrderResponse>();
    gatewayStub.getOrder.and.returnValue(response.asObservable());
    const facade = create();

    facade.loadOrder('order-1');

    TestBed.resetTestingModule();
    response.next(ORDER_A);
    response.complete();

    expect(facade.order()).toBeNull();
  });
});
