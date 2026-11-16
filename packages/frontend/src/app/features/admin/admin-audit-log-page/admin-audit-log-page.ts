import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuditAction } from '@agua/contracts';
import type { AuditLogEntry, AuditLogListFilters, PaginationResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { AdminAuditLogService } from '../admin-audit-log.service';

const PAGE_SIZE = 20;

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.USER_REGISTERED]: 'Registro de usuario',
  [AuditAction.USER_LOGIN]: 'Inicio de sesión',
  [AuditAction.VENDEDOR_UPDATED]: 'Vendedor actualizado',
  [AuditAction.VENDEDOR_STATUS_CHANGED]: 'Estado de vendedor cambiado',
  [AuditAction.CLIENTE_UPDATED]: 'Cliente actualizado',
  [AuditAction.CLIENTE_REASSIGNED]: 'Cliente reasignado',
  [AuditAction.QR_CREATED]: 'QR creado',
  [AuditAction.QR_DEACTIVATED]: 'QR desactivado',
  [AuditAction.LINK_CREATED]: 'Enlace creado',
  [AuditAction.LINK_DEACTIVATED]: 'Enlace desactivado',
  [AuditAction.CLIENTE_REGISTERED]: 'Cliente registrado',
  [AuditAction.CLIENTE_CREATED_BY_VENDOR]: 'Cliente creado por vendedor',
  [AuditAction.SUPER_ADMIN_UPDATED]: 'Super administrador actualizado',
  [AuditAction.PROFILE_UPDATED]: 'Perfil actualizado',
  [AuditAction.PASSWORD_CHANGED]: 'Contraseña cambiada',
  [AuditAction.PASSWORD_RESET_INITIATED]: 'Restablecimiento de contraseña iniciado',
  [AuditAction.PASSWORD_RESET_COMPLETED]: 'Restablecimiento de contraseña completado',
};

/**
 * Maps an audit action to its Spanish label. Falls back to the raw value when
 * the backend returns an action not yet present in the `AuditAction` enum.
 */
function auditActionLabel(accion: AuditAction): string {
  return AUDIT_ACTION_LABELS[accion] ?? accion;
}

interface AccionOption {
  value: AuditAction | null;
  label: string;
}

/**
 * Super-admin audit log against the gateway `super-admin.audit-log` action.
 * Filters (usuarioId / accion / targetId / from / to) are applied via a
 * draft → applied signal pair and sent in the query string.
 */
@Component({
  selector: 'app-admin-audit-log-page',
  imports: [ButtonModule],
  templateUrl: './admin-audit-log-page.html',
  styleUrl: './admin-audit-log-page.scss',
})
export class AdminAuditLogPage implements OnInit {
  private readonly auditLogService = inject(AdminAuditLogService);

  readonly items = signal<AuditLogEntry[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Applied filters: what the request actually sends (only non-empty values).
  readonly actorUserId = signal('');
  readonly accion = signal<AuditAction | null>(null);
  readonly targetId = signal('');
  readonly from = signal('');
  readonly to = signal('');

  // Draft filters: what the user is typing/selecting before applying.
  readonly actorUserIdInput = signal('');
  readonly accionInput = signal<AuditAction | null>(null);
  readonly targetIdInput = signal('');
  readonly fromInput = signal('');
  readonly toInput = signal('');

  readonly accionOptions: AccionOption[] = [
    { value: null, label: 'Todas' },
    ...Object.values(AuditAction).map((value) => ({
      value,
      label: auditActionLabel(value),
    })),
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.actorUserId() !== '' ||
      this.accion() !== null ||
      this.targetId() !== '' ||
      this.from() !== '' ||
      this.to() !== '',
  );

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    const filters: AuditLogListFilters = { page, limit: PAGE_SIZE };
    const actorUserId = this.actorUserId();
    if (actorUserId !== '') {
      filters.actorUserId = actorUserId;
    }
    const accion = this.accion();
    if (accion !== null) {
      filters.accion = accion;
    }
    const targetId = this.targetId();
    if (targetId !== '') {
      filters.targetId = targetId;
    }
    const from = this.from();
    if (from !== '') {
      filters.from = from;
    }
    const to = this.to();
    if (to !== '') {
      filters.to = to;
    }

    this.auditLogService.list(filters).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.pagination.set(response.pagination);
        this.currentPage.set(response.pagination.page);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.loadPage(this.currentPage());
  }

  onActorUserIdInput(event: Event): void {
    this.actorUserIdInput.set((event.target as HTMLInputElement).value);
  }

  onAccionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.accionInput.set(select.value === '' ? null : (select.value as AuditAction));
  }

  onTargetIdInput(event: Event): void {
    this.targetIdInput.set((event.target as HTMLInputElement).value);
  }

  onFromInput(event: Event): void {
    this.fromInput.set((event.target as HTMLInputElement).value);
  }

  onToInput(event: Event): void {
    this.toInput.set((event.target as HTMLInputElement).value);
  }

  applyFilters(): void {
    this.actorUserId.set(this.actorUserIdInput().trim());
    this.accion.set(this.accionInput());
    this.targetId.set(this.targetIdInput().trim());
    this.from.set(this.fromInput());
    this.to.set(this.toInput());
    this.loadPage(1);
  }

  clearFilters(): void {
    this.actorUserId.set('');
    this.actorUserIdInput.set('');
    this.accion.set(null);
    this.accionInput.set(null);
    this.targetId.set('');
    this.targetIdInput.set('');
    this.from.set('');
    this.fromInput.set('');
    this.to.set('');
    this.toInput.set('');
    this.loadPage(1);
  }

  previousPage(): void {
    const page = this.currentPage();
    if (page > 1) {
      this.loadPage(page - 1);
    }
  }

  nextPage(): void {
    const pagination = this.pagination();
    if (pagination !== null && this.currentPage() < pagination.totalPages) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  accionLabel(accion: AuditAction): string {
    return auditActionLabel(accion);
  }

  formatCreatedAt(createdAt: string): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toISOString().slice(0, 10);
  }
}
