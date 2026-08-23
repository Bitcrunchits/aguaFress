import { Link } from 'react-router-dom';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { Card } from '../../../shared/components/Card';
import { useAdminAudit } from '../hooks/useAdminAudit';

export default function AdminAuditPage() {
  const { entries, pagination, isLoading, isError, errorMessage, refetch } = useAdminAudit({ page: 1, limit: 20 });

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Auditoría</h1>
          <p className="text-sm text-text-secondary">Eventos administrativos servidos por activity logs.</p>
        </div>
        {pagination && (
          <p className="text-sm text-text-muted">
            {pagination.total} eventos · página {pagination.page} de {pagination.totalPages}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No hay eventos de auditoría para mostrar" />
      ) : (
        <Card>
          <Card.Body>
            <div className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <Link key={entry.id} to={`/admin/audit/${entry.id}`} className="block py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-text-primary">{entry.summary}</p>
                  <p className="text-sm text-text-secondary">{entry.action}</p>
                  <p className="text-xs text-text-muted">{entry.actor.email ?? 'Actor no disponible'} · {entry.createdAt}</p>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
