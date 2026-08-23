import type { ProductResponse } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { formatProductPrice } from '../utils/format-product-price';

interface ProductCardProps {
  product: ProductResponse;
  isMutating?: boolean;
  onEdit?: (product: ProductResponse) => void;
  onToggleActive?: (product: ProductResponse) => void;
  onDelete?: (productId: string) => void;
  onAddToCart?: (product: ProductResponse) => void;
  canAddToCart?: boolean;
  isAddingToCart?: boolean;
}

function productStatusClassName(isActive: boolean): string {
  return isActive
    ? 'bg-surface-muted text-success'
    : 'bg-surface-hover text-text-secondary';
}

export default function ProductCard({
  product,
  isMutating = false,
  onEdit,
  onToggleActive,
  onDelete,
  onAddToCart,
  canAddToCart = true,
  isAddingToCart = false,
}: ProductCardProps) {
  return (
    <Card>
      <Card.Body className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-text-primary">{product.nombre}</h2>
            <p className="text-sm text-text-muted">
              {product.categoria ?? 'Sin categoría'} · {product.marca ?? 'Sin marca'}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${productStatusClassName(product.activo)}`}>
            {product.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {product.descripcion && (
          <p className="line-clamp-2 text-sm text-text-secondary">
            {product.descripcion}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-text-muted">Stock</p>
            <p className="font-medium text-text-primary">{product.stock}</p>
          </div>
          <div>
            <p className="text-text-muted">Precio</p>
            <p className="font-medium text-text-primary">
              {product.mostrarPrecio === false ? 'Oculto' : formatProductPrice(product.precioFinal)}
            </p>
          </div>
        </div>

        <div className="border-t border-surface-hover pt-3 text-xs text-text-muted">
          Sin IVA: {formatProductPrice(product.precioSinIva)} · IVA {product.porcentajeIva}%
        </div>

        {(onEdit || onToggleActive || onDelete || onAddToCart) && (
          <div className="flex flex-wrap gap-2 border-t border-surface-hover pt-3">
            {onAddToCart && (
              <Button
                type="button"
                size="sm"
                disabled={isMutating || isAddingToCart || !canAddToCart}
                onClick={() => onAddToCart(product)}
              >
                {isAddingToCart ? 'Agregando' : 'Agregar al carrito'}
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onEdit(product)}
              >
                Editar
              </Button>
            )}
            {onToggleActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onToggleActive(product)}
              >
                {product.activo ? 'Desactivar' : 'Activar'}
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isMutating}
                onClick={() => onDelete(product.id)}
              >
                Eliminar
              </Button>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
