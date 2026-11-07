import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendedorEstado } from '@agua/contracts';
import type { VendedorProfile } from '@agua/contracts';
import { VendedorProfileService } from '../vendedor-profile.service';

const ESTADO_LABELS: Record<VendedorEstado, string> = {
  [VendedorEstado.PENDIENTE]: 'Pendiente',
  [VendedorEstado.ACTIVO]: 'Activo',
  [VendedorEstado.INACTIVO]: 'Inactivo',
  [VendedorEstado.BLOQUEADO]: 'Bloqueado',
};

/**
 * Vendedor operational home. Loads the authenticated vendedor profile (from
 * the JWT, resolved server-side) and renders a profile card with quick access
 * to the product catalog. Loading and error states mirror the cliente-page.
 */
@Component({
  selector: 'app-vendedor-page',
  imports: [RouterLink],
  templateUrl: './vendedor-page.html',
  styleUrl: './vendedor-page.scss',
})
export class VendedorPage implements OnInit {
  private readonly profileService = inject(VendedorProfileService);

  readonly profile = signal<VendedorProfile | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

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

  empresaLabel(profile: VendedorProfile): string {
    return profile.empresa || this.nombreCompleto(profile);
  }

  nombreCompleto(profile: VendedorProfile): string {
    return [profile.nombre, profile.apellido].filter(Boolean).join(' ');
  }

  estadoLabel(estado: VendedorEstado): string {
    return ESTADO_LABELS[estado];
  }
}
