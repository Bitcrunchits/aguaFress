import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { UserRole } from '@agua/contracts';
import type { DireccionEntrega, RegisterClientRequest } from '@agua/contracts';
import { ROLE_HOME_PATHS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const GENERIC_ERROR =
  'No pudimos completar el registro. Inténtalo de nuevo en unos segundos.';
const EMAIL_REGISTERED_ERROR =
  'El correo electrónico ya está registrado. Inicia sesión para continuar.';
const EMAIL_MISMATCH_ERROR = 'El correo electrónico de confirmación no coincide.';
const INVALID_TOKEN_ERROR = 'El enlace de invitación no es válido.';
const USED_TOKEN_ERROR = 'El enlace de invitación ya fue utilizado.';
const EXPIRED_TOKEN_ERROR =
  'El enlace de invitación expiró. Solicita un nuevo enlace a tu proveedor.';
const AUTO_LOGIN_ERROR =
  'Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente. Vuelve al inicio de sesión e ingresa con tu correo y contraseña.';

/** Group validator: the confirmation must equal the email field. */
function emailsMatch(group: AbstractControl): ValidationErrors | null {
  const email: string = group.get('email')?.value;
  const emailConfirmation: string = group.get('emailConfirmation')?.value;
  return email === emailConfirmation ? null : { emailMismatch: true };
}

/** Rejects values that are empty after trimming surrounding whitespace. */
function nonWhitespace(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim() === '' ? { whitespace: true } : null;
}

/**
 * Optional text: an empty value is valid; a non-empty value must respect the
 * given length bounds. Mirrors the backend's optional `@MinLength`/`@MaxLength`
 * fields, which reject a short value but accept `undefined`.
 */
function optionalLength(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value === '') {
      return null;
    }
    return value.length >= min && value.length <= max ? null : { optionalLength: true };
  };
}

/** Raw value shape of the nested delivery-address group. */
interface DireccionFormValue {
  calle: string;
  numero: string;
  pisoDepto: string;
  referencia: string;
  barrio: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

/**
 * Public client registration from an invitation link. Reads the `:token` from
 * the route, registers via `auth.register-client`, then auto-logs-in with the
 * same credentials and lands the client on their home. A missing/invalid/used
 * or expired token drives a terminal state with no re-submit.
 */
@Component({
  selector: 'app-invite-page',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './invite-page.html',
  styleUrl: './invite-page.scss',
})
export class InvitePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group(
    {
      nombre: ['', [Validators.required, nonWhitespace, Validators.minLength(2)]],
      apellido: ['', [optionalLength(2, 100)]],
      email: ['', [Validators.required, Validators.email]],
      emailConfirmation: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      telefono: ['', [Validators.required, nonWhitespace]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      direccionEntrega: this.formBuilder.nonNullable.group({
        calle: ['', [Validators.required, nonWhitespace]],
        numero: ['', [Validators.required, nonWhitespace]],
        pisoDepto: [''],
        referencia: [''],
        barrio: [''],
        ciudad: ['', [Validators.required, nonWhitespace]],
        provincia: [''],
        codigoPostal: [''],
      }),
    },
    { validators: emailsMatch },
  );

  readonly token = signal<string | null>(null);
  /** Terminal state: the invitation token is missing, invalid, used or expired. */
  readonly tokenError = signal<string | null>(null);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token !== null && token.trim() !== '') {
      this.token.set(token);
    } else {
      this.tokenError.set(INVALID_TOKEN_ERROR);
    }
  }

  get emailHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.email);
  }

  get emailConfirmationMismatchVisible(): boolean {
    const control = this.form.controls.emailConfirmation;
    return this.form.hasError('emailMismatch') && (control.touched || control.dirty);
  }

  get emailConfirmationHintVisible(): boolean {
    return (
      this.isInvalidAndInteracted(this.form.controls.emailConfirmation) ||
      this.emailConfirmationMismatchVisible
    );
  }

  get emailConfirmationHint(): string {
    return this.emailConfirmationMismatchVisible
      ? 'Los correos electrónicos no coinciden.'
      : 'Ingresa un correo electrónico válido.';
  }

  get nombreHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.nombre);
  }

  get apellidoHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.apellido);
  }

  get passwordHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.password);
  }

  get telefonoHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.telefono);
  }

  get dniHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.dni);
  }

  get direccionCalleHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.direccion.controls.calle);
  }

  get direccionNumeroHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.direccion.controls.numero);
  }

  get direccionCiudadHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.direccion.controls.ciudad);
  }

  private get direccion() {
    return this.form.controls.direccionEntrega;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.token();
    if (token === null) {
      this.tokenError.set(INVALID_TOKEN_ERROR);
      return;
    }

    const body = this.buildBody(token);
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.registerClient(body).subscribe({
      next: () => this.autoLogin(body),
      error: (error: unknown) => this.handleRegisterError(error),
    });
  }

  private autoLogin(body: RegisterClientRequest): void {
    this.authService.login({ email: body.email, password: body.password }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate([ROLE_HOME_PATHS[UserRole.CLIENTE]]);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(AUTO_LOGIN_ERROR);
      },
    });
  }

  private buildBody(token: string): RegisterClientRequest {
    const values = this.form.getRawValue();
    return {
      token,
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim() || undefined,
      email: values.email.trim(),
      emailConfirmation: values.emailConfirmation.trim(),
      // `password` is sent verbatim (matching `login`); trimming would silently
      // change what the user typed.
      password: values.password,
      telefono: values.telefono.trim(),
      dni: values.dni.trim(),
      direccionEntrega: this.buildDireccion(values.direccionEntrega),
    };
  }

  private buildDireccion(values: DireccionFormValue): DireccionEntrega {
    return {
      calle: values.calle.trim(),
      numero: values.numero.trim(),
      pisoDepto: values.pisoDepto.trim() || undefined,
      referencia: values.referencia.trim() || undefined,
      barrio: values.barrio.trim() || undefined,
      ciudad: values.ciudad.trim(),
      provincia: values.provincia.trim() || undefined,
      codigoPostal: values.codigoPostal.trim() || undefined,
    };
  }

  private handleRegisterError(error: unknown): void {
    this.submitting.set(false);
    if (!(error instanceof HttpErrorResponse)) {
      this.errorMessage.set(GENERIC_ERROR);
      return;
    }
    if (error.status === 0) {
      this.errorMessage.set(NETWORK_ERROR);
      return;
    }

    const message = readServerMessage(error);
    if (error.status === 404) {
      this.tokenError.set(INVALID_TOKEN_ERROR);
      return;
    }
    if (error.status === 409) {
      this.errorMessage.set(EMAIL_REGISTERED_ERROR);
      return;
    }
    if (error.status === 400) {
      if (/expir/i.test(message)) {
        this.tokenError.set(EXPIRED_TOKEN_ERROR);
        return;
      }
      if (/ya fue utilizado|already used/i.test(message)) {
        this.tokenError.set(USED_TOKEN_ERROR);
        return;
      }
      if (/no coincide|does not match/i.test(message)) {
        this.errorMessage.set(EMAIL_MISMATCH_ERROR);
        return;
      }
    }
    this.errorMessage.set(GENERIC_ERROR);
  }

  private isInvalidAndInteracted(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}

function readServerMessage(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message: unknown = (body as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
