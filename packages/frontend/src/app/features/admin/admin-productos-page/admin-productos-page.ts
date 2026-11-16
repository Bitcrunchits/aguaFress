import { Component, OnInit, inject, signal } from '@angular/core';
import type {
  PaginationResponse,
  ProductResponse,
  SuperAdminVendedorItem,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import {
  StatusLabelComponent,
  type StatusLabelTone,
} from '../../../shared/status-label/status-label';
import {
  AdminProductosService,
  type AdminProductosListFilters,
} from '../admin-productos.service';
import { AdminVendedoresService } from '../admin-vendedores.service';

const PAGE_SIZE = 20;
const VENDEDORES_LIMIT = 100;

/**
 * Super-admin product catalog list. A vendor selector (populated from
 * `vendedores.list`) filters the catalog through `products.list`; the "Todos"
 * option (no `vendedorId`) lists every product on the platform.
 */
@Component({
  selector: 'app-admin-productos-page',
  imports: [ButtonModule, StatusLabelComponent],
  templateUrl: './admin-productos-page.html',
  styleUrl: './admin-productos-page.scss',
})
export class AdminProductosPage implements OnInit {
  private readonly productosService = inject(AdminProductosService);
  private readonly vendedoresService = inject(AdminVendedoresService);

  readonly vendedores = signal<SuperAdminVendedorItem[]>([]);
  readonly vendedoresLoading = signal(false);
  readonly vendedoresFailed = signal(false);

  // '' means "Todos": the products request omits vendedorId.
  readonly selectedVendedorId = signal('');

  readonly items = signal<ProductResponse[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    this.loadVendedores();
    this.loadPage(1);
  }

  loadVendedores(): void {
    this.vendedoresLoading.set(true);
    this.vendedoresFailed.set(false);

    this.vendedoresService.list({ page: 1, limit: VENDEDORES_LIMIT }).subscribe({
      next: (response) => {
        this.vendedores.set(response.data);
        this.vendedoresLoading.set(false);
      },
      error: () => {
        this.vendedoresFailed.set(true);
        this.vendedoresLoading.set(false);
      },
    });
  }

  retryVendedores(): void {
    this.loadVendedores();
  }

  onVendedorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedVendedorId.set(select.value);
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    const filters: AdminProductosListFilters = { page, limit: PAGE_SIZE };
    const vendedorId = this.selectedVendedorId();
    if (vendedorId !== '') {
      filters.vendedorId = vendedorId;
    }

    this.productosService.list(filters).subscribe({
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

  vendedorLabel(vendedor: SuperAdminVendedorItem): string {
    const nombre = vendedor.apellido
      ? `${vendedor.nombre} ${vendedor.apellido}`
      : vendedor.nombre;
    return vendedor.empresa ? `${vendedor.empresa} · ${nombre}` : nombre;
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }

  activoLabel(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  activoTone(activo: boolean): StatusLabelTone {
    return activo ? 'positive' : 'negative';
  }

  categoriaLabel(product: ProductResponse): string {
    return product.categoria ?? '—';
  }

  marcaLabel(product: ProductResponse): string {
    return product.marca ?? '—';
  }
}
