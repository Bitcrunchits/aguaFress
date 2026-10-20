import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ROLE_HOME_PATHS } from '../../../core/auth/auth.models';
import { AuthError, AuthService, type AuthErrorCode } from '../../../core/auth/auth.service';

const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'The email or password is incorrect. Check your details and try again.',
  'inactive-account': 'This account is inactive. Contact the administrator to regain access.',
  network: 'We could not reach the server. Check your connection and try again.',
  unexpected: 'Something went wrong. Try again in a few seconds.',
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get emailErrorVisible(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  get passwordErrorVisible(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: (session) => {
        this.submitting.set(false);
        this.router.navigate([ROLE_HOME_PATHS[session.user.role]]);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          AUTH_MESSAGES[error instanceof AuthError ? error.code : 'unexpected'],
        );
      },
    });
  }
}
