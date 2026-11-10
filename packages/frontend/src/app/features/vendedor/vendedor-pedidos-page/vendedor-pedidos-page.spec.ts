import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado, type OrderResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
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

describe('VendedorPedidosPage', () => {
  let fixture: ComponentFixture<VendedorPedidosPage>;
  let element: HTMLElement;
  const serviceStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedorPedidosPage],
      providers: [{ provide: VendedorPedidosService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPedidosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<OrderResponse[]> {
    return new Observable<OrderResponse[]>(() => {});
  }

  it('shows the loading state while the orders request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando pedidos');
  });

  it('renders rows with número, fecha, total and Spanish estado label', () => {
    serviceStub.list.and.returnValue(
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

  it('shows the empty state when there are no orders', () => {
    serviceStub.list.and.returnValue(of([]));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay pedidos para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los pedidos');

    element.querySelector<HTMLButtonElement>('.pedidos__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('P-1');
  });

  it('paginates client-side with a page size of 10', () => {
    const orders = Array.from({ length: 12 }, (_, i) =>
      order(String(i + 1), OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
    );
    serviceStub.list.and.returnValue(of(orders));

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Página 1 de 2');
    expect(element.querySelectorAll('tbody tr').length).toBe(10);

    element.querySelectorAll<HTMLButtonElement>('.pedidos__pagination button')[1].click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('filters by estado client-side and resets to page 1', () => {
    serviceStub.list.and.returnValue(
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
    expect(serviceStub.list).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when the estado filter matches nothing', () => {
    serviceStub.list.and.returnValue(
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
    serviceStub.list.and.returnValue(of([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')]));

    fixture.detectChanges();

    const [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.pedidos__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 1');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeTrue();
  });
});
