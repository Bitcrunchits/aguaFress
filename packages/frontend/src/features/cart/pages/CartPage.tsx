import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useCart } from '../hooks/useCart';

export default function CartPage() {
  const {
    providers,
    selectedProvider,
    isProviderSelectionRequired,
    cart,
    isLoading,
    isError,
    isMutating,
    errorMessage,
    mutationErrorMessage,
    refetch,
    updateItem,
    deleteItem,
  } = useCart();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (providers.length === 0) {
    return <EmptyState message="Seleccioná un proveedor antes de usar el carrito" />;
  }

  if (isProviderSelectionRequired) {
    return <EmptyState message="Seleccioná un proveedor antes de usar el carrito" />;
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyState message="Tu carrito está vacío" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Carrito</h1>
        <p className="text-sm text-text-secondary">Proveedor: {selectedProvider?.empresa ?? selectedProvider?.nombre}</p>
      </div>

      <Card>
        <Card.Body className="divide-y divide-gray-100">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-text-primary">{item.nombre}</p>
                <p className="text-sm text-text-secondary">{item.cantidad} × ${item.precioUnitario}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating || item.cantidad <= 1}
                  onClick={() => updateItem({
                    cartId: cart.id,
                    productoId: item.productoId,
                    cantidad: item.cantidad - 1,
                    vendedorId: cart.vendedorId,
                  })}
                >
                  -
                </Button>
                <p className="font-semibold text-text-primary">${item.subtotal}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => updateItem({
                    cartId: cart.id,
                    productoId: item.productoId,
                    cantidad: item.cantidad + 1,
                    vendedorId: cart.vendedorId,
                  })}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => deleteItem({ cartId: cart.id, productoId: item.productoId, vendedorId: cart.vendedorId })}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </Card.Body>
        <Card.Footer>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-xl font-bold text-text-primary">${cart.total}</span>
            </div>
            {mutationErrorMessage && <p className="text-sm text-error">{mutationErrorMessage}</p>}
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
