import { Component, OnInit, computed, inject, signal } from '@angular/core';
import type {
  PaginationResponse,
  SuperAdminClienteItemV2,
  SuperAdminClienteListFilters,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { AdminClientesService } from '../admin-clientes.service';

const PAGE_SIZE = 20;

/**
 * Super-admin clientes list against the gateway `clientes.list` action. The
 * response is the raw CLIENTE row shape: there is no `email` (it lives on
 * AUTH_USER) and no `fechaAsignacion`, so those columns degrade to an em dash
 * without fabricating data.
 */
@Component({
  selector: 'app-admin-clientes-page',
  imports: [ButtonModule],
  templateUrl: './admin-clientes-page.html',
  styleUrl: './admin-clientes-page.scss',
})
export class AdminClientesPage implements OnInit {
  private readonly clientesService = inject(AdminClientesService);

  readonly items = signal<SuperAdminClienteItemV2[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Applied filters: what the request actually sends (only non-empty values).
  readonly search = signal('');
  readonly vendedorId = signal('');

  // Draft filters: what the user is typing before applying.
  readonly searchInput = signal('');
  readonly vendedorIdInput = signal('');

  readonly hasActiveFilters = computed(
    () => this.search() !== '' || this.vendedorId() !== '',
  );

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    const filters: SuperAdminClienteListFilters = { page, limit: PAGE_SIZE };
    const search = this.search();
    if (search !== '') {
      filters.search = search;
    }
    const vendedorId = this.vendedorId();
    if (vendedorId !== '') {
      filters.vendedorId = vendedorId;
    }

    this.clientesService.list(filters).subscribe({
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
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  onVendedorIdInput(event: Event): void {
    this.vendedorIdInput.set((event.target as HTMLInputElement).value);
  }

  applyFilters(): void {
    this.search.set(this.searchInput().trim());
    this.vendedorId.set(this.vendedorIdInput().trim());
    this.loadPage(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.searchInput.set('');
    this.vendedorId.set('');
    this.vendedorIdInput.set('');
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

  nombreCompleto(cliente: SuperAdminClienteItemV2): string {
    return cliente.apellido ? `${cliente.nombre} ${cliente.apellido}` : cliente.nombre;
  }

  vendedorLabel(cliente: SuperAdminClienteItemV2): string {
    const vendedor = cliente.vendedor;
    const nombre = vendedor.apellido
      ? `${vendedor.nombre} ${vendedor.apellido}`
      : vendedor.nombre;
    return vendedor.empresa ? `${nombre} · ${vendedor.empresa}` : nombre;
  }

  formatFecha(createdAt: string): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toISOString().slice(0, 10);
  }
}
