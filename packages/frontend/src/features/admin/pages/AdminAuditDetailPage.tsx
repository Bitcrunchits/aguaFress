import { useParams } from 'react-router-dom';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { Card } from '../../../shared/components/Card';
import { useAdminAuditDetail } from '../hooks/useAdminAudit';

export default function AdminAuditDetailPage() {
  const { auditId = '' } = useParams();
  const { entry, isLoading, isError, errorMessage, refetch } = useAdminAuditDetail(auditId);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;
  if (!entry) return <ErrorState message="No hay información del evento de auditoría" onRetry={refetch} />;

  const target = entry.entity.id ? `${entry.entity.type ?? 'entidad'} · ${entry.entity.id}` : entry.entity.type ?? 'Sin entidad';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Detalle de auditoría</h1>
        <p className="text-sm text-text-secondary">{entry.summary}</p>
      </div>

      <Card>
        <Card.Body className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Actor</p>
            <p className="text-text-primary">{entry.actor.email ?? 'Actor no disponible'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Acción</p>
            <p className="text-text-primary">{entry.action}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Destino</p>
            <p className="text-text-primary">{target}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Fecha</p>
            <p className="text-text-primary">{entry.createdAt}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Resultado</p>
            <p className="text-text-primary">{entry.result}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-muted">Request ID</p>
            <p className="text-text-primary">{entry.requestId ?? 'No informado'}</p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
