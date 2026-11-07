import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { VendedorEstado } from '@agua/contracts';
import type {
  PaginationResponse,
  SuperAdminVendedorItem,
  SuperAdminVendedorListFilters,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { AdminVendedoresService } from '../admin-vendedores.service';

const PAGE_SIZE = 10;

const ESTADO_LABELS: Record<VendedorEstado, string> = {
  [VendedorEstado.PENDIENTE]: 'Pendiente',
  [VendedorEstado.ACTIVO]: 'Activo',
  [VendedorEstado.INACTIVO]: 'Inactivo',
  [VendedorEstado.BLOQUEADO]: 'Bloqueado',
};

interface EstadoOption {
  value: VendedorEstado | null;
  label: string;
}

/**
 * Admin vendedores list for the gateway `vendedores.list` action. Cells
 * whose optional contract fields are absent at runtime (`clientesCount`,
 * `fechaRegistro` — e.g. a gateway still running the pre-contract mapping)
 * degrade to an em dash instead of rendering blank or invalid values.
 */
@Component({
  selector: 'app-vendedores-list-page',
  imports: [ButtonModule, ConfirmDialogComponent],
  templateUrl: './vendedores-list-page.html',
  styleUrl: './vendedores-list-page.scss',
})
export class VendedoresListPage implements OnInit {
  private readonly vendedoresService = inject(AdminVendedoresService);

  readonly items = signal<SuperAdminVendedorItem[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Applied filters: what the list request actually sends. Only non-empty
  // values are included in the payload (see loadPage below).
  readonly search = signal('');
  readonly estado = signal<VendedorEstado | null>(null);

  // Draft filters: what the user is typing/selecting before hitting
  // "Aplicar filtros". Committed into the applied signals by applyFilters().
  readonly searchInput = signal('');
  readonly estadoInput = signal<VendedorEstado | null>(null);

  readonly estadoOptions: EstadoOption[] = [
    { value: null, label: 'Todos' },
    { value: VendedorEstado.PENDIENTE, label: ESTADO_LABELS[VendedorEstado.PENDIENTE] },
    { value: VendedorEstado.ACTIVO, label: ESTADO_LABELS[VendedorEstado.ACTIVO] },
    { value: VendedorEstado.INACTIVO, label: ESTADO_LABELS[VendedorEstado.INACTIVO] },
    { value: VendedorEstado.BLOQUEADO, label: ESTADO_LABELS[VendedorEstado.BLOQUEADO] },
  ];

  readonly hasActiveFilters = computed(() => this.search() !== '' || this.estado() !== null);

  // Estado-change dialog state. Valid targets are the operational states
  // only; `pendiente` is never offered as a target.
  readonly changeEstadoOptions: VendedorEstado[] = [
    VendedorEstado.ACTIVO,
    VendedorEstado.INACTIVO,
    VendedorEstado.BLOQUEADO,
  ];

  readonly dialogOpen = signal(false);
  readonly dialogVendor = signal<SuperAdminVendedorItem | null>(null);
  readonly dialogEstado = signal<VendedorEstado | null>(null);
  readonly mutating = signal(false);
  readonly mutationError = signal<string | null>(null);

  readonly consequenceText = computed(() => {
    const vendor = this.dialogVendor();
    const target = this.dialogEstado();
    if (vendor === null || target === null) {
      return '';
    }
    return `Se cambiará el estado de ${this.nombreCompleto(vendor)} de ${this.estadoLabel(vendor.estado)} a ${this.estadoLabel(target)}.`;
  });

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    // Track the requested page before the response arrives, so retry()
    // after a failed transition re-requests the page that failed.
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    const filters: SuperAdminVendedorListFilters = { page, limit: PAGE_SIZE };
    const search = this.search();
    if (search !== '') {
      filters.search = search;
    }
    const estado = this.estado();
    if (estado !== null) {
      filters.estado = estado;
    }

    this.vendedoresService.list(filters).subscribe({
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

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInput.set(input.value);
  }

  onEstadoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.estadoInput.set(select.value === '' ? null : (select.value as VendedorEstado));
  }

  applyFilters(): void {
    this.search.set(this.searchInput().trim());
    this.estado.set(this.estadoInput());
    this.loadPage(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.searchInput.set('');
    this.estado.set(null);
    this.estadoInput.set(null);
    this.loadPage(1);
  }

  clearSearch(): void {
    this.search.set('');
    this.searchInput.set('');
    this.loadPage(1);
  }

  clearEstado(): void {
    this.estado.set(null);
    this.estadoInput.set(null);
    this.loadPage(1);
  }

  openCambiarEstado(vendedor: SuperAdminVendedorItem): void {
    this.dialogVendor.set(vendedor);
    this.dialogEstado.set(vendedor.estado);
    this.mutationError.set(null);
    this.dialogOpen.set(true);
  }

  onDialogEstadoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.dialogEstado.set(select.value as VendedorEstado);
  }

  confirmChangeEstado(): void {
    const vendor = this.dialogVendor();
    const target = this.dialogEstado();
    if (vendor === null || target === null || this.mutating()) {
      return;
    }

    this.mutating.set(true);
    this.mutationError.set(null);

    this.vendedoresService.changeEstado(vendor.id, { estado: target }).subscribe({
      next: (response) => {
        this.updateItemEstado(vendor.id, response.estadoNuevo);
        this.mutating.set(false);
        this.closeDialog();
      },
      error: () => {
        this.mutating.set(false);
        this.mutationError.set(
          'No pudimos cambiar el estado. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  cancelChangeEstado(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogOpen.set(false);
    this.dialogVendor.set(null);
    this.dialogEstado.set(null);
    this.mutationError.set(null);
  }

  private updateItemEstado(id: string, estado: VendedorEstado): void {
    this.items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, estado } : item)),
    );
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

  nombreCompleto(vendedor: SuperAdminVendedorItem): string {
    return vendedor.apellido ? `${vendedor.nombre} ${vendedor.apellido}` : vendedor.nombre;
  }

  estadoLabel(estado: VendedorEstado): string {
    return ESTADO_LABELS[estado];
  }

  clientesLabel(clientesCount: number | undefined): string {
    return typeof clientesCount === 'number' && Number.isFinite(clientesCount)
      ? String(clientesCount)
      : '—';
  }

  formatFechaRegistro(fechaRegistro: string | undefined): string {
    if (fechaRegistro === undefined || fechaRegistro === '') {
      return '—';
    }
    const date = new Date(fechaRegistro);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toISOString().slice(0, 10);
  }
}
