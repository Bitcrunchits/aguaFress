import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ChangePasswordResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminSecurityPage } from './admin-security-page';

describe('AdminSecurityPage', () => {
  let changePassword: jasmine.Spy;
  let logout: jasmine.Spy;
  let router: Router;
  let page: AdminSecurityPage;

  beforeEach(async () => {
    changePassword = jasmine.createSpy('changePassword');
    logout = jasmine.createSpy('logout');
    await TestBed.configureTestingModule({
      imports: [AdminSecurityPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { changePassword, logout } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    page = TestBed.createComponent(AdminSecurityPage).componentInstance;
  });

  function fillValidForm(): void {
    page.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: 'newsecret',
    });
  }

  it('marks every field touched and never submits when the form is invalid', () => {
    page.submit();

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.currentPassword.touched).toBeTrue();
    expect(page.form.controls.newPassword.touched).toBeTrue();
    expect(page.form.controls.confirmNewPassword.touched).toBeTrue();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 6 characters', () => {
    page.form.setValue({
      currentPassword: 'secret',
      newPassword: 'short',
      confirmNewPassword: 'short',
    });

    expect(page.form.controls.newPassword.hasError('minlength')).toBeTrue();
    expect(page.form.invalid).toBeTrue();
  });

  it('flags a mismatch when the confirmation differs from the new password', () => {
    page.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: 'different',
    });
    page.form.controls.confirmNewPassword.markAsTouched();

    expect(page.form.hasError('passwordMismatch')).toBeTrue();
    expect(page.passwordMismatchErrorVisible).toBeTrue();
  });

  it('calls changePassword with the passwords and shows the success state', () => {
    const response: ChangePasswordResponse = { message: 'Contraseña actualizada' };
    changePassword.and.returnValue(of(response));
    fillValidForm();

    page.submit();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
    });
    expect(page.successMessage()).toContain('Contraseña actualizada');
    expect(page.errorMessage()).toBeNull();
    expect(page.submitting()).toBeFalse();
    expect(page.form.getRawValue()).toEqual({
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

    page.submit();

    expect(page.errorMessage()).toBe('Contraseña actual incorrecta.');
    expect(page.successMessage()).toBeNull();
    expect(page.submitting()).toBeFalse();
  });

  it('maps an unexpected failure to a generic inline error', () => {
    changePassword.and.returnValue(throwError(() => new Error('server detail')));
    fillValidForm();

    page.submit();

    expect(page.errorMessage()).toBe(
      'No pudimos cambiar la contraseña. Inténtalo de nuevo en unos segundos.',
    );
  });

  it('logs out and navigates to the login route when the session is closed', () => {
    page.closeSession();

    expect(logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not emit a mismatch when the confirmation is empty', () => {
    page.form.setValue({
      currentPassword: 'oldsecret',
      newPassword: 'newsecret',
      confirmNewPassword: '',
    });
    page.form.controls.confirmNewPassword.markAsTouched();

    expect(page.form.hasError('passwordMismatch')).toBeTrue();
    expect(page.passwordMismatchErrorVisible).toBeFalse();
    expect(page.confirmNewPasswordErrorVisible).toBeTrue();
  });

  it('keeps an idle changePassword observable without completing the submit', () => {
    changePassword.and.returnValue(new Observable<ChangePasswordResponse>(() => {}));
    fillValidForm();

    page.submit();

    expect(changePassword).toHaveBeenCalled();
    expect(page.submitting()).toBeTrue();
  });
});
