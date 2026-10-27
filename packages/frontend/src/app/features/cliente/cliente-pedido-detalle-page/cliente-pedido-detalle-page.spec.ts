import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { ParamMap } from '@angular/router';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { OrderResponse } from '@agua/contracts';
import { BehaviorSubject } from 'rxjs';
import { ClientePedidoDetalleFacade } from '../cliente-pedido-detalle.facade';
import { ClientePedidoDetalleError } from '../cliente-pedido-detalle-error';
import { ClientePedidoDetallePage } from './cliente-pedido-detalle-page';

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
  direccion: {
    calle: 'Av. Corrientes',
    numero: '1234',
    pisoDepto: '3° B',
    barrio: 'Balvanera',
    ciudad: 'Buenos Aires',
    codigoPostal: 'C1084',
  },
  observaciones: 'Dejar en portería',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
};

describe('ClientePedidoDetallePage', () => {
  let fixture: ComponentFixture<ClientePedidoDetallePage>;
  let element: HTMLElement;

  const order = signal<OrderResponse | null>(null);
  const loading = signal(false);
  const notFound = signal(false);
  const error = signal<ClientePedidoDetalleError | null>(null);
  const loadOrder = jasmine.createSpy('loadOrder');
  let paramMap: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    order.set(null);
    loading.set(false);
    notFound.set(false);
    error.set(null);
    loadOrder.calls.reset();
    paramMap = new BehaviorSubject(convertToParamMap({ id: 'order-1' }));

    await TestBed.configureTestingModule({
      imports: [ClientePedidoDetallePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap.asObservable() } },
      ],
    })
      .overrideComponent(ClientePedidoDetallePage, {
        set: {
          providers: [
            {
              provide: ClientePedidoDetalleFacade,
              useValue: { order, loading, notFound, error, loadOrder },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClientePedidoDetallePage);
    element = fixture.nativeElement as HTMLElement;
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  it('requests the order id from the route on init', () => {
    fixture.detectChanges();

    expect(loadOrder).toHaveBeenCalledOnceWith('order-1');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Detalle del pedido');
  });

  it('requests the new order when the route id changes', () => {
    fixture.detectChanges();
    loadOrder.calls.reset();

    paramMap.next(convertToParamMap({ id: 'order-2' }));

    expect(loadOrder).toHaveBeenCalledOnceWith('order-2');
  });

  it('renders the loading state', () => {
    loading.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('Cargando pedido');
  });

  it('renders the not-found state with a back link', () => {
    notFound.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('No encontramos este pedido');
    const back = element.querySelector<HTMLAnchorElement>(
      '.cliente__state a[href="/cliente/pedidos"]',
    );
    expect(back?.textContent?.trim()).toBe('Volver a mis pedidos');
    expect(findButton('Reintentar')).toBeUndefined();
  });

  it('renders the generic error and retries the current order', () => {
    error.set(ClientePedidoDetalleError.Network);
    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos conectar con el servidor');

    findButton('Reintentar')?.click();

    expect(loadOrder).toHaveBeenCalledWith('order-1');
  });

  it('renders the order detail with items, totals, address, payment and dates', () => {
    order.set(ORDER);
    fixture.detectChanges();

    expect(element.textContent).toContain('Pedido P-0001');
    expect(element.textContent).toContain('Pendiente');

    const items = element.querySelector('.cliente__items');
    expect(items?.textContent).toContain('Agua mineral 500 ml');
    expect(items?.textContent).toContain('Cantidad: 2');
    expect(items?.textContent).toContain('1.000');
    expect(items?.textContent).toContain('2.000');

    const totals = element.querySelector('.cliente__totals');
    expect(totals?.textContent).toContain('2.000');
    expect(totals?.textContent).toContain('420');
    expect(totals?.textContent).toContain('2.420');

    const address = element.querySelector('.cliente__address');
    expect(address?.textContent).toContain('Av. Corrientes 1234');
    expect(address?.textContent).toContain('Balvanera');
    expect(address?.textContent).toContain('C1084');

    expect(element.querySelector('.cliente__payment')?.textContent).toContain(
      'Contra entrega',
    );
    expect(element.querySelector('.cliente__observaciones')?.textContent).toContain(
      'Dejar en portería',
    );

    const times = Array.from(element.querySelectorAll('time'));
    expect(times.length).toBe(2);
    expect(times[0].getAttribute('datetime')).toBe('2026-10-24');
    expect(times[0].textContent?.trim()).toBe('2026-10-24');
    expect(times[1].getAttribute('datetime')).toBe('2026-10-25');
    expect(times[1].textContent?.trim()).toBe('2026-10-25');
  });

  it('offers a back link to the orders list', () => {
    order.set(ORDER);
    fixture.detectChanges();

    const back = element.querySelector<HTMLAnchorElement>('.cliente__back');
    expect(back?.getAttribute('href')).toBe('/cliente/pedidos');
    expect(back?.textContent?.trim()).toBe('Volver a mis pedidos');
  });

  it('omits the observations block when the order has none', () => {
    order.set({ ...ORDER, observaciones: undefined });
    fixture.detectChanges();

    expect(element.querySelector('.cliente__observaciones')).toBeNull();
  });

  it('renders an em dash when the date is not a valid calendar date', () => {
    order.set({ ...ORDER, createdAt: '2026-02-30T00:00:00.000Z' });
    fixture.detectChanges();

    const time = element.querySelector('time');
    expect(time?.textContent?.trim()).toBe('—');
    expect(time?.hasAttribute('datetime')).toBeFalse();
  });
});
