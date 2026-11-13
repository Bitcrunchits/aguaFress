import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { VendedorProfileV2DTO } from '@agua/contracts';
import { ChangePasswordFormComponent } from '../../../shared/change-password-form/change-password-form';
import {
  VendedorProfileService,
  type UpdateVendedorProfileRequest,
} from '../vendedor-profile.service';

/** Omit empty optional strings so partial updates never send blank values. */
function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Vendedor profile: read-only summary (datos + negocio + logo) with an edit
 * toggle, plus the shared change-password form. The logo is uploaded through
 * its own multipart action and only its returned `/uploads/...` URL is stored
 * on the form; `estado`, `qrCode` and `qr_token` are backend-controlled and
 * are never sent in the update payload.
 */
@Component({
  selector: 'app-vendedor-profile-page',
  imports: [ReactiveFormsModule, ChangePasswordFormComponent],
  templateUrl: './vendedor-profile-page.html',
  styleUrl: './vendedor-profile-page.scss',
})
export class VendedorProfilePage implements OnInit {
  private readonly profileService = inject(VendedorProfileService);
  private readonly formBuilder = inject(FormBuilder);

  readonly profile = signal<VendedorProfileV2DTO | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);

  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly logoUrl = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    nombre: [''],
    apellido: [''],
    dni: [''],
    cuil: [''],
    cuit: [''],
    telefono: [''],
    empresa: [''],
    ciudadDefault: [''],
    zonaEntrega: [''],
    logo: [''],
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
        this.logoUrl.set(profile.logo ?? null);
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
    this.uploadError.set(null);
    this.form.setValue({
      nombre: profile.nombre ?? '',
      apellido: profile.apellido ?? '',
      dni: profile.dni ?? '',
      cuil: profile.cuil ?? '',
      cuit: profile.cuit ?? '',
      telefono: profile.telefono ?? '',
      empresa: profile.empresa ?? '',
      ciudadDefault: profile.ciudadDefault ?? '',
      zonaEntrega: profile.zonaEntrega ?? '',
      logo: profile.logo ?? '',
    });
    this.logoUrl.set(profile.logo ?? null);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.uploadError.set(null);
    this.logoUrl.set(this.profile()?.logo ?? null);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }
    // Allow re-selecting the same file after a successful upload.
    input.value = '';

    this.uploading.set(true);
    this.uploadError.set(null);

    this.profileService.uploadLogo(file).subscribe({
      next: (url) => {
        this.form.controls.logo.setValue(url);
        this.logoUrl.set(url);
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set(
          'No pudimos subir el logo. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.profileService.updateProfile(this.buildUpdatePayload()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.logoUrl.set(profile.logo ?? null);
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

  private buildUpdatePayload(): UpdateVendedorProfileRequest {
    const value = this.form.getRawValue();
    return {
      nombre: trimmedOrUndefined(value.nombre),
      apellido: trimmedOrUndefined(value.apellido),
      dni: trimmedOrUndefined(value.dni),
      cuil: trimmedOrUndefined(value.cuil),
      cuit: trimmedOrUndefined(value.cuit),
      telefono: trimmedOrUndefined(value.telefono),
      empresa: trimmedOrUndefined(value.empresa),
      ciudadDefault: trimmedOrUndefined(value.ciudadDefault),
      zonaEntrega: trimmedOrUndefined(value.zonaEntrega),
      logo: trimmedOrUndefined(value.logo),
    };
  }
}
