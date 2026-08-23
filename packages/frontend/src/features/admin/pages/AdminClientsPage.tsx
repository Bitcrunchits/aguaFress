import { FormEvent, useState } from 'react';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { Button } from '../../../shared/components/Button';
import AdminClientTable from '../components/AdminClientTable';
import { useAdminClients } from '../hooks/useAdminClients';

export default function AdminClientsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { clients, pagination, isLoading, isError, errorMessage, refetch } = useAdminClients({
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
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-secondary">Listado administrativo servido por el API Gateway.</p>
        </div>
        {pagination && (
          <p className="text-sm text-text-muted">
            {pagination.total} clientes · página {pagination.page} de {pagination.totalPages}
          </p>
        )}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <label className="flex-1">
          <span className="sr-only">Buscar clientes</span>
          <input
            aria-label="Buscar clientes"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Buscar por nombre o email"
          />
        </label>
        <Button type="submit">Buscar</Button>
      </form>

      {clients.length === 0 ? <EmptyState message="No hay clientes para mostrar" /> : <AdminClientTable clients={clients} />}
    </div>
  );
}
