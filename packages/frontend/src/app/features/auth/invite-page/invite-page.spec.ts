import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { UserRole } from '@agua/contracts';
import type { RegisterClientRequest, RegisterClientResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { InvitePage } from './invite-page';

const VALID_VALUES = {
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'cliente@example.com',
  emailConfirmation: 'cliente@example.com',
  password: 'secret123',
  telefono: '1234567890',
  dni: '12345678',
  direccionEntrega: {
    calle: 'Av. Corrientes',
    numero: '1234',
    pisoDepto: '',
    referencia: '',
    barrio: '',
    ciudad: 'Córdoba',
    provincia: '',
    codigoPostal: '',
  },
};

const REGISTER_RESPONSE: RegisterClientResponse = {
  token: 'access-token',
  refreshToken: 'refresh-token',
  clienteId: 'cliente-1',
};

function loginResponse(): {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; role: UserRole };
} {
  return {
    token: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-1', email: 'cliente@example.com', role: UserRole.CLIENTE },
  };
}

describe('InvitePage', () => {
  let registerClient: jasmine.Spy;
  let login: jasmine.Spy;
  let router: Router;
  let page: InvitePage;

  function configure(routeParams: Record<string, string>): Promise<void> {
    return TestBed.configureTestingModule({
      imports: [InvitePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } } },
        { provide: AuthService, useValue: { registerClient, login } },
      ],
    }).compileComponents();
  }

  beforeEach(async () => {
    registerClient = jasmine.createSpy('registerClient');
    login = jasmine.createSpy('login');
    await configure({ token: 'TOKEN-1' });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    page = TestBed.createComponent(InvitePage).componentInstance;
    page.ngOnInit();
  });

  it('reads the token from the route', () => {
    expect(page.token()).toBe('TOKEN-1');
  });

  it('marks a missing token as terminal on submit', () => {
    page.form.setValue(VALID_VALUES);
    page.token.set(null);
    page.submit();

    expect(page.tokenError()).toBe('El enlace de invitación no es válido.');
    expect(registerClient).not.toHaveBeenCalled();
  });

  describe('without a route token', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      registerClient = jasmine.createSpy('registerClient');
      login = jasmine.createSpy('login');
      await configure({});
      page = TestBed.createComponent(InvitePage).componentInstance;
      page.ngOnInit();
    });

    it('shows the terminal state immediately', () => {
      expect(page.tokenError()).toBe('El enlace de invitación no es válido.');
    });
  });

  it('requires every mandatory field', () => {
    page.form.controls.nombre.setValue('');
    page.form.controls.email.setValue('');
    page.form.controls.emailConfirmation.setValue('');
    page.form.controls.password.setValue('');
    page.form.controls.telefono.setValue('');
    page.form.controls.dni.setValue('');
    page.form.controls.direccionEntrega.controls.calle.setValue('');
    page.form.controls.direccionEntrega.controls.numero.setValue('');
    page.form.controls.direccionEntrega.controls.ciudad.setValue('');

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.nombre.hasError('required')).toBeTrue();
    expect(page.form.controls.direccionEntrega.controls.calle.hasError('required')).toBeTrue();
    expect(page.form.controls.direccionEntrega.controls.numero.hasError('required')).toBeTrue();
    expect(page.form.controls.direccionEntrega.controls.ciudad.hasError('required')).toBeTrue();
  });

  it('rejects a dni that is not exactly eight digits', () => {
    page.form.setValue({ ...VALID_VALUES, dni: '1234' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.dni.hasError('pattern')).toBeTrue();
  });

  it('rejects a password shorter than eight characters', () => {
    page.form.setValue({ ...VALID_VALUES, password: 'short' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.password.hasError('minlength')).toBeTrue();
  });

  it('marks the form invalid when the email confirmation differs', () => {
    page.form.setValue({ ...VALID_VALUES, emailConfirmation: 'other@example.com' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.hasError('emailMismatch')).toBeTrue();
  });

  it('accepts an empty optional apellido and address extras', () => {
    page.form.setValue({
      ...VALID_VALUES,
      apellido: '',
      direccionEntrega: {
        ...VALID_VALUES.direccionEntrega,
        pisoDepto: '',
        referencia: '',
        barrio: '',
        provincia: '',
        codigoPostal: '',
      },
    });

    expect(page.form.valid).toBeTrue();
  });

  it('rejects a one-character apellido', () => {
    page.form.setValue({ ...VALID_VALUES, apellido: 'A' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.apellido.hasError('optionalLength')).toBeTrue();
  });

  it('registers, auto-logs-in and navigates to the cliente home', () => {
    registerClient.and.returnValue(of(REGISTER_RESPONSE));
    login.and.returnValue(of(loginResponse()));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(registerClient).toHaveBeenCalledWith({
      token: 'TOKEN-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'cliente@example.com',
      emailConfirmation: 'cliente@example.com',
      password: 'secret123',
      telefono: '1234567890',
      dni: '12345678',
      direccionEntrega: {
        calle: 'Av. Corrientes',
        numero: '1234',
        pisoDepto: undefined,
        referencia: undefined,
        barrio: undefined,
        ciudad: 'Córdoba',
        provincia: undefined,
        codigoPostal: undefined,
      },
    });
    expect(login).toHaveBeenCalledWith({ email: 'cliente@example.com', password: 'secret123' });
    expect(router.navigate).toHaveBeenCalledOnceWith(['/cliente']);
    expect(page.submitting()).toBeFalse();
  });

  it('trims string fields and omits empty optional fields', () => {
    registerClient.and.returnValue(of(REGISTER_RESPONSE));
    login.and.returnValue(of(loginResponse()));

    page.form.setValue({
      ...VALID_VALUES,
      nombre: '  Juan  ',
      apellido: '   ',
      direccionEntrega: { ...VALID_VALUES.direccionEntrega, pisoDepto: '   ', ciudad: '  Córdoba  ' },
    });
    page.submit();

    const body = registerClient.calls.mostRecent().args[0] as RegisterClientRequest;
    expect(body.nombre).toBe('Juan');
    expect(body.apellido).toBeUndefined();
    expect(body.direccionEntrega.ciudad).toBe('Córdoba');
    expect(body.direccionEntrega.pisoDepto).toBeUndefined();
  });

  it('shows a terminal state for an invalid (404) token', () => {
    registerClient.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Token de invitación inválido' },
          }),
      ),
    );

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.tokenError()).toBe('El enlace de invitación no es válido.');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows a terminal state for an expired (400) token', () => {
    registerClient.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'El link de invitación expiró' },
          }),
      ),
    );

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.tokenError()).toBe(
      'El enlace de invitación expiró. Solicita un nuevo enlace a tu proveedor.',
    );
  });

  it('maps a 409 to the email-registered message and stays on the form', () => {
    registerClient.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'El email ya está registrado' },
          }),
      ),
    );

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.errorMessage()).toBe(
      'El correo electrónico ya está registrado. Inicia sesión para continuar.',
    );
    expect(page.tokenError()).toBeNull();
  });

  it('shows the network message when the request cannot reach the server', () => {
    registerClient.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.errorMessage()).toBe(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('shows an error when auto-login fails after a successful registration', () => {
    registerClient.and.returnValue(of(REGISTER_RESPONSE));
    login.and.returnValue(throwError(() => new Error('login boom')));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.errorMessage()).toBe(
      'Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente. Vuelve al inicio de sesión e ingresa con tu correo y contraseña.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
