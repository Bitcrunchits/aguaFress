import { useState, type FormEvent } from 'react';
import type {
  CategoriaResponse,
  CreateProductRequest,
  MarcaResponse,
  ProductResponse,
  UpdateProductRequest,
} from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';

interface ProductFormProps {
  mode: 'create' | 'edit';
  categories: CategoriaResponse[];
  brands: MarcaResponse[];
  product?: ProductResponse;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onCreate?: (request: CreateProductRequest) => Promise<ProductResponse>;
  onUpdate?: (request: UpdateProductRequest) => Promise<ProductResponse>;
}

interface ProductFormState {
  nombre: string;
  descripcion: string;
  precioSinIva: string;
  porcentajeIva: string;
  porcentajeImpuestos: string;
  stock: string;
  categoriaId: string;
  marcaId: string;
  imagen: string;
  mostrarPrecio: boolean;
}

function initialState(product?: ProductResponse): ProductFormState {
  return {
    nombre: product?.nombre ?? '',
    descripcion: product?.descripcion ?? '',
    precioSinIva: product ? String(product.precioSinIva) : '',
    porcentajeIva: product ? String(product.porcentajeIva) : '21',
    porcentajeImpuestos: product ? String(product.porcentajeImpuestos) : '0',
    stock: product ? String(product.stock) : '0',
    categoriaId: '',
    marcaId: '',
    imagen: product?.imagen ?? '',
    mostrarPrecio: product?.mostrarPrecio ?? true,
  };
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

function optionalString(value: string): string | undefined {
  const trimmedValue = value.trim();
  return trimmedValue === '' ? undefined : trimmedValue;
}

export default function ProductForm({
  mode,
  categories,
  brands,
  product,
  isSubmitting = false,
  onCancel,
  onCreate,
  onUpdate,
}: ProductFormProps) {
  const [formState, setFormState] = useState<ProductFormState>(() => initialState(product));
  const [formError, setFormError] = useState<string | null>(null);

  const submitLabel = mode === 'create' ? 'Crear producto' : 'Guardar cambios';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nombre = formState.nombre.trim();
    const precioSinIva = Number(formState.precioSinIva);
    const stock = Number(formState.stock);

    if (nombre.length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (!Number.isFinite(precioSinIva) || precioSinIva <= 0) {
      setFormError('El precio sin IVA debe ser mayor a 0.');
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setFormError('El stock no puede ser negativo.');
      return;
    }

    if (mode === 'create' && formState.categoriaId === '') {
      setFormError('Seleccioná una categoría para crear el producto.');
      return;
    }

    const request = {
      nombre,
      descripcion: optionalString(formState.descripcion),
      precioSinIva,
      porcentajeIva: optionalNumber(formState.porcentajeIva),
      porcentajeImpuestos: optionalNumber(formState.porcentajeImpuestos),
      stock,
      imagen: optionalString(formState.imagen),
      mostrarPrecio: formState.mostrarPrecio,
      categoriaId: formState.categoriaId || undefined,
      marcaId: formState.marcaId || undefined,
    };

    try {
      if (mode === 'create' && onCreate) {
        await onCreate({ ...request, categoriaId: formState.categoriaId });
        setFormState(initialState());
        return;
      }

      if (mode === 'edit' && onUpdate) {
        await onUpdate(request);
        onCancel?.();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el producto.');
    }
  };

  return (
    <Card>
      <Card.Body>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {mode === 'create' ? 'Nuevo producto' : `Editar ${product?.nombre ?? 'producto'}`}
            </h2>
            <p className="text-sm text-text-secondary">
              El precio final se calcula en el backend; no se envía identidad del vendedor en el body.
            </p>
          </div>

          {formError && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
              {formError}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Nombre
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                value={formState.nombre}
                onChange={(event) => setFormState({ ...formState, nombre: event.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Categoría
              <select
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                value={formState.categoriaId}
                onChange={(event) => setFormState({ ...formState, categoriaId: event.target.value })}
              >
                <option value="">{mode === 'create' ? 'Seleccionar categoría' : 'Mantener categoría actual'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Precio sin IVA
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                min="0"
                step="0.01"
                type="number"
                value={formState.precioSinIva}
                onChange={(event) => setFormState({ ...formState, precioSinIva: event.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Stock
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                min="0"
                step="1"
                type="number"
                value={formState.stock}
                onChange={(event) => setFormState({ ...formState, stock: event.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              IVA (%)
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                min="0"
                step="0.01"
                type="number"
                value={formState.porcentajeIva}
                onChange={(event) => setFormState({ ...formState, porcentajeIva: event.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Impuestos (%)
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                min="0"
                step="0.01"
                type="number"
                value={formState.porcentajeImpuestos}
                onChange={(event) => setFormState({ ...formState, porcentajeImpuestos: event.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Marca
              <select
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                value={formState.marcaId}
                onChange={(event) => setFormState({ ...formState, marcaId: event.target.value })}
              >
                <option value="">{mode === 'create' ? 'Sin marca' : 'Mantener marca actual'}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-text-secondary">
              Imagen URL
              <input
                className="w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                value={formState.imagen}
                onChange={(event) => setFormState({ ...formState, imagen: event.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <input
              checked={formState.mostrarPrecio}
              className="h-4 w-4 rounded border-surface-hover text-brand-teal focus:ring-brand-teal"
              type="checkbox"
              onChange={(event) => setFormState({ ...formState, mostrarPrecio: event.target.checked })}
            />
            Mostrar precio al cliente
          </label>

          <label className="space-y-1 text-sm font-medium text-text-secondary">
            Descripción
            <textarea
              className="min-h-24 w-full rounded-md border border-surface-hover bg-surface px-3 py-2 text-text-primary focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
              value={formState.descripcion}
              onChange={(event) => setFormState({ ...formState, descripcion: event.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Guardando...' : submitLabel}
            </Button>
            {onCancel && (
              <Button disabled={isSubmitting} type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}
