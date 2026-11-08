import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { VendedorEstado, type VendedorProfile } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { VendedorPerfilService } from '../vendedor-perfil.service';

interface EstadoOperativo {
  readonly label: string;
  readonly descripcion: string;
}

/** Spanish copy for every `VendedorEstado` value, keyed by the contract enum. */
const ESTADOS_OPERATIVOS: Record<VendedorEstado, EstadoOperativo> = {
  [VendedorEstado.ACTIVO]: {
    label: 'Activo',
    descripcion: 'Tu cuenta está habilitada. Ya puedes gestionar tu catálogo y recibir pedidos.',
  },
  [VendedorEstado.PENDIENTE]: {
    label: 'Pendiente de aprobación',
    descripcion:
      'Un administrador debe habilitar tu cuenta. Hasta entonces no podrás crear ni editar productos.',
  },
  [VendedorEstado.INACTIVO]: {
    label: 'Inactivo',
    descripcion: 'Tu cuenta está inactiva. Contacta a la administración para reactivarla.',
  },
  [VendedorEstado.BLOQUEADO]: {
    label: 'Bloqueado',
    descripcion: 'Tu cuenta está bloqueada. Contacta a la administración.',
  },
};

const ERROR_MESSAGES = {
  forbidden:
    'Tu cuenta de vendedor está inactiva o bloqueada. Contacta a la administración para habilitarla.',
  notFound: 'No encontramos tu perfil de vendedor. Contacta a la administración.',
  network: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  unexpected: 'No pudimos cargar tu información. Inténtalo de nuevo en unos segundos.',
} as const;

function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return ERROR_MESSAGES.unexpected;
  }
  switch (error.status) {
    case 403:
      return ERROR_MESSAGES.forbidden;
    case 404:
      return ERROR_MESSAGES.notFound;
    case 0:
      return ERROR_MESSAGES.network;
    default:
      return ERROR_MESSAGES.unexpected;
  }
}

/**
 * Vendedor operational home for `/vendedor`. Loads the authenticated
 * vendedor with `vendedores.profile` and shows its operational status plus
 * the entry point to the products catalog. Metrics are intentionally out of
 * scope until a dashboard contract is confirmed (no `/vendedor/dashboard`).
 */
@Component({
  selector: 'app-vendedor-page',
  imports: [ButtonModule, RouterLink],
  templateUrl: './vendedor-page.html',
  styleUrl: './vendedor-page.scss',
})
export class VendedorPage implements OnInit {
  private readonly perfilService = inject(VendedorPerfilService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<VendedorProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.perfilService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.profile.set(null);
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  nombreCompleto(profile: VendedorProfile): string {
    const partes = [profile.nombre, profile.apellido].filter(
      (parte): parte is string => typeof parte === 'string' && parte.trim().length > 0,
    );
    return partes.length > 0 ? partes.join(' ') : 'vendedor';
  }

  estadoOperativo(estado: VendedorEstado): EstadoOperativo {
    return (
      ESTADOS_OPERATIVOS[estado] ?? {
        label: 'Sin estado',
        descripcion: 'No pudimos determinar el estado de tu cuenta.',
      }
    );
  }

  puedeOperar(estado: VendedorEstado): boolean {
    return estado === VendedorEstado.ACTIVO;
  }
}
