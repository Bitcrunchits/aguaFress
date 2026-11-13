import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { ParamMap } from '@angular/router';
import { MetodoPago, OrderEstado, type OrderResponse, type VendedorClienteItemV2 } from '@agua/contracts';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { VendedorClientesService } from '../vendedor-clientes.service';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import { VendedorPedidoDetallePage } from './vendedor-pedido-detalle-page';

function makeOrder(estado: OrderEstado): OrderResponse {
  return {
    id: 'order-1',
    pedidoNumero: 'P-0001',
    clienteId: 'cliente-user-1',
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
    estado,
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
}

function carteraItem(clienteUserId: string, nombre: string, apellido?: string): VendedorClienteItemV2 {
  return { id: `cliente-${clienteUserId}`, nombre, apellido, telefono: '3515550000', clienteUserId };
}

describe('VendedorPedidoDetallePage', () => {
  let fixture: ComponentFixture<VendedorPedidoDetallePage>;
  let element: HTMLElement;

  const pedidosStub = {
    getById: jasmine.createSpy('getById'),
    confirm: jasmine.createSpy('confirm'),
    updateStatus: jasmine.createSpy('updateStatus'),
  };
  const clientesStub = { listCarteraForLookup: jasmine.createSpy('listCarteraForLookup') };
  let paramMap: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    pedidosStub.getById.calls.reset();
    pedidosStub.confirm.calls.reset();
    pedidosStub.updateStatus.calls.reset();
    clientesStub.listCarteraForLookup.calls.reset();
    clientesStub.listCarteraForLookup.and.returnValue(of([]));
    paramMap = new BehaviorSubject(convertToParamMap({ id: 'order-1' }));

    await TestBed.configureTestingModule({
      imports: [VendedorPedidoDetallePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap.asObservable() } },
        { provide: VendedorPedidosService, useValue: pedidosStub },
        { provide: VendedorClientesService, useValue: clientesStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPedidoDetallePage);
    element = fixture.nativeElement as HTMLElement;
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  it('requests the order and cartera from the route id on init', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));

    fixture.detectChanges();

    expect(pedidosStub.getById).toHaveBeenCalledOnceWith('order-1');
    expect(clientesStub.listCarteraForLookup).toHaveBeenCalledTimes(1);
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Detalle del pedido');
  });

  it('renders the loading state while the order is in flight', () => {
    pedidosStub.getById.and.returnValue(new Observable<never>(() => {}));

    fixture.detectChanges();

    expect(element.textContent).toContain('Cargando pedido');
  });

  it('renders the error state and reloads on retry', () => {
    pedidosStub.getById.and.returnValues(
      throwError(() => new Error('boom')),
      of(makeOrder(OrderEstado.PENDIENTE)),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar el pedido');

    element.querySelector<HTMLButtonElement>('.detalle__state--error button')?.click();
    fixture.detectChanges();

    expect(pedidosStub.getById).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Pedido P-0001');
  });

  it('renders items, totals, address, payment, dates and the cliente name', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));
    clientesStub.listCarteraForLookup.and.returnValue(
      of([carteraItem('cliente-user-1', 'María', 'López')]),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Pedido P-0001');
    expect(element.textContent).toContain('Pendiente');
    expect(element.textContent).toContain('María López');
    expect(element.textContent).toContain('Agua mineral 500 ml');
    expect(element.textContent).toContain('2 ×');
    expect(element.textContent).toContain('1.000');
    expect(element.textContent).toContain('Subtotal:');
    expect(element.textContent).toContain('Contra entrega');
    expect(element.textContent).toContain('Av. Corrientes 1234');
    expect(element.textContent).toContain('Balvanera');
    expect(element.textContent).toContain('C1084');
    expect(element.textContent).toContain('Dejar en portería');

    const times = Array.from(element.querySelectorAll('time'));
    expect(times[0].textContent?.trim()).toBe('2026-10-24');
    expect(times[1].textContent?.trim()).toBe('2026-10-25');
  });

  it('falls back to "Cliente no disponible" when the cartera has no match', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));

    fixture.detectChanges();

    expect(element.textContent).toContain('Cliente no disponible');
  });

  it('renders the four timeline steps with the current step marked', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.CONFIRMADO)));

    fixture.detectChanges();

    const steps = element.querySelectorAll('.timeline__step');
    expect(steps.length).toBe(4);
    expect(steps[0].classList).toContain('timeline__step--done');
    expect(steps[1].classList).toContain('timeline__step--current');
    expect(steps[2].classList).toContain('timeline__step--pending');
    expect(steps[3].classList).toContain('timeline__step--pending');
  });

  it('offers "Confirmar pedido" for a pendiente order and confirms it', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));
    pedidosStub.confirm.and.returnValue(
      of({ orderId: 'order-1', estado: OrderEstado.CONFIRMADO, mensaje: 'ok' }),
    );

    fixture.detectChanges();

    findButton('Confirmar pedido')?.click();

    expect(pedidosStub.confirm).toHaveBeenCalledOnceWith('order-1');
  });

  it('reloads the order and shows success feedback after an action', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));
    pedidosStub.confirm.and.returnValue(
      of({ orderId: 'order-1', estado: OrderEstado.CONFIRMADO, mensaje: 'ok' }),
    );

    fixture.detectChanges();
    findButton('Confirmar pedido')?.click();
    fixture.detectChanges();

    expect(pedidosStub.getById).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Pedido confirmado.');
  });

  it('shows error feedback and keeps the order when an action fails', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.PENDIENTE)));
    pedidosStub.confirm.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    findButton('Confirmar pedido')?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos actualizar el pedido');
    expect(pedidosStub.getById).toHaveBeenCalledTimes(1);
  });

  it('offers "Marcar en camino" for a confirmado order', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.CONFIRMADO)));
    pedidosStub.updateStatus.and.returnValue(of(makeOrder(OrderEstado.EN_CAMINO)));

    fixture.detectChanges();
    findButton('Marcar en camino')?.click();

    expect(pedidosStub.updateStatus).toHaveBeenCalledOnceWith('order-1', OrderEstado.EN_CAMINO);
  });

  it('offers "Marcar entregado" for an en_camino order', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.EN_CAMINO)));
    pedidosStub.updateStatus.and.returnValue(of(makeOrder(OrderEstado.ENTREGADO)));

    fixture.detectChanges();
    findButton('Marcar entregado')?.click();

    expect(pedidosStub.updateStatus).toHaveBeenCalledOnceWith('order-1', OrderEstado.ENTREGADO);
  });

  it('shows no actions for a terminal entregado order', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.ENTREGADO)));

    fixture.detectChanges();

    expect(findButton('Confirmar pedido')).toBeUndefined();
    expect(findButton('Marcar en camino')).toBeUndefined();
    expect(findButton('Marcar entregado')).toBeUndefined();
    expect(element.textContent).toContain('No hay acciones disponibles');
  });

  it('shows a terminal note for a cancelado order and mutes the timeline', () => {
    pedidosStub.getById.and.returnValue(of(makeOrder(OrderEstado.CANCELADO)));

    fixture.detectChanges();

    expect(element.textContent).toContain('Este pedido está cancelado.');
    expect(element.textContent).toContain('No hay acciones disponibles');
  });
});
