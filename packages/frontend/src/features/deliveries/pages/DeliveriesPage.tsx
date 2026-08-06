import { DeliveryEstado } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useDeliveries } from '../hooks/useDeliveries';

export default function DeliveriesPage() {
  const { deliveries, job, isLoading, isError, isUpdatingStatus, errorMessage, refetch, updateStatus } = useDeliveries();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (deliveries.length === 0) {
    return <EmptyState message="Todavía no hay entregas asignadas" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Entregas</h1>
        <p className="text-sm text-text-secondary">Seguimiento de reparto conectado al gateway</p>
      </div>

      {job && (
        <Card>
          <Card.Body>
            <p className="font-medium text-text-primary">Actualización en seguimiento</p>
            <p className="text-sm text-text-secondary">Tracking: {job.trackingId} · Estado: {job.status}</p>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="divide-y divide-gray-100">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-text-primary">Entrega {delivery.id}</p>
                <p className="text-sm text-text-secondary">{delivery.cliente.nombre} · {delivery.estado}</p>
                <p className="text-xs text-text-secondary">{delivery.direccion.calle} {delivery.direccion.numero}</p>
              </div>
              <div className="flex gap-2">
                {delivery.estado === DeliveryEstado.PENDIENTE && (
                  <Button
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() => updateStatus({ id: delivery.id, estado: DeliveryEstado.EN_CAMINO })}
                  >
                    En camino
                  </Button>
                )}
                {delivery.estado === DeliveryEstado.EN_CAMINO && (
                  <Button
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() => updateStatus({ id: delivery.id, estado: DeliveryEstado.ENTREGADA })}
                  >
                    Entregada
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>
    </div>
  );
}
