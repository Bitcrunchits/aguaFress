import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MetodoPago, OrderEstado, OrderJobStatus } from '@agua/contracts';
import type { OrderResponse } from '@agua/contracts';
import { Subject } from 'rxjs';
import { ClientePedidosFacade } from '../cliente-pedidos.facade';
import {
  ClientePedidosTrackingError,
  ClientePedidosTrackingFacade,
  type ClientePedidoTrackingView,
} from '../cliente-pedidos-tracking.facade';
import { ClientePedidosListError } from '../cliente-pedidos-error';
import { ClientePedidosPage } from './cliente-pedidos-page';

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

const EXPECTED_DATE = ORDER.createdAt.slice(0, 10);

describe('ClientePedidosPage', () => {
  let fixture: ComponentFixture<ClientePedidosPage>;
  let element: HTMLElement;

  const orders = signal<OrderResponse[]>([]);
  const loading = signal(false);
  const error = signal<ClientePedidosListError | null>(null);
  const trackings = signal<ClientePedidoTrackingView[]>([]);
  const loadOrders = jasmine.createSpy('loadOrders');
  const trackPending = jasmine.createSpy('trackPending');
  const dismissTracking = jasmine.createSpy('dismiss');
  let completed$: Subject<void>;

  beforeEach(async () => {
    orders.set([]);
    loading.set(false);
    error.set(null);
    trackings.set([]);
    loadOrders.calls.reset();
    trackPending.calls.reset();
    dismissTracking.calls.reset();
    completed$ = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [ClientePedidosPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(ClientePedidosPage, {
        set: {
          providers: [
            {
              provide: ClientePedidosFacade,
              useValue: { orders, loading, error, loadOrders },
            },
            {
              provide: ClientePedidosTrackingFacade,
              useValue: { trackings, trackPending, dismiss: dismissTracking, completed$ },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClientePedidosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  it('loads the orders and pending trackings on init', () => {
    loading.set(true);
    fixture.detectChanges();

    expect(loadOrders).toHaveBeenCalledTimes(1);
    expect(trackPending).toHaveBeenCalledTimes(1);
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Mis pedidos');
    expect(element.textContent).toContain('Cargando pedidos');
  });

  it('reloads the list when a pending tracking completes', () => {
    fixture.detectChanges();
    loadOrders.calls.reset();

    completed$.next();

    expect(loadOrders).toHaveBeenCalledTimes(1);
  });

  it('stops reloading the list after the page is destroyed', () => {
    fixture.detectChanges();
    loadOrders.calls.reset();

    fixture.destroy();
    completed$.next();

    expect(loadOrders).not.toHaveBeenCalled();
  });

  it('renders the order cards with number, date, state, total and provider', () => {
    orders.set([ORDER]);
    fixture.detectChanges();

    const time = element.querySelector('time');
    expect(element.textContent).toContain('Pedido P-0001');
    expect(time?.textContent?.trim()).toBe(EXPECTED_DATE);
    expect(time?.getAttribute('datetime')).toBe(EXPECTED_DATE);
    expect(element.textContent).toContain('Pendiente');
    expect(element.querySelector('.cliente__order-total')?.textContent).toContain('2.420');
    expect(element.textContent).toContain('Proveedor: vendedor-1');
  });

  it('renders an em dash when the order date is parseable but not ISO 8601', () => {
    orders.set([{ ...ORDER, createdAt: 'October 24, 2026' }]);
    fixture.detectChanges();

    const time = element.querySelector('time');
    expect(time?.textContent?.trim()).toBe('—');
    expect(time?.hasAttribute('datetime')).toBeFalse();
  });

  it('renders an em dash and omits datetime when the order date is invalid', () => {
    orders.set([{ ...ORDER, createdAt: 'not-a-date' }]);
    fixture.detectChanges();

    const time = element.querySelector('time');
    expect(time?.textContent?.trim()).toBe('—');
    expect(time?.hasAttribute('datetime')).toBeFalse();
  });

  it('renders the empty state', () => {
    fixture.detectChanges();

    expect(element.textContent).toContain('Todavía no tenés pedidos.');
  });

  it('renders the typed error copy and retries the list', () => {
    error.set(ClientePedidosListError.Network);
    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos conectar con el servidor');

    loadOrders.calls.reset();
    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Reintentar',
    );
    retry?.click();

    expect(loadOrders).toHaveBeenCalledTimes(1);
  });

  it('renders the pending tracking status and attempts', () => {
    trackings.set([
      {
        trackingId: 'tracking-1',
        status: OrderJobStatus.PROCESSING,
        attempts: 3,
        terminal: false,
      },
    ]);
    fixture.detectChanges();

    const card = element.querySelector('.cliente__tracking');
    expect(card?.textContent).toContain('Procesando');
    expect(card?.textContent).toContain('Intentos: 3');
    expect(card?.getAttribute('aria-busy')).toBe('true');
    expect(element.textContent).toContain('Pedidos en proceso');
    expect(findButton('Descartar')).toBeUndefined();
  });

  it('dismisses a terminal tracking from its card', () => {
    trackings.set([
      {
        trackingId: 'tracking-1',
        status: OrderJobStatus.FAILED,
        attempts: 5,
        errorMessage: 'No hay stock suficiente',
        terminal: true,
      },
    ]);
    fixture.detectChanges();

    findButton('Descartar')?.click();

    expect(dismissTracking).toHaveBeenCalledOnceWith('tracking-1');
  });

  it('renders only the trackings exposed after the active user changes', () => {
    trackings.set([
      {
        trackingId: 'tracking-1',
        status: OrderJobStatus.PROCESSING,
        attempts: 1,
        terminal: false,
      },
    ]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Procesando');

    trackings.set([
      {
        trackingId: 'tracking-3',
        status: OrderJobStatus.RETRYING,
        attempts: 1,
        terminal: false,
      },
    ]);
    fixture.detectChanges();

    expect(element.textContent).toContain('Reintentando');
    expect(element.textContent).not.toContain('Procesando');
  });

  it('shows the server message for a terminal tracking failure', () => {
    trackings.set([
      {
        trackingId: 'tracking-1',
        status: OrderJobStatus.FAILED,
        attempts: 5,
        errorCode: 'STOCK_UNAVAILABLE',
        errorMessage: 'No hay stock suficiente',
        terminal: true,
      },
    ]);
    fixture.detectChanges();

    expect(element.querySelector('.cliente__tracking-message')?.textContent).toContain(
      'No hay stock suficiente',
    );
  });

  it('falls back to neutral Spanish when a tracking is not found', () => {
    trackings.set([
      {
        trackingId: 'tracking-1',
        status: OrderJobStatus.PENDING,
        attempts: 4,
        errorCode: ClientePedidosTrackingError.NotFound,
        terminal: true,
      },
    ]);
    fixture.detectChanges();

    expect(element.querySelector('.cliente__tracking-message')?.textContent).toContain(
      'No encontramos el seguimiento de este pedido',
    );
  });
});
