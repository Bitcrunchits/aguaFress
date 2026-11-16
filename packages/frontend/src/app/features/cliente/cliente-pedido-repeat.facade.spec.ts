import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { OrderResponse } from '@agua/contracts';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  ClientePedidoRepeatFacade,
  ClientePedidoRepeatOutcome,
} from './cliente-pedido-repeat.facade';
import { CLIENTE_PEDIDO_REPEAT_GATEWAY } from './cliente-pedido-repeat.gateway';
import { ClienteProviderSelectionService } from './cliente-provider-selection.service';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';

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
    { productId: 'producto-2', nombre: 'Soda 1.5 L', cantidad: 1, precioUnitario: 1500 },
  ],
  totalSinIva: 3500,
  iva: 735,
  total: 4235,
  estado: OrderEstado.ENTREGADO,
  metodoPago: MetodoPago.CONTRA_ENTREGA,
  direccion: { calle: 'Av. Corrientes', numero: '1234' },
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

describe('ClientePedidoRepeatFacade', () => {
  const gatewayStub = {
    addItem: jasmine.createSpy('addItem'),
  };
  const providerStub = {
    remember: jasmine.createSpy('remember'),
  };
  const sessionStub: {
    currentSession: { readonly user: { readonly id: string } } | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: { user: { id: 'user-1' } }, sessionReplacement$: EMPTY };
  let sessionReplacement: Subject<void>;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    sessionStub.sessionReplacement$ = sessionReplacement.asObservable();
    gatewayStub.addItem.calls.reset();
    providerStub.remember.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        ClientePedidoRepeatFacade,
        { provide: CLIENTE_PEDIDO_REPEAT_GATEWAY, useValue: gatewayStub },
        { provide: ClienteProviderSelectionService, useValue: providerStub },
        { provide: CLIENTE_SESSION_READER, useValue: sessionStub },
      ],
    });
  });

  function create(): ClientePedidoRepeatFacade {
    return TestBed.inject(ClientePedidoRepeatFacade);
  }

  it('persists the provider and re-adds every item translating productId to productoId', () => {
    gatewayStub.addItem.and.returnValue(of({}));
    const facade = create();

    facade.repeatOrder(ORDER);

    expect(providerStub.remember).toHaveBeenCalledOnceWith('user-1', 'vendedor-1');
    expect(gatewayStub.addItem).toHaveBeenCalledTimes(2);
    expect(gatewayStub.addItem.calls.argsFor(0)).toEqual([
      { vendedorId: 'vendedor-1', productoId: 'producto-1', cantidad: 2 },
    ]);
    expect(gatewayStub.addItem.calls.argsFor(1)).toEqual([
      { vendedorId: 'vendedor-1', productoId: 'producto-2', cantidad: 1 },
    ]);
    expect(facade.results().map((result) => result.outcome)).toEqual([
      ClientePedidoRepeatOutcome.Added,
      ClientePedidoRepeatOutcome.Added,
    ]);
    expect(facade.completed()).toBeTrue();
    expect(facade.repeating()).toBeFalse();
    expect(facade.failedResults()).toEqual([]);
    expect(facade.navigateToCart()).toBeTrue();
  });

  it('reports per-item failures without blocking the batch', () => {
    gatewayStub.addItem.and.returnValues(
      of({}),
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    const facade = create();

    facade.repeatOrder(ORDER);

    expect(facade.results().map((result) => result.outcome)).toEqual([
      ClientePedidoRepeatOutcome.Added,
      ClientePedidoRepeatOutcome.OutOfStock,
    ]);
    expect(facade.failedResults().length).toBe(1);
    expect(facade.navigateToCart()).toBeFalse();
    expect(facade.completed()).toBeTrue();
  });

  it('maps forbidden and network failures to their outcomes', () => {
    gatewayStub.addItem.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 403 })),
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    const facade = create();

    facade.repeatOrder(ORDER);

    expect(facade.results().map((result) => result.outcome)).toEqual([
      ClientePedidoRepeatOutcome.Forbidden,
      ClientePedidoRepeatOutcome.Network,
    ]);
    expect(facade.navigateToCart()).toBeFalse();
  });

  it('does not start a repeat while one is in flight', () => {
    const pending = new Subject<unknown>();
    gatewayStub.addItem.and.returnValue(pending.asObservable());
    const facade = create();

    facade.repeatOrder(ORDER);
    facade.repeatOrder(ORDER);

    expect(gatewayStub.addItem).toHaveBeenCalledTimes(2);
    expect(providerStub.remember).toHaveBeenCalledTimes(1);
  });

  it('ignores an order with no items', () => {
    const facade = create();

    facade.repeatOrder({ ...ORDER, items: [] });

    expect(gatewayStub.addItem).not.toHaveBeenCalled();
    expect(providerStub.remember).not.toHaveBeenCalled();
    expect(facade.repeating()).toBeFalse();
    expect(facade.completed()).toBeFalse();
  });

  it('resets the in-flight repeat on session replacement', () => {
    const pending = new Subject<unknown>();
    gatewayStub.addItem.and.returnValue(pending.asObservable());
    const facade = create();
    facade.repeatOrder(ORDER);

    expect(facade.repeating()).toBeTrue();

    sessionReplacement.next();

    expect(facade.repeating()).toBeFalse();
    expect(facade.completed()).toBeFalse();
    expect(facade.results()).toEqual([]);
  });
});
