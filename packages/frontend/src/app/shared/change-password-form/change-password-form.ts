import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LOGIN_PATH } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

/** Cross-field check: the confirmation must equal the new password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword: unknown = group.get('newPassword')?.value;
  const confirmNewPassword: unknown = group.get('confirmNewPassword')?.value;
  return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
}

/**
 * Reusable change-password form shared by every role profile page. The
 * gateway derives the acting `userId` from the JWT, so no identity field is
 * collected or sent. On success the backend invalidates refresh tokens, so
 * the only safe next action is closing the session and returning to login.
 */
@Component({
  selector: 'app-change-password-form',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './change-password-form.html',
  styleUrl: './change-password-form.scss',
})
export class ChangePasswordFormComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  get currentPasswordErrorVisible(): boolean {
    return this.fieldInvalid('currentPassword');
  }

  get newPasswordErrorVisible(): boolean {
    return this.fieldInvalid('newPassword');
  }

  get confirmNewPasswordErrorVisible(): boolean {
    return this.fieldInvalid('confirmNewPassword');
  }

  get passwordMismatchErrorVisible(): boolean {
    const confirm = this.form.controls.confirmNewPassword;
    if (confirm.value === '') {
      return false;
    }
    return this.form.hasError('passwordMismatch') && (confirm.touched || confirm.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Contraseña actualizada correctamente.');
        this.form.reset();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.mapError(error));
      },
    });
  }

  closeSession(): void {
    this.authService.logout();
    void this.router.navigate([LOGIN_PATH]);
  }

  private fieldInvalid(
    controlName: 'currentPassword' | 'newPassword' | 'confirmNewPassword',
  ): boolean {
    const control = this.form.get(controlName);
    return control !== null && control.invalid && (control.touched || control.dirty);
  }

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Contraseña actual incorrecta.';
    }
    return 'No pudimos cambiar la contraseña. Inténtalo de nuevo en unos segundos.';
  }
}
