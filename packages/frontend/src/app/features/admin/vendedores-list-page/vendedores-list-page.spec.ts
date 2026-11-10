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
  const serviceStub = {
    list: jasmine.createSpy('list'),
    changeEstado: jasmine.createSpy('changeEstado'),
  };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    serviceStub.changeEstado.calls.reset();
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

    const retryButton = element.querySelector<HTMLButtonElement>(
      '.vendedores__state--error button',
    );
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
    const next = element.querySelectorAll<HTMLButtonElement>(
      '.vendedores__pagination button',
    )[1];
    next.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los vendedores');

    element
      .querySelector<HTMLButtonElement>('.vendedores__state--error button')
      ?.click();
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

    let [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.vendedores__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 10 }]);
    expect(element.textContent).toContain('Página 2 de 2');
    [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.vendedores__pagination button',
    );
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

  it('sends the search filter when applied', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#vendedores-search')!;
    searchInput.value = 'ana';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('#vendedores-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'ana' },
    ]);
  });

  it('sends the estado filter when applied', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#vendedores-estado')!;
    select.value = VendedorEstado.INACTIVO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('#vendedores-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, estado: VendedorEstado.INACTIVO },
    ]);
  });

  it('resets to page 1 when filters are applied from page 2', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([VENDEDOR], 1, 3)),
      of(pageResponse([{ ...VENDEDOR, id: 'vendedor-2' }], 2, 3)),
      of(pageResponse([VENDEDOR], 1, 3)),
    );

    fixture.detectChanges();

    element.querySelectorAll<HTMLButtonElement>('.vendedores__pagination button')[1].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Página 2 de 3');

    const searchInput = element.querySelector<HTMLInputElement>('#vendedores-search')!;
    searchInput.value = 'ana';
    searchInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('#vendedores-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'ana' },
    ]);
    expect(element.textContent).toContain('Página 1 de 3');
  });

  it('sends only page and limit when filters are cleared', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#vendedores-search')!;
    searchInput.value = 'ana';
    searchInput.dispatchEvent(new Event('input'));
    const select = element.querySelector<HTMLSelectElement>('#vendedores-estado')!;
    select.value = VendedorEstado.INACTIVO;
    select.dispatchEvent(new Event('change'));
    element.querySelector<HTMLButtonElement>('#vendedores-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'ana', estado: VendedorEstado.INACTIVO },
    ]);

    element.querySelector<HTMLButtonElement>('#vendedores-clear')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 1, limit: 10 }]);
  });

  it('renders active-filter chips and clears them individually', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));

    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('#vendedores-search')!;
    searchInput.value = 'ana';
    searchInput.dispatchEvent(new Event('input'));
    const select = element.querySelector<HTMLSelectElement>('#vendedores-estado')!;
    select.value = VendedorEstado.ACTIVO;
    select.dispatchEvent(new Event('change'));
    element.querySelector<HTMLButtonElement>('#vendedores-apply')!.click();
    fixture.detectChanges();

    const chips = element.querySelector('.vendedores__chips');
    expect(chips).not.toBeNull();
    expect(chips!.textContent).toContain('Búsqueda: ana');
    expect(chips!.textContent).toContain('Estado: Activo');

    const estadoChipClear = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Quitar filtro de estado"]',
    );
    estadoChipClear!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, search: 'ana' },
    ]);
    expect(element.textContent).not.toContain('Estado: Activo');
  });

  it('disables the Limpiar button when no filters are active', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));

    fixture.detectChanges();

    const clearButton = element.querySelector<HTMLButtonElement>('#vendedores-clear')!;
    expect(clearButton.disabled).toBeTrue();
  });

  function openDialog(): void {
    element.querySelector<HTMLButtonElement>('tbody tr button')!.click();
    fixture.detectChanges();
  }

  function confirmButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('.confirm-dialog__button--confirm')!;
  }

  function typeConfirmPhrase(): void {
    const input = element.querySelector<HTMLInputElement>('.vendedores__dialog-confirm-input')!;
    input.value = 'BLOQUEAR';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('opens the confirmation dialog naming the vendor', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    fixture.detectChanges();

    openDialog();

    const dialog = element.querySelector('.confirm-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Ana Gómez');
    expect(dialog!.textContent).toContain('Activo');
  });

  it('calls changeEstado with the selected estado on confirm', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    serviceStub.changeEstado.and.returnValue(
      of({
        vendedorId: 'vendedor-1',
        estadoAnterior: VendedorEstado.ACTIVO,
        estadoNuevo: VendedorEstado.INACTIVO,
        updated: true,
      }),
    );
    fixture.detectChanges();

    openDialog();

    const select = element.querySelector<HTMLSelectElement>(
      '.vendedores__dialog-field select',
    )!;
    select.value = VendedorEstado.INACTIVO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    confirmButton().click();
    fixture.detectChanges();

    expect(serviceStub.changeEstado).toHaveBeenCalledWith('vendedor-1', {
      estado: VendedorEstado.INACTIVO,
    });
  });

  it('updates the row estado on success without a full reload', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    serviceStub.changeEstado.and.returnValue(
      of({
        vendedorId: 'vendedor-1',
        estadoAnterior: VendedorEstado.ACTIVO,
        estadoNuevo: VendedorEstado.BLOQUEADO,
        updated: true,
      }),
    );
    fixture.detectChanges();

    openDialog();

    const select = element.querySelector<HTMLSelectElement>(
      '.vendedores__dialog-field select',
    )!;
    select.value = VendedorEstado.BLOQUEADO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    typeConfirmPhrase();
    confirmButton().click();
    fixture.detectChanges();

    // The row reflects the new estado, the dialog is closed, and the list
    // was not re-requested.
    expect(element.textContent).toContain('Bloqueado');
    expect(element.querySelector('.confirm-dialog')).toBeNull();
    expect(serviceStub.list).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error and keeps the previous estado on failure', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    serviceStub.changeEstado.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    openDialog();
    confirmButton().click();
    fixture.detectChanges();

    expect(element.querySelector('.vendedores__dialog-error')).not.toBeNull();
    expect(element.textContent).toContain('No pudimos cambiar el estado');
    // Dialog stays open and the row is untouched.
    expect(element.querySelector('.confirm-dialog')).not.toBeNull();
    expect(element.textContent).toContain('Activo');
  });

  it('prevents a double submit while the mutation is in flight', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    serviceStub.changeEstado.and.returnValue(pendingList());
    fixture.detectChanges();

    openDialog();

    const button = confirmButton();
    button.click();
    fixture.detectChanges();

    expect(button.disabled).toBeTrue();

    button.click();
    fixture.detectChanges();

    expect(serviceStub.changeEstado).toHaveBeenCalledTimes(1);
  });

  function dialogOptionValues(): string[] {
    const options = element.querySelectorAll<HTMLOptionElement>(
      '.vendedores__dialog-field select option',
    );
    return Array.from(options).map((option) => option.value);
  }

  function renderAndOpenDialog(estado: VendedorEstado): void {
    serviceStub.list.and.returnValue(
      of(pageResponse([{ ...VENDEDOR, estado }])),
    );
    fixture.detectChanges();
    openDialog();
  }

  it('from pendiente the dialog offers only activo', () => {
    renderAndOpenDialog(VendedorEstado.PENDIENTE);

    expect(dialogOptionValues()).toEqual([VendedorEstado.ACTIVO]);
  });

  it('from activo the dialog offers inactivo and bloqueado', () => {
    renderAndOpenDialog(VendedorEstado.ACTIVO);

    expect(dialogOptionValues()).toEqual([
      VendedorEstado.INACTIVO,
      VendedorEstado.BLOQUEADO,
    ]);
  });

  it('from inactivo the dialog offers only activo, not bloqueado', () => {
    renderAndOpenDialog(VendedorEstado.INACTIVO);

    expect(dialogOptionValues()).toEqual([VendedorEstado.ACTIVO]);
  });

  it('from bloqueado the dialog offers only inactivo, not activo', () => {
    renderAndOpenDialog(VendedorEstado.BLOQUEADO);

    expect(dialogOptionValues()).toEqual([VendedorEstado.INACTIVO]);
  });

  it('initializes the dialog to the first valid target, not the current estado', () => {
    renderAndOpenDialog(VendedorEstado.PENDIENTE);

    const select = element.querySelector<HTMLSelectElement>(
      '.vendedores__dialog-field select',
    )!;
    expect(select.value).toBe(VendedorEstado.ACTIVO);
    expect(element.querySelector('.confirm-dialog')!.textContent).toContain(
      'de Pendiente a Activo',
    );
  });

  it('updates the row from the local target, ignoring the response body', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    // The backend returns the raw vendedor row, not a shaped `estadoNuevo`.
    // Even if that body disagrees with the chosen target, the optimistic
    // update must reflect what the user selected.
    serviceStub.changeEstado.and.returnValue(of({ ...VENDEDOR }));
    fixture.detectChanges();

    openDialog();

    const select = element.querySelector<HTMLSelectElement>(
      '.vendedores__dialog-field select',
    )!;
    select.value = VendedorEstado.BLOQUEADO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    typeConfirmPhrase();
    confirmButton().click();
    fixture.detectChanges();

    expect(serviceStub.changeEstado).toHaveBeenCalledWith('vendedor-1', {
      estado: VendedorEstado.BLOQUEADO,
    });
    expect(element.textContent).toContain('Bloqueado');
    expect(element.querySelector('.confirm-dialog')).toBeNull();
  });

  it('shows the reactivation note only when the vendor is bloqueado', () => {
    renderAndOpenDialog(VendedorEstado.BLOQUEADO);

    expect(element.textContent).toContain(
      'No existe el paso directo de bloqueado a activo',
    );
  });

  it('does not show the reactivation note for a non-bloqueado vendor', () => {
    renderAndOpenDialog(VendedorEstado.ACTIVO);

    expect(element.textContent).not.toContain(
      'No existe el paso directo de bloqueado a activo',
    );
  });

  it('requires typing BLOQUEAR before confirming a bloqueado transition', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    serviceStub.changeEstado.and.returnValue(of({ ...VENDEDOR }));
    fixture.detectChanges();

    openDialog();

    const select = element.querySelector<HTMLSelectElement>(
      '.vendedores__dialog-field select',
    )!;
    select.value = VendedorEstado.BLOQUEADO;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(confirmButton().disabled).toBeTrue();
    expect(element.textContent).toContain(
      'El vendedor perderá el acceso a la plataforma.',
    );

    typeConfirmPhrase();

    expect(confirmButton().disabled).toBeFalse();

    confirmButton().click();
    fixture.detectChanges();

    expect(serviceStub.changeEstado).toHaveBeenCalledWith('vendedor-1', {
      estado: VendedorEstado.BLOQUEADO,
    });
  });

  it('does not require the phrase for a non-bloqueado target', () => {
    serviceStub.list.and.returnValue(of(pageResponse([VENDEDOR])));
    fixture.detectChanges();

    openDialog();

    // VENDEDOR is ACTIVO, so the first valid target is INACTIVO.
    expect(confirmButton().disabled).toBeFalse();
    expect(element.querySelector('.vendedores__dialog-confirm-input')).toBeNull();
    expect(element.textContent).not.toContain('perderá el acceso');
  });
});
