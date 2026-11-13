import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MetodoPago, OrderEstado, type OrderResponse, type VendedorClienteItemV2 } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorClientesService } from '../vendedor-clientes.service';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import { VendedorPedidosPage } from './vendedor-pedidos-page';

function order(id: string, estado: OrderEstado, createdAt: string): OrderResponse {
  return {
    id,
    pedidoNumero: `P-${id}`,
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
    direccion: { calle: 'Av. Corrientes', numero: '1234' },
    createdAt,
    updatedAt: createdAt,
  };
}

function carteraItem(clienteUserId: string, nombre: string, apellido?: string): VendedorClienteItemV2 {
  return { id: `cliente-${clienteUserId}`, nombre, apellido, telefono: '3515550000', clienteUserId };
}

describe('VendedorPedidosPage', () => {
  let fixture: ComponentFixture<VendedorPedidosPage>;
  let element: HTMLElement;
  const pedidosStub = { list: jasmine.createSpy('list') };
  const clientesStub = { listCarteraForLookup: jasmine.createSpy('listCarteraForLookup') };
  const routerStub = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };

  beforeEach(async () => {
    pedidosStub.list.calls.reset();
    clientesStub.listCarteraForLookup.calls.reset();
    clientesStub.listCarteraForLookup.and.returnValue(of([]));
    routerStub.navigate.calls.reset();

    await TestBed.configureTestingModule({
      imports: [VendedorPedidosPage],
      providers: [
        { provide: VendedorPedidosService, useValue: pedidosStub },
        { provide: VendedorClientesService, useValue: clientesStub },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPedidosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<OrderResponse[]> {
    return new Observable<OrderResponse[]>(() => {});
  }

  it('shows the loading state while the orders request is in flight', () => {
    pedidosStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(pedidosStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando pedidos');
  });

  it('renders rows with número, fecha, total and Spanish estado label', () => {
    pedidosStub.list.and.returnValue(
      of([
        order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
        order('2', OrderEstado.ENTREGADO, '2026-10-23T00:00:00.000Z'),
      ]),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('P-1');
    expect(element.textContent).toContain('2026-10-24');
    expect(element.textContent).toContain('Pendiente');
    expect(element.textContent).toContain('P-2');
    expect(element.textContent).toContain('Entregado');
  });

  it('resolves the cliente name from the cartera lookup via clienteUserId', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );
    clientesStub.listCarteraForLookup.and.returnValue(
      of([carteraItem('cliente-user-1', 'María', 'López')]),
    );

    fixture.detectChanges();

    expect(clientesStub.listCarteraForLookup).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('María López');
    expect(element.textContent).not.toContain('Cliente no disponible');
  });

  it('falls back to "Cliente no disponible" when the cartera has no matching clienteUserId', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );
    clientesStub.listCarteraForLookup.and.returnValue(
      of([carteraItem('otro-user', 'Juan', 'Pérez')]),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Cliente no disponible');
  });

  it('still renders the list when the cartera request fails', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );
    clientesStub.listCarteraForLookup.and.returnValue(
      throwError(() => new Error('cartera boom')),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('P-1');
    expect(element.textContent).toContain('Cliente no disponible');
    expect(element.textContent).not.toContain('No pudimos cargar los pedidos');
  });

  it('navigates to the order detail when a row is clicked', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.click();

    expect(routerStub.navigate).toHaveBeenCalledOnceWith(['/vendedor/pedidos', '1']);
  });

  it('navigates to the order detail on Enter keydown (keyboard accessibility)', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(routerStub.navigate).toHaveBeenCalledOnceWith(['/vendedor/pedidos', '1']);
  });

  it('does not navigate on unrelated keys', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no orders', () => {
    pedidosStub.list.and.returnValue(of([]));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay pedidos para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    pedidosStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los pedidos');

    element.querySelector<HTMLButtonElement>('.pedidos__state--error button')?.click();
    fixture.detectChanges();

    expect(pedidosStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('P-1');
  });

  it('paginates client-side with a page size of 10', () => {
    const orders = Array.from({ length: 12 }, (_, i) =>
      order(String(i + 1), OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
    );
    pedidosStub.list.and.returnValue(of(orders));

    fixture.detectChanges();

    expect(pedidosStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Página 1 de 2');
    expect(element.querySelectorAll('tbody tr').length).toBe(10);

    element.querySelectorAll<HTMLButtonElement>('.pedidos__pagination button')[1].click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('filters by estado client-side and resets to page 1', () => {
    pedidosStub.list.and.returnValue(
      of([
        order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
        order('2', OrderEstado.ENTREGADO, '2026-10-23T00:00:00.000Z'),
      ]),
    );

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#pedidos-estado')!;
    select.value = OrderEstado.ENTREGADO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element.textContent).toContain('P-2');
    expect(element.textContent).not.toContain('P-1');
    expect(pedidosStub.list).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when the estado filter matches nothing', () => {
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#pedidos-estado')!;
    select.value = OrderEstado.ENTREGADO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element.textContent).toContain('No hay pedidos para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    pedidosStub.list.and.returnValue(of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]));

    fixture.detectChanges();

    const [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.pedidos__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 1');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeTrue();
  });
});
