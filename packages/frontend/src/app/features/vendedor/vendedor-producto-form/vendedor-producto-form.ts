import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import type { CategoriaResponse, CreateProductRequest, ProductResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';

const DEFAULT_IVA = 21;

type ValidatedField = 'nombre' | 'precioSinIva' | 'porcentajeIva' | 'stock' | 'categoriaId';

/** `Validators.required` accepts whitespace; the backend needs 2+ real characters. */
function nombreValido(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { required: true };
  }
  return value.trim().length < 2 ? { minlength: true } : null;
}

/** Mirrors the backend `@IsNumber({ maxDecimalPlaces: 2 })`. */
function maxDosDecimales(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'number') {
    return null;
  }
  return Math.round(value * 100) === value * 100 ? null : { decimals: true };
}

function entero(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'number' && !Number.isInteger(value) ? { integer: true } : null;
}

/**
 * Create/edit form for a vendedor product. It owns validation and emits a
 * typed `CreateProductRequest` (also a valid `UpdateProductRequest`) only
 * when the form is valid and no save is in flight. The body never includes
 * `vendedorId`, `userId` or a final price: the backend derives them.
 */
@Component({
  selector: 'app-vendedor-producto-form',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './vendedor-producto-form.html',
  styleUrl: './vendedor-producto-form.scss',
})
export class VendedorProductoForm {
  /** Product being edited, or `null` to create a new one. */
  readonly producto = input<ProductResponse | null>(null);
  readonly categorias = input<CategoriaResponse[]>([]);
  readonly submitting = input(false);
  readonly feedback = input<string | null>(null);

  readonly save = output<CreateProductRequest>();
  readonly cancelled = output<void>();

  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.group({
    nombre: this.formBuilder.nonNullable.control('', [nombreValido, Validators.maxLength(255)]),
    descripcion: this.formBuilder.nonNullable.control(''),
    precioSinIva: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      maxDosDecimales,
    ]),
    porcentajeIva: this.formBuilder.control<number | null>(DEFAULT_IVA, [
      Validators.required,
      Validators.min(0),
      maxDosDecimales,
    ]),
    stock: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      entero,
    ]),
    categoriaId: this.formBuilder.nonNullable.control('', [Validators.required]),
    mostrarPrecio: this.formBuilder.nonNullable.control(true),
  });

  constructor() {
    effect(() => {
      this.resetFrom(this.producto(), this.categorias());
    });
  }

  get editing(): boolean {
    return this.producto() !== null;
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const descripcion = value.descripcion.trim();
    const request: CreateProductRequest = {
      nombre: value.nombre.trim(),
      precioSinIva: value.precioSinIva ?? 0,
      porcentajeIva: value.porcentajeIva ?? DEFAULT_IVA,
      stock: value.stock ?? 0,
      categoriaId: value.categoriaId,
      mostrarPrecio: value.mostrarPrecio,
      ...(descripcion.length > 0 || this.editing ? { descripcion } : {}),
    };
    this.save.emit(request);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  showError(control: ValidatedField): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  private resetFrom(producto: ProductResponse | null, categorias: CategoriaResponse[]): void {
    if (producto === null) {
      this.form.reset({
        nombre: '',
        descripcion: '',
        precioSinIva: null,
        porcentajeIva: DEFAULT_IVA,
        stock: null,
        categoriaId: '',
        mostrarPrecio: true,
      });
      return;
    }

    // ProductResponse only exposes the category name, so match it against
    // the vendedor's active categories to preselect `categoriaId`.
    const categoria = categorias.find((item) => item.nombre === producto.categoria);
    this.form.reset({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precioSinIva: producto.precioSinIva,
      porcentajeIva: producto.porcentajeIva,
      stock: producto.stock,
      categoriaId: categoria?.id ?? '',
      mostrarPrecio: producto.mostrarPrecio ?? true,
    });
  }
}
