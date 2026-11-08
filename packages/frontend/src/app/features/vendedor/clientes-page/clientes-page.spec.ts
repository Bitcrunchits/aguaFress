import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PaginatedResponse, VendedorClienteItem } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorClientesService } from '../vendedor-clientes.service';
import { VendedorClientesPage } from './clientes-page';

const CLIENTE: VendedorClienteItem = {
  id: 'cliente-1',
  nombre: 'María',
  apellido: 'López',
  telefono: '3515551234',
};

function pageResponse(
  items: VendedorClienteItem[],
  page = 1,
  totalPages = 1,
): PaginatedResponse<VendedorClienteItem> {
  return {
    data: items,
    pagination: { page, limit: 10, total: items.length, totalPages },
  };
}

describe('VendedorClientesPage', () => {
  let fixture: ComponentFixture<VendedorClientesPage>;
  let element: HTMLElement;
  const serviceStub = {
    listCartera: jasmine.createSpy('listCartera'),
  };

  beforeEach(async () => {
    serviceStub.listCartera.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedorClientesPage],
      providers: [{ provide: VendedorClientesService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorClientesPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<PaginatedResponse<VendedorClienteItem>> {
    return new Observable<PaginatedResponse<VendedorClienteItem>>(() => {});
  }

  it('shows the loading state while the cartera request is in flight', () => {
    serviceStub.listCartera.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.listCartera).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(element.textContent).toContain('Cargando clientes');
  });

  it('renders rows with the client name and phone number', () => {
    serviceStub.listCartera.and.returnValue(
      of(
        pageResponse([
          CLIENTE,
          { id: 'cliente-2', nombre: 'Juan', telefono: '3515559876' },
        ]),
      ),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('María López');
    expect(element.textContent).toContain('3515551234');
    expect(element.textContent).toContain('Juan');
    expect(element.textContent).toContain('3515559876');
  });

  it('falls back to an em dash when telefono is absent at runtime', () => {
    serviceStub.listCartera.and.returnValue(
      of(pageResponse([{ id: 'cliente-3', nombre: 'Pedro' }])),
    );

    fixture.detectChanges();

    const cells = element.querySelectorAll('tbody td');
    expect(cells[0].textContent?.trim()).toBe('Pedro');
    expect(cells[1].textContent?.trim()).toBe('—');
  });

  it('shows the empty state when the cartera has no clients', () => {
    serviceStub.listCartera.and.returnValue(of(pageResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No tienes clientes todavía.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads the current page on retry', () => {
    serviceStub.listCartera.and.returnValues(
      throwError(() => new Error('boom')),
      of(pageResponse([CLIENTE])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los clientes');

    const retryButton = element.querySelector<HTMLButtonElement>(
      '.clientes__state--error button',
    );
    retryButton?.click();
    fixture.detectChanges();

    expect(serviceStub.listCartera).toHaveBeenCalledTimes(2);
    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([{ page: 1, limit: 10 }]);
    expect(element.textContent).toContain('María López');
  });

  it('retries the page that failed, not the last successful one', () => {
    serviceStub.listCartera.and.returnValues(
      of(pageResponse([CLIENTE], 1, 3)),
      throwError(() => new Error('boom')),
      of(pageResponse([{ ...CLIENTE, id: 'cliente-4' }], 2, 3)),
    );

    fixture.detectChanges();
    const next = element.querySelectorAll<HTMLButtonElement>(
      '.clientes__pagination button',
    )[1];
    next.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los clientes');

    element.querySelector<HTMLButtonElement>('.clientes__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.listCartera).toHaveBeenCalledTimes(3);
    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([{ page: 2, limit: 10 }]);
    expect(element.textContent).toContain('Página 2 de 3');
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    serviceStub.listCartera.and.returnValues(
      of(pageResponse([CLIENTE], 1, 2)),
      of(pageResponse([{ ...CLIENTE, id: 'cliente-5' }], 2, 2)),
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

    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([{ page: 2, limit: 10 }]);
    expect(element.textContent).toContain('Página 2 de 2');
    [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.clientes__pagination button',
    );
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();
  });

  it('sends the search filter when applied and resets to page 1', () => {
    serviceStub.listCartera.and.returnValues(
      of(pageResponse([CLIENTE], 2, 2)),
      of(pageResponse([{ ...CLIENTE, id: 'cliente-6' }], 1, 1)),
    );

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#clientes-search')!;
    searchInput.value = 'maria';
    searchInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('#clientes-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'maria' },
    ]);
    expect(element.textContent).toContain('Búsqueda: maria');
  });

  it('sends only page and limit when filters are cleared', () => {
    serviceStub.listCartera.and.returnValue(of(pageResponse([CLIENTE])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#clientes-search')!;
    searchInput.value = 'maria';
    searchInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('#clientes-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'maria' },
    ]);

    element.querySelector<HTMLButtonElement>('#clientes-clear')!.click();
    fixture.detectChanges();

    expect(serviceStub.listCartera.calls.mostRecent().args).toEqual([{ page: 1, limit: 10 }]);
    expect(element.textContent).not.toContain('Búsqueda: maria');
  });

  it('disables the Limpiar button when no filters are active', () => {
    serviceStub.listCartera.and.returnValue(of(pageResponse([CLIENTE])));

    fixture.detectChanges();

    const clearButton = element.querySelector<HTMLButtonElement>('#clientes-clear')!;
    expect(clearButton.disabled).toBeTrue();
  });
});
