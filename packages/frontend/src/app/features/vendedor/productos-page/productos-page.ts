import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { PaginationResponse, ProductResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { VendedorProductosService } from '../vendedor-productos.service';

const PAGE_SIZE = 10;

const PRODUCTOS_BASE_PATH = '/vendedor/catalogo/productos';

/**
 * Vendedor product catalog list for the gateway `products.list` action.
 * Shows the authenticated vendedor's own products (active and inactive),
 * paginated, with per-row edit and soft-deactivate actions.
 */
@Component({
  selector: 'app-productos-page',
  imports: [ButtonModule, ConfirmDialogComponent],
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.scss',
})
export class VendedorProductosPage implements OnInit {
  private readonly productosService = inject(VendedorProductosService);
  private readonly router = inject(Router);

  readonly items = signal<ProductResponse[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly dialogOpen = signal(false);
  readonly dialogProduct = signal<ProductResponse | null>(null);
  readonly mutating = signal(false);
  readonly mutationError = signal<string | null>(null);

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly consequenceText = computed(() => {
    const product = this.dialogProduct();
    return product === null
      ? ''
      : `Se desactivará ${product.nombre}. Dejará de mostrarse a tus clientes.`;
  });

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    this.productosService.list(page, PAGE_SIZE).subscribe({
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

  nuevoProducto(): void {
    void this.router.navigate([`${PRODUCTOS_BASE_PATH}/nuevo`]);
  }

  editar(product: ProductResponse): void {
    void this.router.navigate([PRODUCTOS_BASE_PATH, product.id, 'editar']);
  }

  desactivar(product: ProductResponse): void {
    this.dialogProduct.set(product);
    this.mutationError.set(null);
    this.dialogOpen.set(true);
  }

  confirmarDesactivacion(): void {
    const product = this.dialogProduct();
    if (product === null || this.mutating()) {
      return;
    }

    this.mutating.set(true);
    this.mutationError.set(null);

    this.productosService.delete(product.id).subscribe({
      next: () => {
        this.updateItemActivo(product.id);
        this.mutating.set(false);
        this.closeDialog();
      },
      error: () => {
        this.mutating.set(false);
        this.mutationError.set(
          'No pudimos desactivar el producto. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  cancelarDesactivacion(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogOpen.set(false);
    this.dialogProduct.set(null);
    this.mutationError.set(null);
  }

  private updateItemActivo(id: string): void {
    this.items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, activo: false } : item)),
    );
  }

  categoriaLabel(product: ProductResponse): string {
    return product.categoria ?? '—';
  }

  estadoLabel(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }
}
