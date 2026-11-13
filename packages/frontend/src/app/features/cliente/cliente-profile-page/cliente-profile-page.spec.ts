import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TipoFactura, UserRole } from '@agua/contracts';
import type { UserProfile } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClienteProfileService } from '../cliente-profile.service';
import { ClienteProfilePage } from './cliente-profile-page';

const PROFILE: UserProfile = {
  id: 'cliente-1',
  email: 'cliente@example.com',
  role: UserRole.CLIENTE,
  isActive: true,
  nombre: 'Ana',
  apellido: 'Gómez',
  telefono: '351123456',
  profile: {
    nombre: 'Ana',
    apellido: 'Gómez',
    telefono: '351123456',
    dni: '12345678',
    tipoFactura: TipoFactura.B,
    direccionEntrega: {
      calle: 'Av. Corrientes',
      numero: '1234',
      pisoDepto: '2B',
      referencia: 'Portón negro',
      barrio: 'Centro',
      ciudad: 'Córdoba',
      provincia: 'Córdoba',
      codigoPostal: '5000',
    },
  },
};

describe('ClienteProfilePage', () => {
  let fixture: ComponentFixture<ClienteProfilePage>;
  let element: HTMLElement;
  let page: ClienteProfilePage;
  const serviceStub = {
    getProfile: jasmine.createSpy('getProfile'),
    updateProfile: jasmine.createSpy('updateProfile'),
  };

  beforeEach(async () => {
    serviceStub.getProfile.calls.reset();
    serviceStub.updateProfile.calls.reset();
    await TestBed.configureTestingModule({
      imports: [ClienteProfilePage],
      providers: [
        provideRouter([]),
        { provide: ClienteProfileService, useValue: serviceStub },
        {
          provide: AuthService,
          useValue: { changePassword: jasmine.createSpy(), logout: jasmine.createSpy() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteProfilePage);
    page = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingProfile(): Observable<UserProfile> {
    return new Observable<UserProfile>(() => {});
  }

  it('shows the loading state while the profile request is in flight', () => {
    serviceStub.getProfile.and.returnValue(pendingProfile());

    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu perfil');
  });

  it('renders datos and the delivery address read-only', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('Gómez');
    expect(element.textContent).toContain('351123456');
    expect(element.textContent).toContain('Factura B');
    expect(element.textContent).toContain('Av. Corrientes');
    expect(element.textContent).toContain('Córdoba');
    expect(element.textContent).toContain('Editar');
  });

  it('shows the error state and reloads the profile on retry', () => {
    serviceStub.getProfile.and.returnValues(throwError(() => new Error('boom')), of(PROFILE));

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar tu perfil');

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Av. Corrientes');
  });

  it('populates the edit form from the nested profile, mapping direccionEntrega into address', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(page.editing()).toBeTrue();
    expect(page.form.getRawValue()).toEqual({
      nombre: 'Ana',
      apellido: 'Gómez',
      telefono: '351123456',
      tipoFactura: TipoFactura.B,
      address: {
        calle: 'Av. Corrientes',
        numero: '1234',
        pisoDepto: '2B',
        referencia: 'Portón negro',
        barrio: 'Centro',
        ciudad: 'Córdoba',
        provincia: 'Córdoba',
        codigoPostal: '5000',
      },
    });
  });

  it('sends a flat camelCase address payload with tipoFactura on update', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.updateProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.save();
    fixture.detectChanges();

    expect(serviceStub.updateProfile).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellido: 'Gómez',
      telefono: '351123456',
      tipoFactura: TipoFactura.B,
      address: {
        calle: 'Av. Corrientes',
        numero: '1234',
        pisoDepto: '2B',
        referencia: 'Portón negro',
        barrio: 'Centro',
        ciudad: 'Córdoba',
        provincia: 'Córdoba',
        codigoPostal: '5000',
      },
    });
    expect(page.editing()).toBeFalse();
    expect(element.textContent).toContain('Perfil actualizado correctamente.');
  });

  it('omits empty optional fields from the update payload', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.updateProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.form.patchValue({
      telefono: '',
      address: { pisoDepto: '', referencia: '' },
    });
    page.save();
    fixture.detectChanges();

    const [payload] = serviceStub.updateProfile.calls.mostRecent().args as [
      Record<string, unknown>,
    ];
    expect(payload['telefono']).toBeUndefined();
    expect(payload['nombre']).toBe('Ana');
    const address = payload['address'] as Record<string, unknown>;
    expect(address['pisoDepto']).toBeUndefined();
    expect(address['referencia']).toBeUndefined();
    expect(address['calle']).toBe('Av. Corrientes');
  });

  it('keeps the form open and shows an inline error when the update fails', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.updateProfile.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.save();
    fixture.detectChanges();

    expect(page.editing()).toBeTrue();
    expect(page.saving()).toBeFalse();
    expect(element.textContent).toContain(
      'No pudimos actualizar el perfil. Inténtalo de nuevo en unos segundos.',
    );
  });
});
