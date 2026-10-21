import { Component, OnInit, inject, signal } from '@angular/core';
import { VendedorEstado } from '@agua/contracts';
import type {
  PaginationResponse,
  SuperAdminVendedorItem,
  SuperAdminVendedorListFilters,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { AdminVendedoresService } from '../admin-vendedores.service';

const PAGE_SIZE = 10;

const ESTADO_LABELS: Record<VendedorEstado, string> = {
  [VendedorEstado.PENDIENTE]: 'Pendiente',
  [VendedorEstado.ACTIVO]: 'Activo',
  [VendedorEstado.INACTIVO]: 'Inactivo',
  [VendedorEstado.BLOQUEADO]: 'Bloqueado',
};

/**
 * Admin vendedores list for the gateway `vendedores.list` action. Cells
 * whose optional contract fields are absent at runtime (`clientesCount`,
 * `fechaRegistro` — e.g. a gateway still running the pre-contract mapping)
 * degrade to an em dash instead of rendering blank or invalid values.
 */
@Component({
  selector: 'app-vendedores-list-page',
  imports: [ButtonModule],
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
