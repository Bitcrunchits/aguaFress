import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  MetodoPago,
  OrderJobStatus,
  UserRole,
  type AsyncAcceptedResponse,
  type CartResponse,
  type LoginResponse,
} from '@agua/contracts';
import { Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClienteCarritoEdicionService } from '../cliente-carrito-edicion.service';
import { ClienteCarritoLecturaService } from '../cliente-carrito-lectura.service';
import type { ClientePedidoDraft } from '../cliente-pedido-draft.contract';
import { ClientePedidoService } from '../cliente-pedido.service';
import { ClienteProviderStateService } from '../cliente-provider-state.service';
import { ClienteCarritoPage } from './cliente-carrito-page';

const CART: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: 'vendedor-1',
  items: [
    {
      id: 'item-1',
      productoId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 2,
      precioUnitario: 1200,
      subtotal: 2400,
    },
    {
      id: 'item-2',
      productoId: 'producto-2',
      nombre: 'Soda 1.5 L',
      cantidad: 1,
      precioUnitario: 1800,
      subtotal: 1800,
    },
  ],
  total: 4200,
  expiresAt: '2026-10-25T12:00:00.000Z',
};

const UPDATED_CART: CartResponse = {
  ...CART,
  items: [
    { ...CART.items[0], cantidad: 3, subtotal: 3600 },
    CART.items[1],
  ],
  total: 5400,
};

const DRAFT: ClientePedidoDraft = {
  calle: 'Av. Siempre Viva',
  numero: '742',
};

const ACCEPTED: AsyncAcceptedResponse = {
  jobId: 'job-1',
  trackingId: 'tracking-1',
  status: OrderJobStatus.PENDING,
  statusUrl: '/api/v1/orders/job-status?id=tracking-1',
  acceptedAt: '2026-10-24T12:00:00.000Z',
};

