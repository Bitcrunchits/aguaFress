import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendedorEstado, type SuperAdminVendedorItem, type SuperAdminVendedorListResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AdminVendedoresService } from '../admin-vendedores.service';
import { VendedoresListPage } from './vendedores-list-page';

const VENDEDOR: SuperAdminVendedorItem = {
  id: 'vendedor-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@example.com',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  clientesCount: 12,
  fechaRegistro: '2026-01-15T12:00:00.000Z',
};

function pageResponse(
  items: SuperAdminVendedorItem[],
  page = 1,
  totalPages = 1,
): SuperAdminVendedorListResponse {
  return {
    data: items,
    pagination: { page, limit: 10, total: items.length, totalPages },
  };
}

describe('VendedoresListPage', () => {
  let fixture: ComponentFixture<VendedoresListPage>;
  let element: HTMLElement;
  const serviceStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedoresListPage],
      providers: [{ provide: AdminVendedoresService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedoresListPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<SuperAdminVendedorListResponse> {
    return new Observable<SuperAdminVendedorListResponse>(() => {});
  }

  it('shows the loading state while the list request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(element.textContent).toContain('Cargando vendedores');
  });

  it('renders rows with contract data and Spanish estado labels', () => {
    serviceStub.list.and.returnValue(
      of(
        pageResponse([
          VENDEDOR,
          {
            ...VENDEDOR,
            id: 'vendedor-2',
            nombre: 'Luis',
            apellido: 'Pérez',
            email: 'luis@example.com',
            empresa: 'Del Norte',
            estado: VendedorEstado.PENDIENTE,
          },
        ]),
      ),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana Gómez');
    expect(element.textContent).toContain('ana@example.com');
    expect(element.textContent).toContain('Aguas del Sur');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('12');
    expect(element.textContent).toContain('2026-01-15');
    expect(element.textContent).toContain('Luis Pérez');
    expect(element.textContent).toContain('Pendiente');
  });

  it('shows the empty state when no vendedores are registered', () => {
    serviceStub.list.and.returnValue(of(pageResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay vendedores registrados todavía.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads the current page on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(pageResponse([VENDEDOR])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los vendedores');

    const retryButton = element.querySelector<HTMLButtonElement>('button');
    retryButton?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 1, limit: 10 }]);
    expect(element.textContent).toContain('Ana Gómez');
  });

  it('retries the page that failed, not the last successful one', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([VENDEDOR], 1, 3)),
      throwError(() => new Error('boom')),
      of(pageResponse([{ ...VENDEDOR, id: 'vendedor-3' }], 2, 3)),
    );

    fixture.detectChanges();
    const next = element.querySelectorAll<HTMLButtonElement>('button')[1];
    next.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los vendedores');

    element.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(3);
    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 10 }]);
    expect(element.textContent).toContain('Página 2 de 3');
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([VENDEDOR], 1, 2)),
      of(pageResponse([{ ...VENDEDOR, id: 'vendedor-2' }], 2, 2)),
    );

    fixture.detectChanges();

    let [previous, next] = element.querySelectorAll<HTMLButtonElement>('button');
    expect(element.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 10 }]);
    expect(element.textContent).toContain('Página 2 de 2');
    [previous, next] = element.querySelectorAll<HTMLButtonElement>('button');
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();
  });

  it('falls back to an em dash when optional contract fields are absent at runtime', () => {
    // The usuario-service list mapping currently omits `clientesCount` and
    // `fechaRegistro`; the page must degrade gracefully, not render blanks.
    const rawItem = { ...VENDEDOR } as unknown as Record<string, unknown>;
    delete rawItem['clientesCount'];
    delete rawItem['fechaRegistro'];
    delete rawItem['empresa'];
    serviceStub.list.and.returnValue(
      of(pageResponse([rawItem as unknown as SuperAdminVendedorItem])),
    );

    fixture.detectChanges();

    const cells = element.querySelectorAll('tbody td');
    expect(cells[2].textContent?.trim()).toBe('—');
    expect(cells[4].textContent?.trim()).toBe('—');
    expect(cells[5].textContent?.trim()).toBe('—');
  });
});
