import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VendedorEstado } from '@agua/contracts';
import type { VendedorProfileV2DTO } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { VendedorProfileService } from '../vendedor-profile.service';
import { VendedorProfilePage } from './vendedor-profile-page';

const PROFILE: VendedorProfileV2DTO = {
  nombre: 'Ana',
  apellido: 'Gómez',
  dni: '12345678',
  cuil: '20-12345678-3',
  cuit: '30-12345678-3',
  telefono: '351123456',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  ciudadDefault: 'Córdoba',
  zonaEntrega: 'Norte',
};

describe('VendedorProfilePage', () => {
  let fixture: ComponentFixture<VendedorProfilePage>;
  let element: HTMLElement;
  let page: VendedorProfilePage;
  const serviceStub = {
    getProfile: jasmine.createSpy('getProfile'),
    updateProfile: jasmine.createSpy('updateProfile'),
    uploadLogo: jasmine.createSpy('uploadLogo'),
  };

  beforeEach(async () => {
    serviceStub.getProfile.calls.reset();
    serviceStub.updateProfile.calls.reset();
    serviceStub.uploadLogo.calls.reset();
    await TestBed.configureTestingModule({
      imports: [VendedorProfilePage],
      providers: [
        provideRouter([]),
        { provide: VendedorProfileService, useValue: serviceStub },
        {
          provide: AuthService,
          useValue: { changePassword: jasmine.createSpy(), logout: jasmine.createSpy() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorProfilePage);
    page = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingProfile(): Observable<VendedorProfileV2DTO> {
    return new Observable<VendedorProfileV2DTO>(() => {});
  }

  it('shows the loading state while the profile request is in flight', () => {
    serviceStub.getProfile.and.returnValue(pendingProfile());

    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu perfil');
  });

  it('renders datos, negocio and the change-password form read-only', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('Gómez');
    expect(element.textContent).toContain('12345678');
    expect(element.textContent).toContain('20-12345678-3');
    expect(element.textContent).toContain('30-12345678-3');
    expect(element.textContent).toContain('351123456');
    expect(element.textContent).toContain('Aguas del Sur');
    expect(element.textContent).toContain('Córdoba');
    expect(element.textContent).toContain('Norte');
    expect(element.textContent).toContain('Editar');
    expect(element.querySelector('app-change-password-form')).not.toBeNull();
  });

  it('shows the error state and reloads the profile on retry', () => {
    serviceStub.getProfile.and.returnValues(throwError(() => new Error('boom')), of(PROFILE));

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar tu perfil');

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Aguas del Sur');
  });

  it('populates the edit form from the profile', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(page.editing()).toBeTrue();
    expect(page.form.getRawValue()).toEqual({
      nombre: 'Ana',
      apellido: 'Gómez',
      dni: '12345678',
      cuil: '20-12345678-3',
      cuit: '30-12345678-3',
      telefono: '351123456',
      empresa: 'Aguas del Sur',
      ciudadDefault: 'Córdoba',
      zonaEntrega: 'Norte',
      logo: '',
    });
  });

  it('sends a camelCase payload without estado, qrCode or identity on update', () => {
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
      dni: '12345678',
      cuil: '20-12345678-3',
      cuit: '30-12345678-3',
      telefono: '351123456',
      empresa: 'Aguas del Sur',
      ciudadDefault: 'Córdoba',
      zonaEntrega: 'Norte',
      logo: undefined,
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

    page.form.patchValue({ cuit: '', zonaEntrega: '' });
    page.save();
    fixture.detectChanges();

    const [payload] = serviceStub.updateProfile.calls.mostRecent().args as [
      Record<string, unknown>,
    ];
    expect(payload['cuit']).toBeUndefined();
    expect(payload['zonaEntrega']).toBeUndefined();
    expect(payload['nombre']).toBe('Ana');
    expect(payload['estado']).toBeUndefined();
    expect(payload['qrCode']).toBeUndefined();
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

  it('uploads the selected logo and shows the returned preview URL', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.uploadLogo.and.returnValue(of('/uploads/logos/abc.webp'));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    page.onLogoSelected({ target: { files: [file], value: '' } } as unknown as Event);
    fixture.detectChanges();

    expect(serviceStub.uploadLogo).toHaveBeenCalledWith(file);
    expect(page.form.controls.logo.value).toBe('/uploads/logos/abc.webp');
    expect(page.logoUrl()).toBe('/uploads/logos/abc.webp');
  });

  it('shows an inline error when the logo upload fails', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.uploadLogo.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    page.onLogoSelected({ target: { files: [file], value: '' } } as unknown as Event);
    fixture.detectChanges();

    expect(page.uploading()).toBeFalse();
    expect(page.form.controls.logo.value).toBe('');
    expect(element.textContent).toContain(
      'No pudimos subir el logo. Inténtalo de nuevo en unos segundos.',
    );
  });
});
