import { useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminClientDetail } from '../hooks/useAdminClients';
import type { AdminClientDetail } from '../services/admin-clients.service';

function formatClientName(client: Pick<AdminClientDetail, 'nombre' | 'apellido'>) {
  return [client.nombre, client.apellido].filter(Boolean).join(' ') || 'Cliente sin nombre';
}

function formatProviderName(provider: NonNullable<AdminClientDetail['providers']>[number]) {
  return [provider.nombre, provider.apellido].filter(Boolean).join(' ') || provider.empresa || provider.id;
}

export default function AdminClientDetailPage() {
  const { clienteId } = useParams();
  const { client, isLoading, isError, errorMessage, refetch } = useAdminClientDetail(clienteId);

  if (!clienteId) return <EmptyState message="No hay información del cliente" />;

  if (isLoading) return <PageSkeleton />;

  if (isError && !client) return <ErrorState message={errorMessage} onRetry={refetch} />;

  if (!client) return <EmptyState message="No hay información del cliente" />;

  const providers = client.providers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{formatClientName(client)}</h1>
        <p className="text-sm text-text-secondary">Detalle administrativo read-only del cliente.</p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Perfil</h2>
        </Card.Header>
        <Card.Body className="space-y-3">
          {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
          {client.telefono && <p><span className="font-medium">Teléfono:</span> {client.telefono}</p>}
          {client.dni && <p><span className="font-medium">DNI:</span> {client.dni}</p>}
          {client.tipoFactura && <p><span className="font-medium">Tipo de factura:</span> {client.tipoFactura}</p>}
          {client.direccionFacturacion && <p><span className="font-medium">Facturación:</span> {client.direccionFacturacion}</p>}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Proveedores</h2>
        </Card.Header>
        <Card.Body className="space-y-3">
          {providers.length === 0 ? (
            <EmptyState message="No hay proveedores asociados" />
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="rounded-md border border-gray-100 p-3">
                <p className="font-medium text-text-primary">{formatProviderName(provider)}</p>
                {provider.empresa && <p className="text-sm text-text-secondary">{provider.empresa}</p>}
                {provider.isDefault && (
                  <span className="mt-2 inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary">
                    Proveedor principal
                  </span>
                )}
              </div>
            ))
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
