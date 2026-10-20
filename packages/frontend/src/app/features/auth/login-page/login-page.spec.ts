import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRole, type LoginResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { LoginPage } from './login-page';

const SESSION: LoginResponse = {
  token: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 'user-1', email: 'user@example.com', role: UserRole.CLIENTE },
};

describe('LoginPage', () => {
  let login: jasmine.Spy<(credentials: { email: string; password: string }) => Observable<LoginResponse>>;
  let router: Router;
  let page: LoginPage;

  beforeEach(async () => {
    login = jasmine.createSpy('login');
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    page = TestBed.createComponent(LoginPage).componentInstance;
    page.form.setValue({ email: 'user@example.com', password: 'secret' });
  });

  for (const [role, path] of [
    [UserRole.SUPER_ADMIN, '/admin'],
    [UserRole.VENDEDOR, '/vendedor'],
    [UserRole.CLIENTE, '/cliente'],
  ] as const) {
    it(`navigates a signed-in ${role} to ${path}`, () => {
      login.and.returnValue(of({ ...SESSION, user: { ...SESSION.user, role } }));

      page.submit();

      expect(login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
      expect(router.navigate).toHaveBeenCalledWith([path]);
      expect(page.submitting()).toBeFalse();
      expect(page.errorMessage()).toBeNull();
    });
  }

  for (const [code, message] of [
    ['invalid-credentials', 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.'],
    ['inactive-account', 'Esta cuenta está inactiva. Contacta a administración para recuperar el acceso.'],
    ['network', 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'],
    ['unexpected', 'No pudimos iniciar sesión. Inténtalo de nuevo en unos segundos.'],
  ] as const) {
    it(`shows the ${code} presentation message`, () => {
      login.and.returnValue(throwError(() => new AuthError(code)));

      page.submit();

      expect(page.errorMessage()).toBe(message);
      expect(page.submitting()).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  }

  it('shows the generic message for an unrecognized error', () => {
    login.and.returnValue(throwError(() => new Error('server detail')));

    page.submit();

    expect(page.errorMessage()).toBe('No pudimos iniciar sesión. Inténtalo de nuevo en unos segundos.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
