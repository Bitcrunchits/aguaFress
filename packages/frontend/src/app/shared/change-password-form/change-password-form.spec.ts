import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ChangePasswordResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordFormComponent } from './change-password-form';

describe('ChangePasswordFormComponent', () => {
  let changePassword: jasmine.Spy;
  let logout: jasmine.Spy;
  let router: Router;
  let component: ChangePasswordFormComponent;

  beforeEach(async () => {
    changePassword = jasmine.createSpy('changePassword');
    logout = jasmine.createSpy('logout');
    await TestBed.configureTestingModule({
      imports: [ChangePasswordFormComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { changePassword, logout } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component = TestBed.createComponent(ChangePasswordFormComponent).componentInstance;
  });

  function fillValidForm(): void {
    component.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: 'newsecret',
    });
  }

  it('marks every field touched and never submits when the form is invalid', () => {
    component.submit();

    expect(component.form.invalid).toBeTrue();
    expect(component.form.controls.currentPassword.touched).toBeTrue();
    expect(component.form.controls.newPassword.touched).toBeTrue();
    expect(component.form.controls.confirmNewPassword.touched).toBeTrue();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 6 characters', () => {
    component.form.setValue({
      currentPassword: 'secret',
      newPassword: 'short',
      confirmNewPassword: 'short',
    });

    expect(component.form.controls.newPassword.hasError('minlength')).toBeTrue();
    expect(component.form.invalid).toBeTrue();
  });

  it('flags a mismatch when the confirmation differs from the new password', () => {
    component.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: 'different',
    });
    component.form.controls.confirmNewPassword.markAsTouched();

    expect(component.form.hasError('passwordMismatch')).toBeTrue();
    expect(component.passwordMismatchErrorVisible).toBeTrue();
  });

  it('calls changePassword with the passwords and shows the success state', () => {
    const response: ChangePasswordResponse = { message: 'Contraseña actualizada' };
    changePassword.and.returnValue(of(response));
    fillValidForm();

    component.submit();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
    });
    expect(component.successMessage()).toContain('Contraseña actualizada');
    expect(component.errorMessage()).toBeNull();
    expect(component.submitting()).toBeFalse();
    expect(component.form.getRawValue()).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
  });

  it('maps a wrong current password (401) to a readable inline error', () => {
    changePassword.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    fillValidForm();

    component.submit();

    expect(component.errorMessage()).toBe('Contraseña actual incorrecta.');
    expect(component.successMessage()).toBeNull();
    expect(component.submitting()).toBeFalse();
  });

  it('maps an unexpected failure to a generic inline error', () => {
    changePassword.and.returnValue(throwError(() => new Error('server detail')));
    fillValidForm();

    component.submit();

    expect(component.errorMessage()).toBe(
      'No pudimos cambiar la contraseña. Inténtalo de nuevo en unos segundos.',
    );
  });

  it('logs out and navigates to the login route when the session is closed', () => {
    component.closeSession();

    expect(logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not emit a mismatch when the confirmation is empty', () => {
    component.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: '',
    });
    component.form.controls.confirmNewPassword.markAsTouched();

    expect(component.form.hasError('passwordMismatch')).toBeTrue();
    expect(component.passwordMismatchErrorVisible).toBeFalse();
    expect(component.confirmNewPasswordErrorVisible).toBeTrue();
  });

  it('keeps an idle changePassword observable without completing the submit', () => {
    changePassword.and.returnValue(new Observable<ChangePasswordResponse>(() => {}));
    fillValidForm();

    component.submit();

    expect(changePassword).toHaveBeenCalled();
    expect(component.submitting()).toBeTrue();
  });
});
