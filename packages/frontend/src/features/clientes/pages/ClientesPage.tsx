import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useVendedorClientPortfolio } from '../hooks/useVendedorClients';

export default function ClientesPage() {
  const { clients, pagination, isLoading, isError, errorMessage, refetch } = useVendedorClientPortfolio();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-secondary">Cartera real servida por el API Gateway.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link to="/clientes/nuevo">
            <Button type="button">Nuevo cliente</Button>
          </Link>
          {pagination && (
            <p className="text-sm text-text-muted">
              {pagination.total} clientes · página {pagination.page} de {pagination.totalPages}
            </p>
          )}
        </div>
      </div>

      {clients.length === 0 ? <EmptyState message="No hay clientes para mostrar" /> : null}

      {clients.length > 0 ? (
        <Card>
          <Card.Body className="divide-y divide-gray-100">
            {clients.map((cliente) => {
              const clientName = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || 'Cliente sin nombre';

              return (
                <div key={cliente.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{clientName}</p>
                    <p className="text-sm text-text-secondary">{cliente.telefono ?? 'Sin teléfono registrado'}</p>
                    {'email' in cliente && cliente.email ? (
                      <span className="text-sm text-text-muted">{cliente.email}</span>
                    ) : null}
                  </div>
                  <Link to={`/clientes/${cliente.id}`} aria-label={`Ver ${clientName}`} className="text-sm font-medium text-brand-teal hover:underline">
                    Ver detalle
                  </Link>
                </div>
              );
            })}
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
