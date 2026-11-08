import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VendedorEstado, type VendedorProfile } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorPerfilService } from '../vendedor-perfil.service';
import { VendedorPage } from './vendedor-page';

const PROFILE: VendedorProfile = {
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
};

describe('VendedorPage', () => {
  let fixture: ComponentFixture<VendedorPage>;
  let element: HTMLElement;
  const service = { getProfile: jasmine.createSpy('getProfile') };

  beforeEach(async () => {
    service.getProfile.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedorPage],
      providers: [provideRouter([]), { provide: VendedorPerfilService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPage);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the loading state while the profile request is in flight', () => {
    service.getProfile.and.returnValue(new Observable<never>(() => {}));

    fixture.detectChanges();

    expect(service.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu información');
    expect(element.textContent).not.toContain('La gestión del catálogo todavía no está disponible');
  });

  it('renders the real vendedor data, the Spanish estado label and the catalog link', () => {
    service.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Hola, Ana Gómez');
    expect(element.textContent).toContain('Aguas del Sur');
    expect(element.querySelector('.vendedor-home__badge')?.textContent?.trim()).toBe('Activo');
    const link = element.querySelector('a.vendedor-home__acceso');
    expect(link?.getAttribute('href')).toBe('/vendedor/catalogo/productos');
    expect(link?.textContent).toContain('Crea, edita y desactiva tus productos.');
  });

  for (const [estado, label] of [
    [VendedorEstado.PENDIENTE, 'Pendiente de aprobación'],
    [VendedorEstado.INACTIVO, 'Inactivo'],
    [VendedorEstado.BLOQUEADO, 'Bloqueado'],
  ] as const) {
    it(`labels the ${estado} estado in Spanish`, () => {
      service.getProfile.and.returnValue(of({ ...PROFILE, estado }));

      fixture.detectChanges();

      expect(element.querySelector('.vendedor-home__badge')?.textContent?.trim()).toBe(label);
      expect(element.textContent).toContain('La edición se habilita cuando tu cuenta esté activa.');
    });
  }

  it('shows a network error with retry and recovers on retry', () => {
    service.getProfile.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(PROFILE),
    );

    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos conectar con el servidor',
    );

    const retry = element.querySelector<HTMLButtonElement>('[role="alert"] button');
    expect(retry?.textContent?.trim()).toBe('Reintentar');
    retry?.click();
    fixture.detectChanges();

    expect(service.getProfile).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('Hola, Ana Gómez');
  });

  it('explains a 403 as an inactive or blocked account', () => {
    service.getProfile.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    fixture.detectChanges();

    expect(element.textContent).toContain('Tu cuenta de vendedor está inactiva o bloqueada');
  });
});
