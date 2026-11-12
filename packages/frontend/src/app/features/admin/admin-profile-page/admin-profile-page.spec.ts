import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserRole } from '@agua/contracts';
import type { SuperAdminProfileResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminProfileService } from '../admin-profile.service';
import { AdminProfilePage } from './admin-profile-page';

const PROFILE: SuperAdminProfileResponse = {
  id: 'super-admin-1',
  email: 'admin@example.com',
  nombre: 'Ana',
  apellido: 'Gómez',
  role: UserRole.SUPER_ADMIN,
};

describe('AdminProfilePage', () => {
  let fixture: ComponentFixture<AdminProfilePage>;
  let element: HTMLElement;
  let page: AdminProfilePage;
  const serviceStub = {
    getProfile: jasmine.createSpy('getProfile'),
    updateProfile: jasmine.createSpy('updateProfile'),
  };

  beforeEach(async () => {
    serviceStub.getProfile.calls.reset();
    serviceStub.updateProfile.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminProfilePage],
      providers: [
        provideRouter([]),
        { provide: AdminProfileService, useValue: serviceStub },
        {
          provide: AuthService,
          useValue: { changePassword: jasmine.createSpy(), logout: jasmine.createSpy() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProfilePage);
    page = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingProfile(): Observable<SuperAdminProfileResponse> {
    return new Observable<SuperAdminProfileResponse>(() => {});
  }

  it('shows the loading state while the profile request is in flight', () => {
    serviceStub.getProfile.and.returnValue(pendingProfile());

    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu perfil');
  });

  it('renders the read-only profile with email and role and an edit action', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('Gómez');
    expect(element.textContent).toContain('admin@example.com');
    expect(element.textContent).toContain('Super administrador');
    expect(element.textContent).toContain('Editar');
  });

  it('shows the error state and reloads the profile on retry', () => {
    serviceStub.getProfile.and.returnValues(throwError(() => new Error('boom')), of(PROFILE));

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar tu perfil');

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Ana');
  });

  it('toggles into edit mode and populates the form from the profile', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(page.editing()).toBeTrue();
    expect(page.form.getRawValue()).toEqual({ nombre: 'Ana', apellido: 'Gómez' });
  });

  it('cancels editing and returns to the read-only view', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.cancelEditing();
    fixture.detectChanges();

    expect(page.editing()).toBeFalse();
    expect(serviceStub.updateProfile).not.toHaveBeenCalled();
  });

  it('updates the profile sending only nombre and apellido', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.updateProfile.and.returnValue(
      of({ ...PROFILE, nombre: 'María', apellido: 'Pérez' }),
    );
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.form.setValue({ nombre: 'María', apellido: 'Pérez' });
    page.save();
    fixture.detectChanges();

    expect(serviceStub.updateProfile).toHaveBeenCalledWith({ nombre: 'María', apellido: 'Pérez' });
    expect(page.editing()).toBeFalse();
    expect(element.textContent).toContain('María');
    expect(element.textContent).toContain('Perfil actualizado correctamente.');
  });

  it('keeps the form open and shows an inline error when the update fails', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    serviceStub.updateProfile.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.form.setValue({ nombre: 'María', apellido: 'Pérez' });
    page.save();
    fixture.detectChanges();

    expect(page.editing()).toBeTrue();
    expect(page.saving()).toBeFalse();
    expect(element.textContent).toContain(
      'No pudimos actualizar el perfil. Inténtalo de nuevo en unos segundos.',
    );
  });

  it('does not submit an empty name pair', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    fixture.detectChanges();
    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    page.form.setValue({ nombre: '', apellido: '' });
    page.save();

    expect(page.form.invalid).toBeTrue();
    expect(serviceStub.updateProfile).not.toHaveBeenCalled();
  });
});
