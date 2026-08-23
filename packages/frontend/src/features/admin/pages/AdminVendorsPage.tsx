import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { Button } from '../../../shared/components/Button';
import AdminVendorTable from '../components/AdminVendorTable';
import { useAdminVendors } from '../hooks/useAdminVendors';

export default function AdminVendorsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { vendors, pagination, isLoading, isError, errorMessage, refetch } = useAdminVendors({
    page: 1,
    limit: 20,
    search: search || undefined,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  if (isLoading) return <PageSkeleton />;

  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vendedores</h1>
          <p className="text-sm text-text-secondary">Listado administrativo servido por el API Gateway.</p>
        </div>
        <div className="flex items-center gap-3">
          {pagination && (
            <p className="text-sm text-text-muted">
              {pagination.total} vendedores · página {pagination.page} de {pagination.totalPages}
            </p>
          )}
          <Link to="/admin/vendors/new">
            <Button asChild>Nuevo vendedor</Button>
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <label className="flex-1">
          <span className="sr-only">Buscar vendedores</span>
          <input
            aria-label="Buscar vendedores"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Buscar por nombre o email"
          />
        </label>
        <Button type="submit">Buscar</Button>
      </form>

      {vendors.length === 0 ? <EmptyState message="No hay vendedores para mostrar" /> : <AdminVendorTable vendors={vendors} />}
    </div>
  );
}
