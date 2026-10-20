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
    ['invalid-credentials', 'The email or password is incorrect. Check your details and try again.'],
    ['inactive-account', 'This account is inactive. Contact the administrator to regain access.'],
    ['network', 'We could not reach the server. Check your connection and try again.'],
    ['unexpected', 'Something went wrong. Try again in a few seconds.'],
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

    expect(page.errorMessage()).toBe('Something went wrong. Try again in a few seconds.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
