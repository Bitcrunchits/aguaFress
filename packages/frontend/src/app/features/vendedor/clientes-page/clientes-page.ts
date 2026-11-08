import { Component, OnInit, computed, inject, signal } from '@angular/core';
import type { PaginationResponse, VendedorClienteItem } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { VendedorClientesService } from '../vendedor-clientes.service';
import type { VendedorClientesFilters } from '../vendedor-clientes.service';

const PAGE_SIZE = 10;

/**
 * Vendedor's own client cartera, read-only. Mirrors the admin
 * vendedores-list-page: signals-driven state, applied vs draft search, and a
 * plain table with pagination. No mutation is offered in this phase.
 */
@Component({
  selector: 'app-vendedor-clientes-page',
  imports: [ButtonModule],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.scss',
})
export class VendedorClientesPage implements OnInit {
  private readonly clientesService = inject(VendedorClientesService);

  readonly items = signal<VendedorClienteItem[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Draft filter: what the user is typing before hitting "Aplicar filtros".
  readonly searchInput = signal('');
  // Applied filter: what the list request actually sends.
  readonly search = signal('');

  readonly hasActiveFilters = computed(() => this.search() !== '');

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    // Track the requested page before the response arrives, so retry()
    // after a failure re-requests the page that failed.
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    const filters: VendedorClientesFilters = { page, limit: PAGE_SIZE };
    const search = this.search();
    if (search !== '') {
      filters.search = search;
    }

    this.clientesService.listCartera(filters).subscribe({
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

  applyFilters(): void {
    this.search.set(this.searchInput().trim());
    this.loadPage(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.searchInput.set('');
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

  nombreCompleto(cliente: VendedorClienteItem): string {
    return cliente.apellido ? `${cliente.nombre} ${cliente.apellido}` : cliente.nombre;
  }

  telefonoLabel(telefono: string | undefined): string {
    return telefono === undefined || telefono === '' ? '—' : telefono;
  }
}
