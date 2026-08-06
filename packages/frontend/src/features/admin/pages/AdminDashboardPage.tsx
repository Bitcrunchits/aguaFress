import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminOverview } from '../hooks/useAdminOverview';

export default function AdminDashboardPage() {
  const { overview, isLoading, isError, isMutatingInvitation, errorMessage, refetch, deactivateQr, deactivateLink } = useAdminOverview();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (!overview) {
    return <EmptyState message="No hay información administrativa disponible" />;
  }

  const hasActivity = overview.vendedores.data.length > 0 || overview.clientes.data.length > 0 || overview.audit.data.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel de Administración</h1>
        <p className="text-sm text-text-secondary">Datos reales del API Gateway.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <p className="text-sm text-text-secondary">Vendedores</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{overview.dashboard.totalVendedores}</p>
            <p className="text-xs text-text-muted">{overview.dashboard.vendedoresActivos} activos</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-sm text-text-secondary">Clientes</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{overview.dashboard.totalClientes}</p>
            <p className="text-xs text-text-muted">{overview.dashboard.clientesConVendedor} con vendedor</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-sm text-text-secondary">Pendientes</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{overview.dashboard.vendedoresPendientes}</p>
            <p className="text-xs text-text-muted">validaciones de vendedores</p>
          </Card.Body>
        </Card>
      </div>

      {!hasActivity && <EmptyState message="No hay vendedores, clientes ni actividad reciente" />}

      {hasActivity && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Card.Header>
              <h2 className="font-semibold text-text-primary">Vendedores recientes</h2>
            </Card.Header>
            <Card.Body className="space-y-3">
              {overview.vendedores.data.map((vendedor) => (
                <div key={vendedor.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-text-primary">{vendedor.nombre} {vendedor.apellido ?? ''}</p>
                    <p className="text-sm text-text-secondary">{vendedor.email}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary">{vendedor.estado}</span>
                </div>
              ))}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h2 className="font-semibold text-text-primary">Clientes recientes</h2>
            </Card.Header>
            <Card.Body className="space-y-3">
              {overview.clientes.data.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-text-primary">{cliente.nombre} {cliente.apellido ?? ''}</p>
                    <p className="text-sm text-text-secondary">{cliente.email}</p>
                  </div>
                  <span className="text-xs text-text-muted">{cliente.totalPedidos ?? 0} pedidos</span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>
      )}

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Auditoría reciente</h2>
        </Card.Header>
        <Card.Body>
          {overview.audit.data.length === 0 ? (
            <p className="text-text-secondary">Sin eventos de auditoría para mostrar.</p>
          ) : (
            <div className="space-y-3">
              {overview.audit.data.map((entry) => (
                <div key={entry.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-text-primary">{entry.summary}</p>
                  <p className="text-xs text-text-muted">{entry.source} · {entry.action} · {entry.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-text-primary">QR activos</h2>
          </Card.Header>
          <Card.Body>
            {overview.qrCodes.data.length === 0 ? (
              <p className="text-text-secondary">No hay QR activos para administrar.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {overview.qrCodes.data.map((qr) => (
                  <div key={qr.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-text-primary">{qr.url}</p>
                      <p className="text-xs text-text-muted">Vendedor: {qr.vendedorId ?? 'sin vendedor informado'}</p>
                    </div>
                    <Button variant="ghost" size="sm" disabled={isMutatingInvitation} onClick={() => deactivateQr(qr.id)}>
                      Desactivar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="font-semibold text-text-primary">Links activos</h2>
          </Card.Header>
          <Card.Body>
            {overview.links.data.length === 0 ? (
              <p className="text-text-secondary">No hay links activos para administrar.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {overview.links.data.map((link) => (
                  <div key={link.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-text-primary">{link.linkUrl}</p>
                      <p className="text-xs text-text-muted">Vendedor: {link.vendedorId ?? 'sin vendedor informado'}</p>
                    </div>
                    <Button variant="ghost" size="sm" disabled={isMutatingInvitation} onClick={() => deactivateLink(link.id)}>
                      Desactivar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
