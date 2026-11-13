import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import type { LinkInvitacionItem } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { formatIsoDate } from '../../../shared/order-format';
import { buildInviteUrl } from '../invite-link';
import { QrCodeService } from '../qr-code.service';
import { VendedorInvitacionesService } from '../vendedor-invitaciones.service';

/**
 * Presentational state derived from a `LinkInvitacionItem`'s `activo` flag and
 * `expiresAt`. Typed as an enum (not a string literal) per the project's
 * "no string para estados" rule; the backend does not expose this derived
 * state, so it lives in the feature rather than in `@agua/contracts`.
 */
export enum InvitacionEstado {
  ACTIVO = 'activo',
  EXPIRADO = 'expirado',
  DESACTIVADO = 'desactivado',
}

/** The freshly created invite shown in the share panel. */
interface CreatedInvite {
  url: string;
  token: string;
  expiresAt: string;
  /** PNG data URL; empty when the QR render failed (the URL still copies). */
  qrDataUrl: string;
}

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const GENERIC_ERROR = 'No pudimos completar la operación. Inténtalo de nuevo en unos segundos.';

/**
 * Vendedor invitation links. One invitation = one link with two ways to share:
 * a scannable QR (rendered client-side from the app URL) and a copyable URL.
 * The backend `qr.*` actions are broken, so the link is the single source of
 * truth and the "QR" is purely a visual render of its URL.
 */
@Component({
  selector: 'app-vendedor-invitaciones-page',
  imports: [ButtonModule],
  templateUrl: './vendedor-invitaciones-page.html',
  styleUrl: './vendedor-invitaciones-page.scss',
})
export class VendedorInvitacionesPage implements OnInit {
  private readonly service = inject(VendedorInvitacionesService);
  private readonly qrCode = inject(QrCodeService);

  readonly items = signal<LinkInvitacionItem[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createdInvite = signal<CreatedInvite | null>(null);

  readonly deactivatingId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly copied = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.service.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load();
  }

  createInvitation(): void {
    if (this.creating()) {
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.createdInvite.set(null);
    this.actionError.set(null);

    this.service.create().subscribe({
      next: (response) => {
        const url = buildInviteUrl(response.token, location.origin);
        this.qrCode.toDataUrl(url).subscribe({
          next: (qrDataUrl) => {
            this.createdInvite.set({
              url,
              token: response.token,
              expiresAt: response.expiresAt,
              qrDataUrl,
            });
            this.creating.set(false);
            this.load();
          },
          error: () => {
            // QR render failure degrades to the copyable URL only.
            this.createdInvite.set({
              url,
              token: response.token,
              expiresAt: response.expiresAt,
              qrDataUrl: '',
            });
            this.creating.set(false);
            this.load();
          },
        });
      },
      error: (error: unknown) => {
        this.creating.set(false);
        this.createError.set(
          error instanceof HttpErrorResponse && error.status === 0 ? NETWORK_ERROR : GENERIC_ERROR,
        );
      },
    });
  }

  deactivate(item: LinkInvitacionItem): void {
    if (!this.canDeactivate(item) || this.deactivatingId() !== null) {
      return;
    }
    this.deactivatingId.set(item.id);
    this.actionError.set(null);

    this.service.deactivate(item.id).subscribe({
      next: () => {
        this.deactivatingId.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.deactivatingId.set(null);
        this.actionError.set(
          error instanceof HttpErrorResponse && error.status === 0 ? NETWORK_ERROR : GENERIC_ERROR,
        );
      },
    });
  }

  copyLink(url: string): void {
    if (typeof navigator.clipboard?.writeText === 'function') {
      navigator.clipboard
        .writeText(url)
        .then(() => this.markCopied())
        .catch(() => this.copyFallback(url));
    } else {
      this.copyFallback(url);
    }
  }

  estadoDe(item: LinkInvitacionItem): InvitacionEstado {
    if (!item.activo) {
      return InvitacionEstado.DESACTIVADO;
    }
    return this.isExpired(item) ? InvitacionEstado.EXPIRADO : InvitacionEstado.ACTIVO;
  }

  /** CSS class suffix for the badge, derived from the enum value. */
  estadoClass(item: LinkInvitacionItem): string {
    return `invitaciones__badge--${this.estadoDe(item)}`;
  }

  estadoLabel(item: LinkInvitacionItem): string {
    switch (this.estadoDe(item)) {
      case InvitacionEstado.ACTIVO:
        return 'Activo';
      case InvitacionEstado.EXPIRADO:
        return 'Expirado';
      case InvitacionEstado.DESACTIVADO:
        return 'Desactivado';
    }
  }

  canDeactivate(item: LinkInvitacionItem): boolean {
    return this.estadoDe(item) === InvitacionEstado.ACTIVO;
  }

  formatFecha(iso: string): string {
    return formatIsoDate(iso);
  }

  private isExpired(item: LinkInvitacionItem): boolean {
    const expiry = Date.parse(item.expiresAt);
    return !Number.isNaN(expiry) && expiry < Date.now();
  }

  private markCopied(): void {
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 2000);
  }

  private copyFallback(url: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.markCopied();
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
