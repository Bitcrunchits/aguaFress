import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type {
  CategoriaResponse,
  CreateProductRequest,
  PaginationResponse,
  ProductResponse,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import type { Observable, Subscription } from 'rxjs';
import { VendedorProductoForm } from '../vendedor-producto-form/vendedor-producto-form';
import { VendedorProductosFailure, classifyProductosError } from '../vendedor-productos-error';
import { VendedorProductosService } from '../vendedor-productos.service';

const PAGE_SIZE = 10;

const LIST_ERROR_MESSAGES: Record<VendedorProductosFailure, string> = {
  [VendedorProductosFailure.Validation]: 'No pudimos cargar tus productos. Inténtalo de nuevo.',
  [VendedorProductosFailure.Forbidden]: 'Tu cuenta no tiene permiso para ver el catálogo.',
  [VendedorProductosFailure.NotFound]: 'No encontramos tu perfil de vendedor.',
  [VendedorProductosFailure.Network]: 'No pudimos conectar con el servidor. Revisa tu conexión.',
  [VendedorProductosFailure.Unexpected]:
    'No pudimos cargar tus productos. Inténtalo de nuevo en unos segundos.',
};

const SAVE_ERROR_MESSAGES: Record<VendedorProductosFailure, string> = {
  [VendedorProductosFailure.Validation]: 'Revisa los datos del producto e inténtalo de nuevo.',
  [VendedorProductosFailure.Forbidden]:
    'Tu cuenta todavía no puede modificar productos. Verifica que esté activa.',
  [VendedorProductosFailure.NotFound]: 'El producto o la categoría ya no existen.',
  [VendedorProductosFailure.Network]: 'No pudimos conectar con el servidor. Reintenta.',
  [VendedorProductosFailure.Unexpected]: 'No pudimos guardar el producto. Inténtalo de nuevo.',
};

const DEACTIVATE_ERROR_MESSAGES: Record<VendedorProductosFailure, string> = {
  ...SAVE_ERROR_MESSAGES,
  [VendedorProductosFailure.Unexpected]: 'No pudimos desactivar el producto. Inténtalo de nuevo.',
};

type FormMode = 'closed' | 'create' | 'edit';

/**
 * Vendedor own-products CRUD for `/vendedor/catalogo/productos`.
 *
 * The list is the source of truth after every mutation: create, update and
 * deactivate reload the current page instead of patching rows locally, so
 * server-side derived fields (precioFinal, activo) always stay consistent.
 */
@Component({
  selector: 'app-vendedor-productos-page',
  imports: [ButtonModule, RouterLink, VendedorProductoForm],
  templateUrl: './vendedor-productos-page.html',
  styleUrl: './vendedor-productos-page.scss',
})
export class VendedorProductosPage implements OnInit {
  private readonly productosService = inject(VendedorProductosService);
  private readonly destroyRef = inject(DestroyRef);
  private listSubscription: Subscription | null = null;
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  });

  readonly items = signal<ProductResponse[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly listError = signal<string | null>(null);

  readonly categorias = signal<CategoriaResponse[]>([]);

  readonly formMode = signal<FormMode>('closed');
  readonly editingProducto = signal<ProductResponse | null>(null);
  readonly loadingProducto = signal(false);
  readonly submitting = signal(false);
  readonly formFeedback = signal<string | null>(null);

  readonly confirmTarget = signal<ProductResponse | null>(null);
  readonly deactivating = signal(false);
  readonly deactivateFeedback = signal<string | null>(null);

  readonly successMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPage(1);
    this.loadCategorias();
  }

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.loading.set(true);
    this.listError.set(null);

    this.listSubscription?.unsubscribe();
    this.listSubscription = this.productosService
      .list(page, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.pagination.set(response.pagination);
          this.currentPage.set(response.pagination.page);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.listError.set(LIST_ERROR_MESSAGES[classifyProductosError(error)]);
          this.loading.set(false);
        },
      });
  }

  retry(): void {
    this.loadPage(this.currentPage());
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.loadPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    const pagination = this.pagination();
    if (pagination !== null && this.currentPage() < pagination.totalPages) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  openCreate(): void {
    this.clearMessages();
    this.confirmTarget.set(null);
    this.editingProducto.set(null);
    this.formFeedback.set(null);
    this.formMode.set('create');
  }

  /** Reads the product fresh with `products.get` before opening the editor. */
  openEdit(producto: ProductResponse): void {
    if (this.loadingProducto()) {
      return;
    }
    this.clearMessages();
    this.confirmTarget.set(null);
    this.loadingProducto.set(true);

    this.productosService
      .get(producto.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => {
          this.editingProducto.set(fresh);
          this.formFeedback.set(null);
          this.formMode.set('edit');
          this.loadingProducto.set(false);
        },
        error: (error: unknown) => {
          this.actionError.set(SAVE_ERROR_MESSAGES[classifyProductosError(error)]);
          this.loadingProducto.set(false);
        },
      });
  }

  closeForm(): void {
    if (this.submitting()) {
      return;
    }
    this.formMode.set('closed');
    this.editingProducto.set(null);
    this.formFeedback.set(null);
  }

  save(request: CreateProductRequest): void {
    if (this.submitting()) {
      return;
    }
    const editing = this.editingProducto();
    const isEdit = this.formMode() === 'edit' && editing !== null;
    const operation: Observable<ProductResponse> = isEdit
      ? this.productosService.update(editing.id, request)
      : this.productosService.create(request);

    this.submitting.set(true);
    this.formFeedback.set(null);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.formMode.set('closed');
        this.editingProducto.set(null);
        this.successMessage.set(
          isEdit ? `Guardamos los cambios de "${saved.nombre}".` : `Creamos "${saved.nombre}".`,
        );
        // New products are listed newest first, so a create returns to page 1.
        this.loadPage(isEdit ? this.currentPage() : 1);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formFeedback.set(SAVE_ERROR_MESSAGES[classifyProductosError(error)]);
      },
    });
  }

  askDeactivate(producto: ProductResponse): void {
    this.clearMessages();
    this.deactivateFeedback.set(null);
    this.confirmTarget.set(producto);
  }

  cancelDeactivate(): void {
    if (this.deactivating()) {
      return;
    }
    this.confirmTarget.set(null);
    this.deactivateFeedback.set(null);
  }

  confirmDeactivate(): void {
    const target = this.confirmTarget();
    if (target === null || this.deactivating()) {
      return;
    }
    this.deactivating.set(true);
    this.deactivateFeedback.set(null);

    this.productosService
      .deactivate(target.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deactivating.set(false);
          this.confirmTarget.set(null);
          this.successMessage.set(`Desactivamos "${target.nombre}".`);
          this.loadPage(this.currentPage());
        },
        error: (error: unknown) => {
          this.deactivating.set(false);
          this.deactivateFeedback.set(DEACTIVATE_ERROR_MESSAGES[classifyProductosError(error)]);
        },
      });
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }

  private loadCategorias(): void {
    this.productosService
      .listCategorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categorias) => this.categorias.set(categorias),
        // The list stays usable; the form shows that no categories are available.
        error: () => this.categorias.set([]),
      });
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.actionError.set(null);
  }
}
