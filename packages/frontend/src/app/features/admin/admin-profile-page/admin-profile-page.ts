import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserRole } from '@agua/contracts';
import type { SuperAdminProfileResponse } from '@agua/contracts';
import { ChangePasswordFormComponent } from '../../../shared/change-password-form/change-password-form';
import { AdminProfileService } from '../admin-profile.service';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super administrador',
  [UserRole.VENDEDOR]: 'Vendedor',
  [UserRole.CLIENTE]: 'Cliente',
};

/**
 * Super-admin profile: read-only identity summary (email/role) with an
 * editable name pair, plus the shared change-password form. Editing is a
 * plain read-only → edit toggle driven by the `editing` signal; the form is
 * populated from the loaded profile on `startEditing()` and the update only
 * ever sends `nombre`/`apellido` (the backend resolves identity from the JWT).
 */
@Component({
  selector: 'app-admin-profile-page',
  imports: [ReactiveFormsModule, ChangePasswordFormComponent],
  templateUrl: './admin-profile-page.html',
  styleUrl: './admin-profile-page.scss',
})
export class AdminProfilePage implements OnInit {
  private readonly profileService = inject(AdminProfileService);
  private readonly formBuilder = inject(FormBuilder);

  readonly profile = signal<SuperAdminProfileResponse | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        if (profile === null || profile === undefined) {
          this.failed.set(true);
          this.loading.set(false);
          return;
        }
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
      complete: () => {
        if (this.profile() === null) {
          this.failed.set(true);
        }
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.loadProfile();
  }

  startEditing(): void {
    const profile = this.profile();
    if (profile === null) {
      return;
    }
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.form.setValue({ nombre: profile.nombre, apellido: profile.apellido });
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.profileService.updateProfile(this.form.getRawValue()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.saving.set(false);
        this.editing.set(false);
        this.saveSuccess.set('Perfil actualizado correctamente.');
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(
          'No pudimos actualizar el perfil. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }
}
