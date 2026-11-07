import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { RegisterRequest, RegisterResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegisterPage } from './register-page';

const REGISTER_RESPONSE: RegisterResponse = {
  status: 'pendiente',
  vendedorId: 'vendedor-1',
  message: 'Solicitud recibida',
};

const VALID_VALUES = {
  email: 'vendor@example.com',
  emailConfirmation: 'vendor@example.com',
  password: 'secret123',
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  telefono: '1234567890',
  ciudad: 'Córdoba',
  empresa: 'Agua SA',
};

describe('RegisterPage', () => {
  let register: jasmine.Spy<(body: RegisterRequest) => Observable<RegisterResponse>>;
  let router: Router;
  let page: RegisterPage;

  beforeEach(async () => {
    register = jasmine.createSpy('register');
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    page = TestBed.createComponent(RegisterPage).componentInstance;
  });

  it('requires every mandatory field', () => {
    page.form.controls.email.setValue('');
    page.form.controls.emailConfirmation.setValue('');
    page.form.controls.password.setValue('');
    page.form.controls.nombre.setValue('');
    page.form.controls.apellido.setValue('');
    page.form.controls.dni.setValue('');
    page.form.controls.telefono.setValue('');
    page.form.controls.ciudad.setValue('');

    expect(page.form.invalid).toBeTrue();
    for (const field of [
      'email',
      'emailConfirmation',
      'password',
      'nombre',
      'apellido',
      'dni',
      'telefono',
      'ciudad',
    ] as const) {
      expect(page.form.controls[field].hasError('required')).toBeTrue();
    }
  });

  it('marks the form invalid when the email confirmation differs from the email', () => {
    page.form.setValue({ ...VALID_VALUES, emailConfirmation: 'other@example.com' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.hasError('emailMismatch')).toBeTrue();
  });

  it('rejects a dni that is not exactly eight digits', () => {
    page.form.setValue({ ...VALID_VALUES, dni: '1234' });

    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.dni.hasError('pattern')).toBeTrue();
  });

  it('accepts an empty optional empresa', () => {
    page.form.setValue({ ...VALID_VALUES, empresa: '' });

    expect(page.form.valid).toBeTrue();
  });

  it('submits the trimmed body, shows the success state, and does not navigate', () => {
    register.and.returnValue(of(REGISTER_RESPONSE));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(register).toHaveBeenCalledWith({
      email: 'vendor@example.com',
      emailConfirmation: 'vendor@example.com',
      password: 'secret123',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      telefono: '1234567890',
      ciudad: 'Córdoba',
      empresa: 'Agua SA',
    });
    expect(page.registered()).toBeTrue();
    expect(page.submitting()).toBeFalse();
    expect(page.errorMessage()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('trims string fields and omits an empty empresa from the request', () => {
    register.and.returnValue(of(REGISTER_RESPONSE));

    page.form.setValue({ ...VALID_VALUES, nombre: '  Juan  ', empresa: '   ' });
    page.submit();

    expect(register).toHaveBeenCalledWith(
      jasmine.objectContaining({ nombre: 'Juan', empresa: undefined }),
    );
  });

  it('shows the network message when the request cannot reach the server', () => {
    register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.errorMessage()).toBe(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(page.registered()).toBeFalse();
    expect(page.submitting()).toBeFalse();
  });

  it('shows the generic message for any other server error', () => {
    register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    page.form.setValue(VALID_VALUES);
    page.submit();

    expect(page.errorMessage()).toBe(
      'No pudimos completar el registro. Inténtalo de nuevo en unos segundos.',
    );
    expect(page.registered()).toBeFalse();
    expect(page.submitting()).toBeFalse();
  });
});
