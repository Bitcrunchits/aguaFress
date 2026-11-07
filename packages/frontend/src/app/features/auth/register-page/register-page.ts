import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import type { RegisterRequest } from '@agua/contracts';
import { AuthService } from '../../../core/auth/auth.service';

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const GENERIC_ERROR =
  'No pudimos completar el registro. Inténtalo de nuevo en unos segundos.';

/** Group validator: the confirmation must equal the email field. */
function emailsMatch(group: AbstractControl): ValidationErrors | null {
  const email: string = group.get('email')?.value;
  const emailConfirmation: string = group.get('emailConfirmation')?.value;
  return email === emailConfirmation ? null : { emailMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      emailConfirmation: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: ['', [Validators.required]],
      ciudad: ['', [Validators.required, Validators.minLength(2)]],
      empresa: ['', [Validators.maxLength(255)]],
    },
    { validators: emailsMatch },
  );

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly registered = signal(false);

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

  get passwordHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.password);
  }

  get nombreHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.nombre);
  }

  get apellidoHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.apellido);
  }

  get dniHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.dni);
  }

  get telefonoHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.telefono);
  }

  get ciudadHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.ciudad);
  }

  get empresaHintVisible(): boolean {
    return this.isInvalidAndInteracted(this.form.controls.empresa);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    const body: RegisterRequest = {
      email: values.email.trim(),
      emailConfirmation: values.emailConfirmation.trim(),
      // `password` is sent verbatim (matching `login`); trimming it would
      // silently change what the user typed.
      password: values.password,
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      dni: values.dni.trim(),
      telefono: values.telefono.trim(),
      ciudad: values.ciudad.trim(),
      empresa: values.empresa.trim() || undefined,
    };

    this.authService.register(body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registered.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 0
            ? NETWORK_ERROR
            : GENERIC_ERROR,
        );
      },
    });
  }

  private isInvalidAndInteracted(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }
}
