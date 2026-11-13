import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TipoFactura } from '@agua/contracts';
import type {
  ClienteProfile,
  UpdateProfileV2Request,
  UserProfile,
  VendedorProfile,
} from '@agua/contracts';
import { ChangePasswordFormComponent } from '../../../shared/change-password-form/change-password-form';
import { ClienteProfileService } from '../cliente-profile.service';

const TIPO_FACTURA_LABELS: Record<TipoFactura, string> = {
  [TipoFactura.A]: 'Factura A',
  [TipoFactura.B]: 'Factura B',
  [TipoFactura.C]: 'Factura C',
};

/** VendedorProfile has a required `estado`; ClienteProfile does not. */
function isClienteProfile(profile: VendedorProfile | ClienteProfile): profile is ClienteProfile {
  return !('estado' in profile);
}

/** Omit empty optional strings so partial updates never send blank values. */
function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Cliente profile: read-only summary (datos + dirección de entrega) with an
 * edit toggle, plus the shared change-password form. The read model nests the
 * cliente data under `profile.direccionEntrega`, but the update payload sends
 * a flat camelCase `address` — the two shapes are mapped explicitly here.
 */
@Component({
  selector: 'app-cliente-profile-page',
  imports: [ReactiveFormsModule, ChangePasswordFormComponent],
  templateUrl: './cliente-profile-page.html',
  styleUrl: './cliente-profile-page.scss',
})
export class ClienteProfilePage implements OnInit {
  private readonly profileService = inject(ClienteProfileService);
  private readonly formBuilder = inject(FormBuilder);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);

  readonly tipoFacturaOptions = [
    { value: TipoFactura.A, label: TIPO_FACTURA_LABELS[TipoFactura.A] },
    { value: TipoFactura.B, label: TIPO_FACTURA_LABELS[TipoFactura.B] },
    { value: TipoFactura.C, label: TIPO_FACTURA_LABELS[TipoFactura.C] },
  ];

  readonly form = this.formBuilder.nonNullable.group({
    nombre: [''],
    apellido: [''],
    telefono: [''],
    tipoFactura: [TipoFactura.B],
    address: this.formBuilder.nonNullable.group({
      calle: [''],
      numero: [''],
      pisoDepto: [''],
      referencia: [''],
      barrio: [''],
      ciudad: [''],
      provincia: [''],
      codigoPostal: [''],
    }),
  });

  readonly datos = computed(() => {
    const profile = this.profile();
    if (profile === null) {
      return null;
    }
    const nested = profile.profile;
    const clienteProfile = nested !== undefined && isClienteProfile(nested) ? nested : null;
    return {
      nombre: clienteProfile?.nombre ?? profile.nombre ?? '',
      apellido: clienteProfile?.apellido ?? profile.apellido ?? '',
      telefono: clienteProfile?.telefono ?? profile.telefono ?? '',
      tipoFactura: clienteProfile?.tipoFactura ?? TipoFactura.B,
    };
  });

  readonly direccion = computed(() => {
    const profile = this.profile();
    if (profile === null) {
      return null;
    }
    const nested = profile.profile;
    if (nested === undefined || !isClienteProfile(nested)) {
      return null;
    }
    return nested.direccionEntrega ?? null;
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
    const datos = this.datos();
    const direccion = this.direccion();
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.form.setValue({
      nombre: datos?.nombre ?? '',
      apellido: datos?.apellido ?? '',
      telefono: datos?.telefono ?? '',
      tipoFactura: datos?.tipoFactura ?? TipoFactura.B,
      address: {
        calle: direccion?.calle ?? '',
        numero: direccion?.numero ?? '',
        pisoDepto: direccion?.pisoDepto ?? '',
        referencia: direccion?.referencia ?? '',
        barrio: direccion?.barrio ?? '',
        ciudad: direccion?.ciudad ?? '',
        provincia: direccion?.provincia ?? '',
        codigoPostal: direccion?.codigoPostal ?? '',
      },
    });
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.profileService.updateProfile(this.buildUpdatePayload()).subscribe({
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

  tipoFacturaLabel(tipoFactura: TipoFactura): string {
    return TIPO_FACTURA_LABELS[tipoFactura];
  }

  private buildUpdatePayload(): UpdateProfileV2Request {
    const value = this.form.getRawValue();
    const address = value.address;
    return {
      nombre: trimmedOrUndefined(value.nombre),
      apellido: trimmedOrUndefined(value.apellido),
      telefono: trimmedOrUndefined(value.telefono),
      tipoFactura: value.tipoFactura,
      address: {
        calle: trimmedOrUndefined(address.calle),
        numero: trimmedOrUndefined(address.numero),
        pisoDepto: trimmedOrUndefined(address.pisoDepto),
        referencia: trimmedOrUndefined(address.referencia),
        barrio: trimmedOrUndefined(address.barrio),
        ciudad: trimmedOrUndefined(address.ciudad),
        provincia: trimmedOrUndefined(address.provincia),
        codigoPostal: trimmedOrUndefined(address.codigoPostal),
      },
    };
  }
}
