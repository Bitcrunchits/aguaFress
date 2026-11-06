import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VendedorEstado } from '@agua/contracts';
import type { VendedorProfile } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorProfileService } from '../vendedor-profile.service';
import { VendedorPage } from './vendedor-page';

const PROFILE: VendedorProfile = {
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  ciudadDefault: 'Córdoba',
  zonaEntrega: 'Norte',
};

describe('VendedorPage', () => {
  let fixture: ComponentFixture<VendedorPage>;
  let element: HTMLElement;
  const serviceStub = { getProfile: jasmine.createSpy('getProfile') };

  beforeEach(async () => {
    serviceStub.getProfile.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedorPage],
      providers: [provideRouter([]), { provide: VendedorProfileService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingProfile(): Observable<VendedorProfile> {
    return new Observable<VendedorProfile>(() => {});
  }

  it('shows the loading state while the profile request is in flight', () => {
    serviceStub.getProfile.and.returnValue(pendingProfile());

    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu perfil');
  });

  it('renders the profile card with Spanish estado label and delivery data', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Aguas del Sur');
    expect(element.textContent).toContain('Ana Gómez');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('Norte');
    expect(element.textContent).toContain('Córdoba');
  });

  it('falls back to the full name when empresa is missing', () => {
    serviceStub.getProfile.and.returnValue(of({ ...PROFILE, empresa: undefined }));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana Gómez');
  });

  it('omits zonaEntrega and ciudadDefault when absent', () => {
    serviceStub.getProfile.and.returnValue(
      of({ ...PROFILE, zonaEntrega: undefined, ciudadDefault: undefined }),
    );

    fixture.detectChanges();

    expect(element.textContent).not.toContain('Zona de entrega');
    expect(element.textContent).not.toContain('Ciudad');
  });

  it('shows the error state and reloads the profile on retry', () => {
    serviceStub.getProfile.and.returnValues(throwError(() => new Error('boom')), of(PROFILE));

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar tu perfil');

    const retryButton = element.querySelector<HTMLButtonElement>('button');
    retryButton?.click();
    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Aguas del Sur');
  });

  it('links to the product catalog', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    const link = element.querySelector<HTMLAnchorElement>(
      'a[href="/vendedor/catalogo/productos"]',
    );
    expect(link?.textContent?.trim()).toBe('Gestionar catálogo');
  });
});
