import { OrderEstado, UserRole } from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOrdenes } from '../hooks/useOrdenes';

export default function OrdenesPage() {
  const { user } = useAuth();
  const {
    orders,
    selectedOrder,
    job,
    isLoading,
    isLoadingDetail,
    isError,
    isDetailError,
    isMutatingOrder,
    errorMessage,
    refetch,
    refetchDetail,
    selectOrder,
    confirmOrder,
    cancelOrder,
    markInTransit,
  } = useOrdenes();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (orders.length === 0) {
    return <EmptyState message="Todavía no hay órdenes para mostrar" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Órdenes</h1>
        <p className="text-sm text-text-secondary">Historial conectado al gateway</p>
      </div>

      {user?.role === UserRole.CLIENTE && (
        <Card>
          <Card.Body>
            <p className="font-medium text-text-primary">Checkout desde carrito</p>
            <p className="text-sm text-text-secondary">
              La creación de pedidos ya está preparada en el hook con idempotencia, pero la UI queda bloqueada hasta contar con una fuente real de dirección de entrega y vendedor seleccionado. No se envían identificadores desde el formulario.
            </p>
          </Card.Body>
        </Card>
      )}

      {job && (
        <Card>
          <Card.Body>
            <p className="font-medium text-text-primary">Operación en seguimiento</p>
            <p className="text-sm text-text-secondary">Tracking: {job.trackingId} · Estado: {job.status}</p>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="divide-y divide-gray-100">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-text-primary">Pedido {order.pedidoNumero}</p>
                <p className="text-sm text-text-secondary">{order.clienteNombre ?? 'Cliente'} · {order.estado}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-text-primary">${order.total}</p>
                <Button variant="outline" size="sm" onClick={() => selectOrder(order.id)}>
                  Ver detalle
                </Button>
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      {isLoadingDetail && <PageSkeleton />}

      {isDetailError && <ErrorState message={errorMessage} onRetry={refetchDetail} />}

      {selectedOrder && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-text-primary">Detalle pedido {selectedOrder.pedidoNumero}</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <p className="text-sm text-text-secondary">Estado: <span className="font-medium text-text-primary">{selectedOrder.estado}</span></p>
              <p className="text-sm text-text-secondary">Pago: <span className="font-medium text-text-primary">{selectedOrder.metodoPago}</span></p>
              <p className="text-sm text-text-secondary">Total: <span className="font-medium text-text-primary">${selectedOrder.total}</span></p>
            </div>
            <div className="space-y-2">
              {selectedOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.nombre} x {item.cantidad}</span>
                  <span className="font-medium text-text-primary">${item.precioUnitario}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              Entrega: {selectedOrder.direccion.calle} {selectedOrder.direccion.numero}
            </p>
            <div className="flex flex-wrap gap-2">
              {user?.role === UserRole.VENDEDOR && selectedOrder.estado === OrderEstado.PENDIENTE && (
                <Button disabled={isMutatingOrder} onClick={() => confirmOrder(selectedOrder.id)}>Confirmar pedido</Button>
              )}
              {user?.role === UserRole.VENDEDOR && selectedOrder.estado === OrderEstado.CONFIRMADO && (
                <Button disabled={isMutatingOrder} onClick={() => markInTransit(selectedOrder.id)}>Marcar en camino</Button>
              )}
              {user?.role === UserRole.CLIENTE && selectedOrder.estado === OrderEstado.PENDIENTE && (
                <Button variant="outline" disabled={isMutatingOrder} onClick={() => cancelOrder(selectedOrder.id)}>Cancelar pedido</Button>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
