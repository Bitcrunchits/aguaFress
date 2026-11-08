import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  CategoriaResponse,
  CreateProductRequest,
  MarcaResponse,
  ProductResponse,
} from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VendedorCatalogoService } from '../vendedor-catalogo.service';
import { VendedorProductosService } from '../vendedor-productos.service';

const PRODUCTOS_BASE_PATH = '/vendedor/catalogo/productos';
const IVA_DEFAULT = 21;
const IMPUESTOS_DEFAULT = 0;

/** Rejects blank required text: `Validators.required` accepts whitespace. */
function nonBlankText(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

/** Rejects numbers with more than two decimal places (currency amounts). */
function maxTwoDecimals(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 ? null : { maxDecimals: true };
}

/**
 * Vendedor product create/edit form. Edit mode is detected from the `:id`
 * route param; create mode sends `POST /products/create` and edit mode
 * `PATCH /products/update?id={id}`. The price is always computed server-side,
 * so `vendedorId`, `userId` and `precioFinal` are never sent.
 */
@Component({
  selector: 'app-producto-form-page',
  imports: [ReactiveFormsModule, ButtonModule, NgTemplateOutlet],
  templateUrl: './producto-form-page.html',
  styleUrl: './producto-form-page.scss',
})
export class VendedorProductoFormPage implements OnInit {
  private readonly catalogoService = inject(VendedorCatalogoService);
  private readonly productosService = inject(VendedorProductosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly productId = signal<string | null>(null);
  readonly isEdit = computed(() => this.productId() !== null);

  readonly categorias = signal<CategoriaResponse[]>([]);
  readonly marcas = signal<MarcaResponse[]>([]);
  readonly lookupsLoading = signal(false);
  readonly lookupsFailed = signal(false);
  readonly productLoading = signal(false);
  readonly productFailed = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly categoriaFormOpen = signal(false);
  readonly creatingCategoria = signal(false);
  readonly categoriaCreateError = signal<string | null>(null);
  readonly categoriaCreatedMessage = signal<string | null>(null);

  readonly marcaFormOpen = signal(false);
  readonly creatingMarca = signal(false);
  readonly marcaCreateError = signal<string | null>(null);
  readonly marcaCreatedMessage = signal<string | null>(null);

  readonly nuevaCategoriaNombre = this.formBuilder.nonNullable.control('', [
    nonBlankText,
    Validators.minLength(2),
    Validators.maxLength(255),
  ]);

  readonly nuevaMarcaNombre = this.formBuilder.nonNullable.control('', [
    nonBlankText,
    Validators.minLength(2),
    Validators.maxLength(255),
  ]);

  readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [nonBlankText, Validators.minLength(2), Validators.maxLength(255)]],
    descripcion: [''],
    precioSinIva: [0, [Validators.required, Validators.min(0.01), maxTwoDecimals]],
    porcentajeIva: new FormControl<number | null>(IVA_DEFAULT, [
      Validators.min(0),
      maxTwoDecimals,
    ]),
    porcentajeImpuestos: new FormControl<number | null>(IMPUESTOS_DEFAULT, [
      Validators.min(0),
      maxTwoDecimals,
    ]),
    stock: [0, [Validators.required, Validators.min(0)]],
    categoriaId: ['', [Validators.required]],
    marcaId: [''],
    mostrarPrecio: [true],
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productId.set(params.get('id'));
      this.bootstrap();
    });
  }

  private bootstrap(): void {
    this.form.reset();
    this.lookupsLoading.set(true);
    this.lookupsFailed.set(false);

    forkJoin({
      categorias: this.catalogoService.listCategorias(),
      marcas: this.catalogoService
        .listMarcas()
        .pipe(catchError(() => of<MarcaResponse[]>([]))),
    }).subscribe({
      next: ({ categorias, marcas }) => {
        this.categorias.set(categorias);
        this.marcas.set(marcas);
        this.lookupsLoading.set(false);
        this.bootstrapProduct();
      },
      error: () => {
        this.lookupsFailed.set(true);
        this.lookupsLoading.set(false);
      },
    });
  }

  private bootstrapProduct(): void {
    const id = this.productId();
    if (id === null) {
      return;
    }

    this.productLoading.set(true);
    this.productFailed.set(false);

    this.productosService.get(id).subscribe({
      next: (product) => {
        this.productLoading.set(false);
        this.prefill(product);
      },
      error: () => {
        this.productFailed.set(true);
        this.productLoading.set(false);
      },
    });
  }

  private prefill(product: ProductResponse): void {
    this.form.patchValue({
      nombre: product.nombre,
      descripcion: product.descripcion ?? '',
      precioSinIva: product.precioSinIva,
      porcentajeIva: product.porcentajeIva,
      porcentajeImpuestos: product.porcentajeImpuestos,
      stock: product.stock,
      categoriaId: this.resolveCategoriaId(product.categoria),
      marcaId: this.resolveMarcaId(product.marca),
      mostrarPrecio: product.mostrarPrecio ?? true,
    });
  }

  private resolveCategoriaId(nombre: string | undefined): string {
    if (nombre === undefined) {
      return '';
    }
    return this.categorias().find((categoria) => categoria.nombre === nombre)?.id ?? '';
  }

  private resolveMarcaId(nombre: string | undefined): string {
    if (nombre === undefined) {
      return '';
    }
    return this.marcas().find((marca) => marca.nombre === nombre)?.id ?? '';
  }

  retry(): void {
    this.lookupsFailed.set(false);
    this.productFailed.set(false);
    this.bootstrap();
  }

  abrirCategoriaForm(): void {
    this.nuevaCategoriaNombre.reset();
    this.categoriaCreateError.set(null);
    this.categoriaCreatedMessage.set(null);
    this.categoriaFormOpen.set(true);
  }

  cancelarCategoria(): void {
    this.categoriaFormOpen.set(false);
    this.nuevaCategoriaNombre.reset();
    this.categoriaCreateError.set(null);
  }

  crearCategoria(): void {
    if (this.creatingCategoria()) {
      return;
    }
    if (this.nuevaCategoriaNombre.invalid) {
      this.nuevaCategoriaNombre.markAsTouched();
      return;
    }

    const nombre = this.nuevaCategoriaNombre.value.trim();
    this.creatingCategoria.set(true);
    this.categoriaCreateError.set(null);

    this.catalogoService.createCategoria({ nombre }).subscribe({
      next: (categoria) => this.onCategoriaCreated(categoria),
      error: () => {
        this.creatingCategoria.set(false);
        this.categoriaCreateError.set(
          'No pudimos crear la categoría. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  private onCategoriaCreated(categoria: CategoriaResponse): void {
    this.categorias.update((items) => [...items, categoria]);
    this.form.get('categoriaId')?.setValue(categoria.id);
    this.creatingCategoria.set(false);
    this.categoriaCreateError.set(null);
    this.categoriaFormOpen.set(false);
    this.nuevaCategoriaNombre.reset();
    this.categoriaCreatedMessage.set('Categoría creada');
  }

  showNuevaCategoriaError(): boolean {
    const control = this.nuevaCategoriaNombre;
    return control.invalid && (control.touched || control.dirty);
  }

  abrirMarcaForm(): void {
    this.nuevaMarcaNombre.reset();
    this.marcaCreateError.set(null);
    this.marcaCreatedMessage.set(null);
    this.marcaFormOpen.set(true);
  }

  cancelarMarca(): void {
    this.marcaFormOpen.set(false);
    this.nuevaMarcaNombre.reset();
    this.marcaCreateError.set(null);
  }

  crearMarca(): void {
    if (this.creatingMarca()) {
      return;
    }
    if (this.nuevaMarcaNombre.invalid) {
      this.nuevaMarcaNombre.markAsTouched();
      return;
    }

    const nombre = this.nuevaMarcaNombre.value.trim();
    this.creatingMarca.set(true);
    this.marcaCreateError.set(null);

    this.catalogoService.createMarca({ nombre }).subscribe({
      next: (marca) => this.onMarcaCreated(marca),
      error: () => {
        this.creatingMarca.set(false);
        this.marcaCreateError.set(
          'No pudimos crear la marca. Inténtalo de nuevo en unos segundos.',
        );
      },
    });
  }

  private onMarcaCreated(marca: MarcaResponse): void {
    this.marcas.update((items) => [...items, marca]);
    this.form.get('marcaId')?.setValue(marca.id);
    this.creatingMarca.set(false);
    this.marcaCreateError.set(null);
    this.marcaFormOpen.set(false);
    this.nuevaMarcaNombre.reset();
    this.marcaCreatedMessage.set('Marca creada');
  }

  showNuevaMarcaError(): boolean {
    const control = this.nuevaMarcaNombre;
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }

    const body = this.buildBody();
    const id = this.productId();
    this.submitting.set(true);
    this.submitError.set(null);

    if (id === null) {
      this.productosService.create(body).subscribe({
        next: () => this.handleSaved(),
        error: () => this.handleSaveError(),
      });
    } else {
      this.productosService.update(id, body).subscribe({
        next: () => this.handleSaved(),
        error: () => this.handleSaveError(),
      });
    }
  }

  private handleSaved(): void {
    this.submitting.set(false);
    void this.router.navigate([PRODUCTOS_BASE_PATH]);
  }

  private handleSaveError(): void {
    this.submitting.set(false);
    this.submitError.set(
      'No pudimos guardar el producto. Inténtalo de nuevo en unos segundos.',
    );
  }

  private buildBody(): CreateProductRequest {
    const raw = this.form.getRawValue();
    const body: CreateProductRequest = {
      nombre: raw.nombre.trim(),
      precioSinIva: raw.precioSinIva,
      stock: raw.stock,
      categoriaId: raw.categoriaId,
      mostrarPrecio: raw.mostrarPrecio,
    };

    const descripcion = raw.descripcion.trim();
    if (descripcion !== '') {
      body.descripcion = descripcion;
    }
    if (raw.porcentajeIva !== null) {
      body.porcentajeIva = raw.porcentajeIva;
    }
    if (raw.porcentajeImpuestos !== null) {
      body.porcentajeImpuestos = raw.porcentajeImpuestos;
    }
    if (raw.marcaId !== '') {
      body.marcaId = raw.marcaId;
    }
    return body;
  }

  showNombreError(): boolean {
    return this.fieldInvalid('nombre');
  }

  showPrecioSinIvaError(): boolean {
    return this.fieldInvalid('precioSinIva');
  }

  showStockError(): boolean {
    return this.fieldInvalid('stock');
  }

  showCategoriaError(): boolean {
    return this.fieldInvalid('categoriaId');
  }

  private fieldInvalid(
    controlName: 'nombre' | 'precioSinIva' | 'stock' | 'categoriaId',
  ): boolean {
    const control = this.form.get(controlName);
    return control !== null && control.invalid && (control.touched || control.dirty);
  }
}
