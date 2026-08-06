import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useClientes } from '../hooks/useClientes';

export default function ClientesPage() {
  const { clientes, pagination, isLoading, isError, errorMessage, refetch } = useClientes();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (clientes.length === 0) {
    return <EmptyState message="No hay clientes para mostrar" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-secondary">Cartera real servida por el API Gateway.</p>
        </div>
        {pagination && (
          <p className="text-sm text-text-muted">
            {pagination.total} clientes · página {pagination.page} de {pagination.totalPages}
          </p>
        )}
      </div>

      <Card>
        <Card.Body className="divide-y divide-gray-100">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text-primary">{cliente.nombre} {cliente.apellido ?? ''}</p>
                <p className="text-sm text-text-secondary">{cliente.telefono ?? 'Sin teléfono registrado'}</p>
              </div>
              {'email' in cliente && cliente.email ? (
                <span className="text-sm text-text-muted">{cliente.email}</span>
              ) : null}
            </div>
          ))}
        </Card.Body>
      </Card>
    </div>
  );
}
