import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { PaginationResponse, ProductResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { VendedorCatalogoService } from '../vendedor-catalogo.service';
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
  private readonly catalogoService = inject(VendedorCatalogoService);
  private readonly productosService = inject(VendedorProductosService);
  private readonly router = inject(Router);

  private loadSequence = 0;

  readonly items = signal<ProductResponse[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly dialogOpen = signal(false);
  readonly dialogProduct = signal<ProductResponse | null>(null);
  readonly mutating = signal(false);
  readonly mutationError = signal<string | null>(null);

  readonly categoriaFormOpen = signal(false);
  readonly categoriaNombre = signal('');
  readonly creatingCategoria = signal(false);
  readonly categoriaCreateError = signal<string | null>(null);
  readonly categoriaCreatedMessage = signal<string | null>(null);

  readonly marcaFormOpen = signal(false);
  readonly marcaNombre = signal('');
  readonly creatingMarca = signal(false);
  readonly marcaCreateError = signal<string | null>(null);
  readonly marcaCreatedMessage = signal<string | null>(null);

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
    const sequence = ++this.loadSequence;
    this.currentPage.set(page);
    this.loading.set(true);
    this.failed.set(false);

    this.productosService.list(page, PAGE_SIZE).subscribe({
      next: (response) => {
        if (sequence !== this.loadSequence) {
          return;
        }
        this.items.set(response.data);
        this.pagination.set(response.pagination);
        this.currentPage.set(response.pagination.page);
        this.loading.set(false);
      },
      error: () => {
        if (sequence !== this.loadSequence) {
          return;
        }
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

  abrirCategoriaForm(): void {
    this.categoriaNombre.set('');
    this.categoriaCreateError.set(null);
    this.categoriaCreatedMessage.set(null);
    this.categoriaFormOpen.set(true);
  }

  cancelarCategoria(): void {
    this.categoriaFormOpen.set(false);
    this.categoriaNombre.set('');
    this.categoriaCreateError.set(null);
  }

  onCategoriaNombreInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.categoriaNombre.set(target.value);
  }

  crearCategoria(): void {
    if (this.creatingCategoria()) {
      return;
    }

    const nombre = this.categoriaNombre().trim();
    if (nombre.length < 2 || nombre.length > 255) {
      this.categoriaCreateError.set('Ingresa un nombre de entre 2 y 255 caracteres.');
      return;
    }

    this.creatingCategoria.set(true);
    this.categoriaCreateError.set(null);

    this.catalogoService.createCategoria({ nombre }).subscribe({
      next: () => {
        this.creatingCategoria.set(false);
        this.categoriaFormOpen.set(false);
        this.categoriaNombre.set('');
        this.categoriaCreatedMessage.set('Categoría creada');
      },
      error: () => {
        this.creatingCategoria.set(false);
        this.categoriaCreateError.set(
          'No pudimos crear la categoría. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  abrirMarcaForm(): void {
    this.marcaNombre.set('');
    this.marcaCreateError.set(null);
    this.marcaCreatedMessage.set(null);
    this.marcaFormOpen.set(true);
  }

  cancelarMarca(): void {
    this.marcaFormOpen.set(false);
    this.marcaNombre.set('');
    this.marcaCreateError.set(null);
  }

  onMarcaNombreInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.marcaNombre.set(target.value);
  }

  crearMarca(): void {
    if (this.creatingMarca()) {
      return;
    }

    const nombre = this.marcaNombre().trim();
    if (nombre.length < 2 || nombre.length > 255) {
      this.marcaCreateError.set('Ingresa un nombre de entre 2 y 255 caracteres.');
      return;
    }

    this.creatingMarca.set(true);
    this.marcaCreateError.set(null);

    this.catalogoService.createMarca({ nombre }).subscribe({
      next: () => {
        this.creatingMarca.set(false);
        this.marcaFormOpen.set(false);
        this.marcaNombre.set('');
        this.marcaCreatedMessage.set('Marca creada');
      },
      error: () => {
        this.creatingMarca.set(false);
        this.marcaCreateError.set(
          'No pudimos crear la marca. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
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
