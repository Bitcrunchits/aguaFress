import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ClienteProviderResponse } from '@agua/contracts';
import { ClienteHomeFacade, ClienteSelectionError } from '../cliente-home.facade';
import { ClientePage } from './cliente-page';

const PROVIDER_A: ClienteProviderResponse = {
  id: 'vendedor-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  ciudad: 'Córdoba',
  telefono: '3515551234',
  isDefault: false,
};


const PROVIDER_B: ClienteProviderResponse = {
  id: 'vendedor-2',
  nombre: 'Luis',
  apellido: 'Pérez',
  empresa: 'Del Norte',
  isDefault: true,
};

describe('ClientePage', () => {
  let fixture: ComponentFixture<ClientePage>;
  let element: HTMLElement;

  const providers = signal<ClienteProviderResponse[]>([]);
  const selectedProvider = signal<ClienteProviderResponse | null>(null);
  const loading = signal(false);
  const failed = signal(false);
  const retry = jasmine.createSpy('retry');
  const selectingId = signal<string | null>(null);
  const selectionError = signal<ClienteSelectionError | null>(null);
  const showSelector = signal(false);
  const select = jasmine.createSpy('select');
  const changeProvider = jasmine.createSpy('changeProvider');

  beforeEach(async () => {
    providers.set([]);
    selectedProvider.set(null);
    loading.set(false);
    failed.set(false);
    selectingId.set(null);
    selectionError.set(null);
    showSelector.set(false);
    retry.calls.reset();
    select.calls.reset();
    changeProvider.calls.reset();

    await TestBed.configureTestingModule({ imports: [ClientePage] })
      .overrideComponent(ClientePage, {
        set: {
          providers: [
            {
              provide: ClienteHomeFacade,
              useValue: {
                providers,
                selectedProvider,
                loading,
                failed,
                retry,
                selectingId,
                selectionError,
                showSelector,
                select,
                changeProvider,
              },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClientePage);
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders the loading state', () => {
    loading.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('Cargando proveedores');
  });

  it('renders the error state and forwards retry', () => {
    failed.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos cargar tus proveedores');

    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Reintentar',
    );
    button?.click();

    expect(retry).toHaveBeenCalled();
  });

  it('renders the empty state', () => {
    fixture.detectChanges();

    expect(element.textContent).toContain('Todavía no tienes proveedores asociados');
  });

  it('renders the active provider', () => {
    providers.set([PROVIDER_A]);
    selectedProvider.set(PROVIDER_A);
    fixture.detectChanges();

    expect(element.textContent).toContain('Ana Gómez');
    expect(element.textContent).toContain('Aguas del Sur');
  });

  it('renders the selector and forwards the chosen provider', () => {
    providers.set([PROVIDER_A, PROVIDER_B]);
    showSelector.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('Elige un proveedor');

    const buttons = Array.from(element.querySelectorAll('button')).filter(
      (candidate) => candidate.textContent?.trim() === 'Seleccionar',
    );
    expect(buttons.length).toBe(2);
    buttons[0].click();

    expect(select).toHaveBeenCalledWith(PROVIDER_A);
  });

  it('renders the selection error', () => {
    providers.set([PROVIDER_A, PROVIDER_B]);
    showSelector.set(true);
    selectionError.set(ClienteSelectionError.NOT_FOUND);
    fixture.detectChanges();

    expect(element.textContent).toContain('El proveedor ya no está asociado');
  });

  it('forwards the change-provider action', () => {
    providers.set([PROVIDER_A, PROVIDER_B]);
    selectedProvider.set(PROVIDER_A);
    fixture.detectChanges();

    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Cambiar proveedor',
    );
    button?.click();

    expect(changeProvider).toHaveBeenCalled();
  });
});
