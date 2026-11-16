import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  SuperAdminClienteItemV2,
  SuperAdminClientesResponseV2,
} from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AdminClientesService } from '../admin-clientes.service';
import { AdminClientesPage } from './admin-clientes-page';

const CLIENTE: SuperAdminClienteItemV2 = {
  id: 'cliente-1',
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '1122334455',
  dni: '30123456',
  vendedor: { nombre: 'Ana', apellido: 'Gómez', empresa: 'Aguas del Sur' },
  createdAt: '2026-01-15T12:00:00.000Z',
};

function pageResponse(
  items: SuperAdminClienteItemV2[],
  page = 1,
  totalPages = 1,
): SuperAdminClientesResponseV2 {
  return {
    data: items,
    pagination: { page, limit: 20, total: items.length, totalPages },
  };
}

describe('AdminClientesPage', () => {
  let fixture: ComponentFixture<AdminClientesPage>;
  let element: HTMLElement;
  const serviceStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminClientesPage],
      providers: [{ provide: AdminClientesService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClientesPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<SuperAdminClientesResponseV2> {
    return new Observable<SuperAdminClientesResponseV2>(() => {});
  }

  it('shows the loading state while the clientes request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(element.textContent).toContain('Cargando clientes');
  });

  it('renders rows and degrades email/asignación columns to an em dash', () => {
    serviceStub.list.and.returnValue(of(pageResponse([CLIENTE])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Juan Pérez');
    expect(element.textContent).toContain('30123456');
    expect(element.textContent).toContain('1122334455');
    expect(element.textContent).toContain('Ana Gómez · Aguas del Sur');
    expect(element.textContent).toContain('2026-01-15');

    const cells = element.querySelectorAll('tbody tr:first-child td');
    expect(cells[4].textContent?.trim()).toBe('—');
    expect(cells[5].textContent?.trim()).toBe('—');
  });

  it('renders the vendor name without an empresa suffix when empresa is null', () => {
    const cliente: SuperAdminClienteItemV2 = {
      ...CLIENTE,
      vendedor: { nombre: 'Ana', apellido: 'Gómez', empresa: null },
    };
    serviceStub.list.and.returnValue(of(pageResponse([cliente])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana Gómez');
    expect(element.textContent).not.toContain('·');
  });

  it('shows the empty state when there are no clientes', () => {
    serviceStub.list.and.returnValue(of(pageResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay clientes registrados todavía.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(pageResponse([CLIENTE])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los clientes');

    element.querySelector<HTMLButtonElement>('.clientes__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Juan Pérez');
  });

  it('sends the search filter when applied', () => {
    serviceStub.list.and.returnValue(of(pageResponse([CLIENTE])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#clientes-search')!;
    searchInput.value = 'juan';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('#clientes-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, search: 'juan' },
    ]);
  });

  it('sends only page and limit when filters are cleared', () => {
    serviceStub.list.and.returnValue(of(pageResponse([CLIENTE])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#clientes-search')!;
    searchInput.value = 'juan';
    searchInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('#clientes-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, search: 'juan' },
    ]);

    element.querySelector<HTMLButtonElement>('#clientes-clear')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 1, limit: 20 }]);
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([CLIENTE], 1, 2)),
      of(pageResponse([{ ...CLIENTE, id: 'cliente-2' }], 2, 2)),
    );

    fixture.detectChanges();

    let [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.clientes__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 20 }]);
    [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.clientes__pagination button',
    );
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();
  });
});
