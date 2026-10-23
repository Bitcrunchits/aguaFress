import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ClienteProviderResponse } from '@agua/contracts';
import { ClienteHomeFacade } from '../cliente-home.facade';
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

describe('ClientePage', () => {
  let fixture: ComponentFixture<ClientePage>;
  let element: HTMLElement;

  const providers = signal<ClienteProviderResponse[]>([]);
  const selectedProvider = signal<ClienteProviderResponse | null>(null);
  const loading = signal(false);
  const failed = signal(false);
  const retry = jasmine.createSpy('retry');

  beforeEach(async () => {
    providers.set([]);
    selectedProvider.set(null);
    loading.set(false);
    failed.set(false);
    retry.calls.reset();

    await TestBed.configureTestingModule({ imports: [ClientePage] })
      .overrideComponent(ClientePage, {
        set: {
          providers: [
            {
              provide: ClienteHomeFacade,
              useValue: { providers, selectedProvider, loading, failed, retry },
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
});
