import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import AdminVendorTable from '../components/AdminVendorTable';
import { usePendingAdminVendors } from '../hooks/useAdminVendors';

export default function AdminPendingVendorsPage() {
  const { vendors, pagination, isLoading, isError, errorMessage, refetch } = usePendingAdminVendors();

  if (isLoading) return <PageSkeleton />;

  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Vendedores pendientes</h1>
        <p className="text-sm text-text-secondary">
          {pagination ? `${pagination.total} pendientes · página ${pagination.page} de ${pagination.totalPages}` : 'Aprobaciones pendientes'}
        </p>
      </div>

      {vendors.length === 0 ? (
        <EmptyState message="No hay vendedores pendientes para aprobar" />
      ) : (
        <AdminVendorTable vendors={vendors} />
      )}
    </div>
  );
}
