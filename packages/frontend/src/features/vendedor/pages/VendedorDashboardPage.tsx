import { Spinner } from '../../../shared/components/Spinner';
import ErrorState from '../../../shared/components/ErrorState';
import EmptyState from '../../../shared/components/EmptyState';
import { useVendedorDashboard } from '../hooks/useVendedorDashboard';
import VendedorDashboard from '../components/VendedorDashboard';

export default function VendedorDashboardPage() {
  const { clientes, vendedor, recentOrders, metrics, isLoading, isError, error, refetch } =
    useVendedorDashboard();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Error al cargar el dashboard'}
        onRetry={refetch}
      />
    );
  }

  if (!vendedor) {
    return <EmptyState message="No se encontró el perfil del vendedor" />;
  }

  return (
    <VendedorDashboard
      clientes={clientes}
      vendedor={vendedor}
      recentOrders={recentOrders}
      metrics={metrics}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
    />
  );
}