describe('ClienteCarritoPage', () => {
  const sessionReplacement = new Subject<void>();
  const session: LoginResponse = {
    token: 'access-token-1',
    refreshToken: 'refresh-token-1',
    user: { id: 'user-1', email: 'cliente@example.com', role: UserRole.CLIENTE },
  };

  let auth: {
    currentSession: LoginResponse | null;
    sessionReplacement$: Subject<void>;
    sessionReady$: Observable<boolean>;
  };
  let lectura: { getCart: jasmine.Spy };
  let edicion: { updateItem: jasmine.Spy; deleteItem: jasmine.Spy };
  let pedido: { createOrder: jasmine.Spy };
  let providerStore: { read: jasmine.Spy; save: jasmine.Spy; clear: jasmine.Spy };

  beforeEach(async () => {
    auth = {
      currentSession: session,
      sessionReplacement$: sessionReplacement,
      sessionReady$: of(true),
    };
    lectura = { getCart: jasmine.createSpy('getCart').and.returnValue(of(CART)) };
    edicion = {
      updateItem: jasmine.createSpy('updateItem').and.returnValue(of(UPDATED_CART)),
      deleteItem: jasmine.createSpy('deleteItem').and.returnValue(of(CART)),
    };
    pedido = { createOrder: jasmine.createSpy('createOrder').and.returnValue(of(ACCEPTED)) };
    providerStore = {
      read: jasmine.createSpy('read').and.returnValue('vendedor-1'),
      save: jasmine.createSpy('save'),
      clear: jasmine.createSpy('clear'),
    };

    await TestBed.configureTestingModule({
      imports: [ClienteCarritoPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ClienteProviderStateService, useValue: providerStore },
        { provide: ClienteCarritoLecturaService, useValue: lectura },
        { provide: ClienteCarritoEdicionService, useValue: edicion },
        { provide: ClientePedidoService, useValue: pedido },
      ],
    }).compileComponents();
  });

  function render(): {
    element: HTMLElement;
    confirmOrder: (draft: ClientePedidoDraft) => void;
    detectChanges: () => void;
  } {
    const fixture = TestBed.createComponent(ClienteCarritoPage);
    fixture.detectChanges();
    return {
      element: fixture.nativeElement as HTMLElement,
      confirmOrder: (draft) => fixture.componentInstance.confirmOrder(draft),
      detectChanges: () => fixture.detectChanges(),
    };
  }

  it('loads the cart of the stored provider', () => {
    const { element } = render();

    expect(lectura.getCart).toHaveBeenCalledWith('vendedor-1');
    expect(element.querySelectorAll('.cliente__item').length).toBe(2);
    expect(element.textContent).toContain('Agua mineral 500 ml');
    expect(element.querySelector('.cliente__total')?.textContent).toContain('Total');
  });

  it('shows the empty state when the provider has no active cart', () => {
    lectura.getCart.and.returnValue(of(null));

    const { element } = render();

    expect(element.textContent).toContain('Tu carrito está vacío.');
  });

  it('shows a loading state until the cart arrives', () => {
    const pending = new Subject<CartResponse>();
    lectura.getCart.and.returnValue(pending.asObservable());

    const { element, detectChanges } = render();

    expect(element.textContent).toContain('Cargando carrito');
    expect(element.querySelectorAll('.cliente__item').length).toBe(0);

    pending.next(CART);
    detectChanges();

    expect(element.textContent).not.toContain('Cargando carrito');
    expect(element.querySelectorAll('.cliente__item').length).toBe(2);
  });

  it('shows the load failure and retries it', () => {
    lectura.getCart.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const { element, detectChanges } = render();

    expect(element.textContent).toContain('No pudimos cargar el carrito.');

    lectura.getCart.and.returnValue(of(CART));
    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Reintentar',
    ) as HTMLButtonElement;
    retry.click();
    detectChanges();

    expect(lectura.getCart).toHaveBeenCalledTimes(2);
    expect(element.querySelectorAll('.cliente__item').length).toBe(2);
  });

  it('increases the quantity of an item', () => {
    const { element } = render();

    const plus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    plus.click();

    expect(edicion.updateItem).toHaveBeenCalledWith({
      cartId: 'cart-1',
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
      cantidad: 3,
    });
  });

  it('removes an item from the cart', () => {
    const { element } = render();

    const remove = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;
    remove.click();

    expect(edicion.deleteItem).toHaveBeenCalledWith({
      cartId: 'cart-1',
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
    });
  });

  it('confirms the order against the provider of the visible cart', () => {
    const { element, confirmOrder, detectChanges } = render();

    confirmOrder(DRAFT);
    detectChanges();

    expect(pedido.createOrder).toHaveBeenCalledTimes(1);
    const [request, idempotencyKey] = pedido.createOrder.calls.mostRecent().args as [
      Record<string, unknown>,
      string,
    ];
    expect(request).toEqual({
      vendedorId: 'vendedor-1',
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion: { calle: 'Av. Siempre Viva', numero: '742' },
    });
    expect(typeof idempotencyKey).toBe('string');
    expect(idempotencyKey.length).toBeGreaterThan(0);
    expect(element.textContent).toContain('Pedido recibido');
    expect(element.textContent).toContain('tracking-1');
  });

  it('does not confirm the order while a cart mutation is in flight', () => {
    const pending = new Subject<CartResponse>();
    edicion.updateItem.and.returnValue(pending.asObservable());

    const { element, confirmOrder } = render();

    const plus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    plus.click();

    confirmOrder(DRAFT);

    expect(pedido.createOrder).not.toHaveBeenCalled();
  });

  it('does not mutate the cart while a confirmation is in flight', () => {
    const pending = new Subject<AsyncAcceptedResponse>();
    pedido.createOrder.and.returnValue(pending.asObservable());

    const { element, confirmOrder, detectChanges } = render();

    confirmOrder(DRAFT);
    detectChanges();

    const plus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    expect(plus.disabled).toBeTrue();
    plus.click();

    expect(edicion.updateItem).not.toHaveBeenCalled();
  });

  it('does not mutate the cart after the order was accepted', () => {
    const { element, confirmOrder, detectChanges } = render();

    confirmOrder(DRAFT);
    detectChanges();

    const plus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    expect(plus.disabled).toBeTrue();
    plus.click();

    expect(edicion.updateItem).not.toHaveBeenCalled();
  });

  it('disables the cart controls while a mutation is in flight', () => {
    const pending = new Subject<CartResponse>();
    edicion.updateItem.and.returnValue(pending.asObservable());

    const { element, detectChanges } = render();

    const plus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    plus.click();
    detectChanges();

    expect(plus.disabled).toBeTrue();
    const remove = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;
    expect(remove.disabled).toBeTrue();

    pending.next(UPDATED_CART);
    detectChanges();

    const refreshedPlus = element.querySelector(
      '[aria-label="Agregar una unidad de Agua mineral 500 ml"]',
    ) as HTMLButtonElement;
    const refreshedRemove = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;
    expect(refreshedPlus.disabled).toBeFalse();
    expect(refreshedRemove.disabled).toBeFalse();
  });
});
