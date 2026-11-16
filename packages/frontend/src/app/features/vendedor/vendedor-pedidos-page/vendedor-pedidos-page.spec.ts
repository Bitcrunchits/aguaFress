import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OrderEstado } from '@agua/contracts';
import type { OrderListResponseV2, PaginatedResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import { VendedorPedidosPage } from './vendedor-pedidos-page';

function order(id: string, estado: OrderEstado, createdAt: string): OrderListResponseV2 {
  return {
    id,
    pedidoNumero: `P-${id}`,
    estado,
    total: 2420,
    createdAt,
    vendedorId: 'vendedor-1',
  };
}

function listResponse(orders: OrderListResponseV2[]): PaginatedResponse<OrderListResponseV2> {
  return {
    data: orders,
    pagination: { page: 1, limit: 20, total: orders.length, totalPages: 1 },
  };
}

describe('VendedorPedidosPage', () => {
  let fixture: ComponentFixture<VendedorPedidosPage>;
  let element: HTMLElement;
  const pedidosStub = { list: jasmine.createSpy('list') };
  const routerStub = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };

  beforeEach(async () => {
    pedidosStub.list.calls.reset();
    routerStub.navigate.calls.reset();

    await TestBed.configureTestingModule({
      imports: [VendedorPedidosPage],
      providers: [
        { provide: VendedorPedidosService, useValue: pedidosStub },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPedidosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<PaginatedResponse<OrderListResponseV2>> {
    return new Observable<PaginatedResponse<OrderListResponseV2>>(() => {});
  }

  it('shows the loading state while the orders request is in flight', () => {
    pedidosStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(pedidosStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando pedidos');
  });

  it('renders rows with número, fecha, total and Spanish estado label', () => {
    pedidosStub.list.and.returnValue(
      of(
        listResponse([
          order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
          order('2', OrderEstado.ENTREGADO, '2026-10-23T00:00:00.000Z'),
        ]),
      ),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('P-1');
    expect(element.textContent).toContain('2026-10-24');
    expect(element.textContent).toContain('Pendiente');
    expect(element.textContent).toContain('P-2');
    expect(element.textContent).toContain('Entregado');
  });

  it('renders the server-resolved cliente nombre y apellido', () => {
    pedidosStub.list.and.returnValue(
      of(
        listResponse([
          {
            ...order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
            clienteNombre: 'María',
            clienteApellido: 'López',
          },
        ]),
      ),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('María López');
    expect(element.textContent).not.toContain('Cliente no disponible');
  });

  it('renders only the cliente nombre when apellido is absent', () => {
    pedidosStub.list.and.returnValue(
      of(
        listResponse([
          {
            ...order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
            clienteNombre: 'Juan',
          },
        ]),
      ),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Juan');
    expect(element.textContent).not.toContain('Cliente no disponible');
  });

  it('falls back to "Cliente no disponible" when the server sends no name', () => {
    pedidosStub.list.and.returnValue(
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Cliente no disponible');
  });

  it('navigates to the order detail when a row is clicked', () => {
    pedidosStub.list.and.returnValue(
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.click();

    expect(routerStub.navigate).toHaveBeenCalledOnceWith(['/vendedor/pedidos', '1']);
  });

  it('navigates to the order detail on Enter keydown (keyboard accessibility)', () => {
    pedidosStub.list.and.returnValue(
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(routerStub.navigate).toHaveBeenCalledOnceWith(['/vendedor/pedidos', '1']);
  });

  it('does not navigate on unrelated keys', () => {
    pedidosStub.list.and.returnValue(
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
    );

    fixture.detectChanges();

    const row = element.querySelector<HTMLElement>('tbody tr.pedidos__row');
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no orders', () => {
    pedidosStub.list.and.returnValue(of(listResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay pedidos para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    pedidosStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
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
    pedidosStub.list.and.returnValue(of(listResponse(orders)));

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
      of(
        listResponse([
          order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z'),
          order('2', OrderEstado.ENTREGADO, '2026-10-23T00:00:00.000Z'),
        ]),
      ),
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
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
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
    pedidosStub.list.and.returnValue(
      of(listResponse([order('1', OrderEstado.PENDIENTE, '2026-10-24T00:00:00.000Z')])),
    );

    fixture.detectChanges();

    const [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.pedidos__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 1');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeTrue();
  });
});
